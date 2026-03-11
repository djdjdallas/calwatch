import { supabase, isDemoMode } from './supabase'

/**
 * Org name → county mapping (same as mapData.js).
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

function resolveCounty(entityName) {
  if (!entityName) return null
  if (ORG_COUNTY_MAP[entityName]) return ORG_COUNTY_MAP[entityName]
  const lower = entityName.toLowerCase()
  for (const [org, county] of Object.entries(ORG_COUNTY_MAP)) {
    if (lower.includes(org.toLowerCase()) || org.toLowerCase().includes(lower)) {
      return county
    }
  }
  return null
}

/**
 * Fetch county report card data for a given county name.
 * Returns: { county, totalAmount, orgCount, politicianCount, orgs: [{name, amount, politicians}] }
 */
export async function getCountyReportData(countyName) {
  if (isDemoMode || !supabase) {
    return getDemoCountyData(countyName)
  }

  // Fetch conflict_of_interest connections
  const { data: coiRows } = await supabase
    .from('connections')
    .select('*')
    .eq('relationship_type', 'conflict_of_interest')

  if (!coiRows || coiRows.length === 0) {
    return { county: countyName, totalAmount: 0, orgCount: 0, politicianCount: 0, orgs: [] }
  }

  // Collect entity IDs
  const entityIds = new Set()
  coiRows.forEach((c) => {
    entityIds.add(c.from_entity_id)
    entityIds.add(c.to_entity_id)
  })

  // Fetch entities
  const entities = []
  const idList = [...entityIds]
  for (let i = 0; i < idList.length; i += 500) {
    const batch = idList.slice(i, i + 500)
    const { data } = await supabase.from('entities').select('*').in('id', batch)
    if (data) entities.push(...data)
  }
  const entityMap = new Map(entities.map((e) => [e.id, e]))

  // Fetch contracts
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

  // Build per-county, per-org aggregation
  const orgsMap = new Map() // orgId -> { name, amount, politicians: Set }
  const allPoliticians = new Set()

  coiRows.forEach((coi) => {
    const fromEntity = entityMap.get(coi.from_entity_id)
    const toEntity = entityMap.get(coi.to_entity_id)
    if (!fromEntity || !toEntity) return

    let org = null
    let politician = null
    if (fromEntity.type === 'politician') {
      politician = fromEntity
      org = toEntity
    } else if (toEntity.type === 'politician') {
      politician = toEntity
      org = fromEntity
    } else {
      org = fromEntity
      politician = toEntity
    }

    if (!org) return
    const county = resolveCounty(org.name)
    if (!county || county.toLowerCase() !== countyName.toLowerCase()) return

    if (!orgsMap.has(org.id)) {
      const entityContracts = contractsByEntity.get(org.id) || []
      const amount = entityContracts.reduce(
        (sum, c) => sum + (parseFloat(c.amount_awarded) || 0), 0
      )
      orgsMap.set(org.id, { name: org.name, amount, politicians: new Set() })
    }

    if (politician) {
      orgsMap.get(org.id).politicians.add(politician.name)
      allPoliticians.add(politician.name)
    }
  })

  const orgs = [...orgsMap.values()]
    .map((o) => ({ ...o, politicians: [...o.politicians] }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  const totalAmount = orgs.reduce((s, o) => s + o.amount, 0)

  return {
    county: countyName,
    totalAmount,
    orgCount: orgsMap.size,
    politicianCount: allPoliticians.size,
    orgs,
  }
}

function getDemoCountyData(countyName) {
  const demo = {
    'Los Angeles': {
      county: 'Los Angeles',
      totalAmount: 191_795_366,
      orgCount: 8,
      politicianCount: 3,
      orgs: [
        { name: 'Hope The Mission', amount: 174_677_804, politicians: ['Demo Politician A'] },
        { name: 'Abbey Road', amount: 7_830_537, politicians: ['Demo Politician B'] },
        { name: 'Ltsc Community Development', amount: 7_157_180, politicians: ['Demo Politician A'] },
        { name: 'East La Community', amount: 1_779_263, politicians: [] },
        { name: 'Beacon House Assn Of San Pedro', amount: 1_250_000, politicians: ['Demo Politician C'] },
      ],
    },
    'San Luis Obispo': {
      county: 'San Luis Obispo',
      totalAmount: 25_069_193,
      orgCount: 1,
      politicianCount: 1,
      orgs: [
        { name: 'San Luis Obispo County', amount: 25_069_193, politicians: ['Demo Politician D'] },
      ],
    },
    'Butte': {
      county: 'Butte',
      totalAmount: 288_550,
      orgCount: 1,
      politicianCount: 1,
      orgs: [
        { name: 'Chico Housing Action Team', amount: 288_550, politicians: ['Demo Politician E'] },
      ],
    },
  }

  const match = Object.keys(demo).find(
    (k) => k.toLowerCase() === countyName.toLowerCase()
  )
  if (match) return demo[match]

  return { county: countyName, totalAmount: 0, orgCount: 0, politicianCount: 0, orgs: [] }
}
