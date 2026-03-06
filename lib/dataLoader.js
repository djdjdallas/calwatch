import { supabase, isDemoMode } from './supabase'
import { DEMO_ENTITIES, DEMO_CONNECTIONS, DEMO_CONTRACTS } from './demoData'
import { getEntityRisk } from './riskScore'

export async function loadGraphData() {
  if (isDemoMode) {
    return buildGraphFromData(DEMO_ENTITIES, DEMO_CONNECTIONS, DEMO_CONTRACTS)
  }

  const [entitiesRes, connectionsRes, contractsRes] = await Promise.all([
    supabase.from('entities').select('*'),
    supabase.from('connections').select('*'),
    supabase.from('contracts').select('*'),
  ])

  return buildGraphFromData(
    entitiesRes.data || [],
    connectionsRes.data || [],
    contractsRes.data || []
  )
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
    (sum, c) => sum + (c.amount_awarded || 0),
    0
  )

  const nodes = entities.map((e) => {
    const eContracts = entityContracts.get(e.id) || []
    const totalContractAmount = eContracts.reduce(
      (sum, c) => sum + (c.amount_awarded || 0),
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
      amount: c.amount || 0,
      strength_score: c.strength_score || 1,
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
      highRiskCount,
    },
  }
}
