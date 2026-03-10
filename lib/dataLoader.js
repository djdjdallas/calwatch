import { supabase, isDemoMode } from './supabase'
import { DEMO_ENTITIES, DEMO_CONNECTIONS, DEMO_CONTRACTS } from './demoData'
import { getEntityRisk } from './riskScore'

const MAX_NODES = 500

/**
 * Fetch all rows from a Supabase table, paginating past the 1000-row default.
 */
async function fetchAll(table, { select = '*', filter, inColumn, inValues, limit } = {}) {
  if (inColumn && inValues && inValues.length > 0) {
    const all = []
    const pageSize = 1000
    for (let i = 0; i < inValues.length; i += 500) {
      const batch = inValues.slice(i, i + 500)
      let offset = 0
      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select(select)
          .in(inColumn, batch)
          .range(offset, offset + pageSize - 1)
        if (error || !data || data.length === 0) break
        all.push(...data)
        if (data.length < pageSize) break
        offset += pageSize
      }
    }
    return all
  }

  if (limit) {
    const { data } = await supabase.from(table).select(select).limit(limit)
    return data || []
  }

  const all = []
  let offset = 0
  const pageSize = 1000
  while (true) {
    let query = supabase.from(table).select(select).range(offset, offset + pageSize - 1)
    if (filter) query = query.eq(filter.column, filter.value)
    const { data, error } = await query
    if (error || !data || data.length === 0) break
    all.push(...data)
    if (data.length < pageSize) break
    offset += pageSize
  }
  return all
}

/**
 * Fetch aggregate stats from the DB (counts + totals) without loading all rows.
 */
export async function fetchDbStats() {
  if (isDemoMode) {
    return {
      totalContracts: '$2.4B',
      totalConnections: 1247,
      fraudTriangles: 8,
    }
  }

  const [connRes, fraudRes] = await Promise.all([
    supabase.from('connections').select('id', { count: 'exact', head: true }),
    supabase.from('connections').select('id', { count: 'exact', head: true })
      .eq('relationship_type', 'conflict_of_interest'),
  ])

  const totalConnections = connRes?.count || 0
  const fraudTriangles = fraudRes?.count || 0

  return { totalContracts: '$17.7B', totalConnections, fraudTriangles }
}

/**
 * DEFAULT VIEW: Load only conflict_of_interest connections + their 1-hop context.
 * This fetches ~44 conflict_of_interest rows, finds the entities involved,
 * then fetches ALL connections between those entities for full triangle context.
 */
export async function loadFraudTriangles() {
  if (isDemoMode) {
    return buildGraphFromData(DEMO_ENTITIES, DEMO_CONNECTIONS, DEMO_CONTRACTS)
  }

  // Step 1: Fetch conflict_of_interest connections only (~44 rows)
  const { data: coiConnections, error } = await supabase
    .from('connections')
    .select('*')
    .eq('relationship_type', 'conflict_of_interest')

  if (error || !coiConnections || coiConnections.length === 0) {
    return { nodes: [], links: [], stats: { totalAmount: 0, entityCount: 0, connectionCount: 0, highRiskCount: 0, fraudTriangleCount: 0 } }
  }

  // Step 2: Collect entity IDs from those connections
  const coiEntityIds = new Set()
  coiConnections.forEach((c) => {
    coiEntityIds.add(c.from_entity_id)
    coiEntityIds.add(c.to_entity_id)
  })

  const entityIdList = [...coiEntityIds]

  // Step 3: Fetch ALL connections between these entities (not just conflict_of_interest)
  // so we see the full triangle: donation + contract + conflict links
  const allConnections = await fetchConnectionsBetween(entityIdList)

  // Step 4: Expand to include 1-hop neighbors from these connections
  const expandedIds = new Set(coiEntityIds)
  allConnections.forEach((c) => {
    expandedIds.add(c.from_entity_id)
    expandedIds.add(c.to_entity_id)
  })

  let targetIds = [...expandedIds]

  // Apply node cap
  if (targetIds.length > MAX_NODES) {
    targetIds = capByConnectionCount(targetIds, allConnections, coiEntityIds)
  }

  // Step 5: Fetch entities and contracts
  const targetSet = new Set(targetIds)
  const filteredConnections = allConnections.filter(
    (c) => targetSet.has(c.from_entity_id) && targetSet.has(c.to_entity_id)
  )

  const [entities, contracts] = await Promise.all([
    fetchAll('entities', { inColumn: 'id', inValues: targetIds }),
    fetchAll('contracts', { inColumn: 'grantee_entity_id', inValues: targetIds }),
  ])

  const result = buildGraphFromData(entities, filteredConnections, contracts)
  result.stats.fraudTriangleCount = coiConnections.length
  // Mark which nodes are directly involved in conflict_of_interest
  result.nodes.forEach((n) => {
    n.isFraudTriangle = coiEntityIds.has(n.id)
  })
  return result
}

