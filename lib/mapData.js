import { supabase, isDemoMode } from './supabase'

/**
 * Org name → county mapping.
 * Hardcoded because the DB doesn't have geocoded addresses.
 */
const ORG_COUNTY_MAP = {
  'Hope The Mission': 'Los Angeles',
  'Abbey Road': 'Los Angeles',
  'Ltsc Community Development': 'Los Angeles',
  'East La Community': 'Los Angeles',
  'Beacon House Assn Of San Pedro': 'Los Angeles',
  'Westside Family Health Center': 'Los Angeles',
  'Pra International': 'Los Angeles',
  'International Association Of': 'Los Angeles',
  'San Luis Obispo County': 'San Luis Obispo',
  'Chico Housing Action Team': 'Butte',
}

/**
 * Try to match an entity name to a county.
 * First tries exact match, then substring match against org map keys.
 */
function resolveCounty(entityName) {
  if (!entityName) return null
  // Exact match
  if (ORG_COUNTY_MAP[entityName]) return ORG_COUNTY_MAP[entityName]
  // Substring match
  const lower = entityName.toLowerCase()
  for (const [org, county] of Object.entries(ORG_COUNTY_MAP)) {
    if (lower.includes(org.toLowerCase()) || org.toLowerCase().includes(lower)) {
      return county
    }
  }
  return null
}

const DEMO_COUNTY_DATA = {
  'Los Angeles': {
    county: 'Los Angeles',
    totalAmount: 191_795_366,
    triangleCount: 8,
    orgs: [
      { name: 'Hope The Mission', amount: 174_677_804, officer: 'Demo Officer', politician: 'Demo Politician', donationAmount: 5000 },
    ],
  },
  'San Luis Obispo': {
    county: 'San Luis Obispo',
    totalAmount: 25_069_193,
    triangleCount: 1,
    orgs: [
      { name: 'San Luis Obispo County', amount: 25_069_193, officer: 'Demo Officer', politician: 'Demo Politician', donationAmount: 2500 },
    ],
  },
  'Butte': {
    county: 'Butte',
    totalAmount: 288_550,
    triangleCount: 1,
    orgs: [
      { name: 'Chico Housing Action Team', amount: 288_550, officer: 'Demo Officer', politician: 'Demo Politician', donationAmount: 1000 },
    ],
  },
}

/**
 * Fetch conflict_of_interest data and aggregate by county.
 */
export async function loadMapData() {
  if (isDemoMode) {
    return {
      counties: DEMO_COUNTY_DATA,
      totalFlagged: 217_153_109,
      triangleCount: 10,
      affectedCounties: 3,
    }
  }

  // Step 1: Fetch all conflict_of_interest connections
  const { data: coiRows, error } = await supabase
    .from('connections')
    .select('*')
    .eq('relationship_type', 'conflict_of_interest')

  if (error || !coiRows || coiRows.length === 0) {
    return { counties: {}, totalFlagged: 0, triangleCount: 0, affectedCounties: 0 }
  }

  // Step 2: Collect all entity IDs involved
  const entityIds = new Set()
  coiRows.forEach((c) => {
    entityIds.add(c.from_entity_id)
    entityIds.add(c.to_entity_id)
  })
  const idList = [...entityIds]

  // Step 3: Fetch those entities
  const entities = []
  for (let i = 0; i < idList.length; i += 500) {
    const batch = idList.slice(i, i + 500)
    const { data } = await supabase.from('entities').select('*').in('id', batch)
    if (data) entities.push(...data)
  }
  const entityMap = new Map(entities.map((e) => [e.id, e]))

  // Step 4: Fetch contracts for these entities
  const contracts = []
  for (let i = 0; i < idList.length; i += 500) {
    const batch = idList.slice(i, i + 500)
    const { data } = await supabase.from('contracts').select('*').in('grantee_entity_id', batch)
    if (data) contracts.push(...data)
  }
  const contractsByEntity = new Map()
  contracts.forEach((c) => {
    const list = contractsByEntity.get(c.grantee_entity_id) || []
    list.push(c)
    contractsByEntity.set(c.grantee_entity_id, list)
  })

  // Step 5: Fetch all connections between these entities for officer/donation context
  const allConnections = []
  for (let i = 0; i < idList.length; i += 500) {
    const batch = idList.slice(i, i + 500)
    const { data } = await supabase.from('connections').select('*').in('from_entity_id', batch)
    if (data) {
      data.forEach((c) => {
        if (entityIds.has(c.to_entity_id)) allConnections.push(c)
      })
    }
  }

  // Step 6: Build per-county data
  const countyData = {}

  coiRows.forEach((coi) => {
    const fromEntity = entityMap.get(coi.from_entity_id)
    const toEntity = entityMap.get(coi.to_entity_id)

    // Determine which is the org (nonprofit/company) and which is the politician
    let org = null
    let politician = null
    if (fromEntity?.type === 'politician') {
      politician = fromEntity
      org = toEntity
    } else if (toEntity?.type === 'politician') {
      politician = toEntity
      org = fromEntity
    } else {
      // Neither is politician, treat from as org
      org = fromEntity
      politician = toEntity
    }

    if (!org) return

    const county = resolveCounty(org.name)
    if (!county) return

    if (!countyData[county]) {
      countyData[county] = { county, totalAmount: 0, triangleCount: 0, orgs: [] }
    }

    const entityContracts = contractsByEntity.get(org.id) || []
    const contractTotal = entityContracts.reduce(
      (sum, c) => sum + (parseFloat(c.amount_awarded) || 0), 0
    )

    // Find officer and donation connections for this org
    let officerName = ''
    let donationAmount = 0
    allConnections.forEach((conn) => {
      if (conn.relationship_type === 'officer_of') {
        if (conn.to_entity_id === org.id) {
          const officer = entityMap.get(conn.from_entity_id)
          if (officer) officerName = officer.name
        }
      }
      if (conn.relationship_type === 'donated_to' && politician) {
        if (conn.to_entity_id === politician.id) {
          donationAmount += parseFloat(conn.amount) || 0
        }
      }
    })

    // Avoid duplicate org entries in same county
    const existing = countyData[county].orgs.find((o) => o.name === org.name)
    if (!existing) {
      countyData[county].orgs.push({
        name: org.name,
        amount: contractTotal,
        officer: officerName,
        politician: politician?.name || '',
        donationAmount,
        sourceUrl: entityContracts[0]?.source_url || '',
      })
      countyData[county].totalAmount += contractTotal
    }
    countyData[county].triangleCount++
  })

  const totalFlagged = Object.values(countyData).reduce((s, c) => s + c.totalAmount, 0)
  const triangleCount = coiRows.length
  const affectedCounties = Object.keys(countyData).length

  return { counties: countyData, totalFlagged, triangleCount, affectedCounties }
}