/**
 * FULL NETWORK: Load all connections with a 500-node cap.
 * Returns the most-connected subgraph.
 */
export async function loadFullNetwork() {
  if (isDemoMode) {
    return buildGraphFromData(DEMO_ENTITIES, DEMO_CONNECTIONS, DEMO_CONTRACTS)
  }

  const connections = await fetchAll('connections')

  // Count connections per entity
  const connCount = new Map()
  connections.forEach((c) => {
    connCount.set(c.from_entity_id, (connCount.get(c.from_entity_id) || 0) + 1)
    connCount.set(c.to_entity_id, (connCount.get(c.to_entity_id) || 0) + 1)
  })

  // Take top MAX_NODES by connection count
  const sorted = [...connCount.entries()].sort((a, b) => b[1] - a[1])
  const targetIds = sorted.slice(0, MAX_NODES).map(([id]) => id)
  const targetSet = new Set(targetIds)

  const filteredConnections = connections.filter(
    (c) => targetSet.has(c.from_entity_id) && targetSet.has(c.to_entity_id)
  )

  const [entities, contracts] = await Promise.all([
    fetchAll('entities', { inColumn: 'id', inValues: targetIds }),
    fetchAll('contracts', { inColumn: 'grantee_entity_id', inValues: targetIds }),
  ])

  const result = buildGraphFromData(entities, filteredConnections, contracts)
  result.stats.totalEntityCount = connCount.size
  result.stats.capped = connCount.size > MAX_NODES
  return result
}

/**
 * SEARCH FOCUS: Load a specific entity and its 2-hop neighborhood.
 */
export async function loadEntityNeighborhood(entityId) {
  if (isDemoMode || !entityId) return null

  // Hop 1: Get connections involving this entity
  const [fromRes, toRes] = await Promise.all([
    supabase.from('connections').select('*').eq('from_entity_id', entityId),
    supabase.from('connections').select('*').eq('to_entity_id', entityId),
  ])

  const hop1Connections = [...(fromRes.data || []), ...(toRes.data || [])]
  if (hop1Connections.length === 0) return null

  // Collect hop-1 neighbor IDs
  const hop1Ids = new Set([entityId])
  hop1Connections.forEach((c) => {
    hop1Ids.add(c.from_entity_id)
    hop1Ids.add(c.to_entity_id)
  })

  // Hop 2: Get connections involving hop-1 neighbors
  const hop1List = [...hop1Ids]
  const hop2Connections = await fetchConnectionsBetween(hop1List)

  // Collect hop-2 neighbor IDs
  const hop2Ids = new Set(hop1Ids)
  hop2Connections.forEach((c) => {
    hop2Ids.add(c.from_entity_id)
    hop2Ids.add(c.to_entity_id)
  })

  let targetIds = [...hop2Ids]

  // Apply node cap, always keeping the searched entity
  if (targetIds.length > MAX_NODES) {
    const keepIds = new Set([entityId])
    targetIds = capByConnectionCount(targetIds, hop2Connections, keepIds)
  }

  const targetSet = new Set(targetIds)
  const filteredConnections = hop2Connections.filter(
    (c) => targetSet.has(c.from_entity_id) && targetSet.has(c.to_entity_id)
  )

  const [entities, contracts] = await Promise.all([
    fetchAll('entities', { inColumn: 'id', inValues: targetIds }),
    fetchAll('contracts', { inColumn: 'grantee_entity_id', inValues: targetIds }),
  ])

  const result = buildGraphFromData(entities, filteredConnections, contracts)
  // Mark the searched entity
  result.nodes.forEach((n) => {
    if (n.id === entityId) n.isSearchFocus = true
  })
  return result
}

export async function searchEntities(query) {
  if (isDemoMode) {
    return DEMO_ENTITIES.filter((e) =>
      e.name.toLowerCase().includes(query.toLowerCase())
    )
  }

  const { data } = await supabase
    .from('entities')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(20)

  return data || []
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetch all connections where BOTH endpoints are in the given ID list.
 * Uses batched .in() queries on from_entity_id, then filters by to_entity_id.
 */
async function fetchConnectionsBetween(entityIds) {
  const idSet = new Set(entityIds)
  const all = []
  const pageSize = 1000
  for (let i = 0; i < entityIds.length; i += 500) {
    const batch = entityIds.slice(i, i + 500)
    let offset = 0
    while (true) {
      const { data } = await supabase
        .from('connections')
        .select('*')
        .in('from_entity_id', batch)
        .range(offset, offset + pageSize - 1)
      if (!data || data.length === 0) break
      data.forEach((c) => {
        if (idSet.has(c.to_entity_id)) all.push(c)
      })
      if (data.length < pageSize) break
      offset += pageSize
    }
  }
  // Also fetch where to_entity_id is in our set (catches asymmetric connections)
  const seen = new Set(all.map((c) => c.id))
  for (let i = 0; i < entityIds.length; i += 500) {
    const batch = entityIds.slice(i, i + 500)
    let offset = 0
    while (true) {
      const { data } = await supabase
        .from('connections')
        .select('*')
        .in('to_entity_id', batch)
        .range(offset, offset + pageSize - 1)
      if (!data || data.length === 0) break
      data.forEach((c) => {
        if (idSet.has(c.from_entity_id) && !seen.has(c.id)) {
          all.push(c)
          seen.add(c.id)
        }
      })
      if (data.length < pageSize) break
      offset += pageSize
    }
  }
  return all
}

/**
 * Cap entity list to MAX_NODES, prioritizing keepIds and then top-connected.
 */
function capByConnectionCount(entityIds, connections, keepIds) {
  const connCount = new Map()
  connections.forEach((c) => {
    connCount.set(c.from_entity_id, (connCount.get(c.from_entity_id) || 0) + 1)
    connCount.set(c.to_entity_id, (connCount.get(c.to_entity_id) || 0) + 1)
  })

  // Always keep priority IDs
  const kept = new Set(keepIds || [])
  const remaining = entityIds.filter((id) => !kept.has(id))
  remaining.sort((a, b) => (connCount.get(b) || 0) - (connCount.get(a) || 0))

  const slotsLeft = MAX_NODES - kept.size
  remaining.slice(0, Math.max(0, slotsLeft)).forEach((id) => kept.add(id))

  return [...kept]
}

function buildGraphFromData(entities, connections, contracts) {
  const entityMap = new Map()
  entities.forEach((e) => entityMap.set(e.id, e))

  const entityContracts = new Map()
  contracts.forEach((c) => {
    const list = entityContracts.get(c.grantee_entity_id) || []
    list.push(c)
    entityContracts.set(c.grantee_entity_id, list)
  })

  const totalAmount = contracts.reduce(
    (sum, c) => sum + (parseFloat(c.amount_awarded) || 0),
    0
  )

  const nodes = entities.map((e) => {
    const eContracts = entityContracts.get(e.id) || []
    const totalContractAmount = eContracts.reduce(
      (sum, c) => sum + (parseFloat(c.amount_awarded) || 0),
      0
    )
    const risk = getEntityRisk(e, eContracts, connections)

    return {
      id: e.id,
      name: e.name,
      type: e.type,
      city: e.city,
      ein: e.ein,
      risk,
      totalAmount: totalContractAmount,
      contracts: eContracts,
      source_url: eContracts[0]?.source_url || null,
    }
  })

  const links = connections
    .filter(
      (c) => entityMap.has(c.from_entity_id) && entityMap.has(c.to_entity_id)
    )
    .map((c) => ({
      source: c.from_entity_id,
      target: c.to_entity_id,
      relationship_type: c.relationship_type,
      amount: parseFloat(c.amount) || 0,
      strength_score: parseFloat(c.strength_score) || 1,
      source_url: c.source_url,
      year: c.year,
    }))

  const highRiskCount = nodes.filter((n) => n.risk === 'HIGH').length

  return {
    nodes,
    links,
    stats: {
      totalAmount,
      entityCount: nodes.length,
      connectionCount: links.length,
      highRiskCount,
    },
  }
}
