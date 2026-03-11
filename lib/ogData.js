import { supabaseServer } from './supabaseServer'

/**
 * Fetch entity data for OG image and metadata generation.
 */
export async function getEntityOgData(slug) {
  if (!supabaseServer) return null

  // Convert slug back to a name for lookup: "hope-the-mission" → "Hope The Mission"
  // The entities table has no slug column — names are title-cased
  const nameFromSlug = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  // Try exact name match first, fall back to ilike
  let entity = null
  const { data: exact } = await supabaseServer
    .from('entities')
    .select('*')
    .eq('name', nameFromSlug)
    .limit(1)
    .single()

  if (exact) {
    entity = exact
  } else {
    // Fuzzy match: replace hyphens with wildcards for partial matches
    const pattern = '%' + slug.replace(/-/g, '%') + '%'
    const { data: fuzzy } = await supabaseServer
      .from('entities')
      .select('*')
      .ilike('name', pattern)
      .limit(1)
    entity = fuzzy?.[0] || null
  }

  if (!entity) return null

  // Fetch contract total
  const { data: contracts } = await supabaseServer
    .from('contracts')
    .select('amount_awarded')
    .eq('grantee_entity_id', entity.id)

  const totalAmount = (contracts || []).reduce(
    (sum, c) => sum + (parseFloat(c.amount_awarded) || 0),
    0
  )

  // Fetch conflict_of_interest connections
  const { data: coiFrom } = await supabaseServer
    .from('connections')
    .select('to_entity_id')
    .eq('from_entity_id', entity.id)
    .eq('relationship_type', 'conflict_of_interest')

  const { data: coiTo } = await supabaseServer
    .from('connections')
    .select('from_entity_id')
    .eq('to_entity_id', entity.id)
    .eq('relationship_type', 'conflict_of_interest')

  const coiConnections = [...(coiFrom || []), ...(coiTo || [])]
  const isFlagged = coiConnections.length > 0

  // Fetch connected politician names
  let politicians = []
  if (isFlagged) {
    const relatedIds = [
      ...coiFrom.map((c) => c.to_entity_id),
      ...coiTo.map((c) => c.from_entity_id),
    ]
    if (relatedIds.length > 0) {
      const { data: related } = await supabaseServer
        .from('entities')
        .select('name, type')
        .in('id', relatedIds)
      politicians = (related || [])
        .filter((e) => e.type === 'politician')
        .map((e) => e.name)
        .slice(0, 3)
    }
  }

  return {
    name: entity.name,
    type: entity.type,
    slug,
    totalAmount,
    isFlagged,
    politicians,
    coiCount: coiConnections.length,
  }
}

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
 * Fetch county data for OG image and metadata generation.
 */
export async function getCountyOgData(county) {
  if (!supabaseServer) return null

  // Normalize the county slug: "los-angeles" → "Los Angeles"
  const countyName = county
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  // Find orgs in this county
  const orgNames = Object.entries(ORG_COUNTY_MAP)
    .filter(([, c]) => c.toLowerCase() === countyName.toLowerCase())
    .map(([org]) => org)

  if (orgNames.length === 0) return null

  // Fetch entities matching these org names
  const { data: entities } = await supabaseServer
    .from('entities')
    .select('id, name')
    .in('name', orgNames)

  if (!entities || entities.length === 0) return null

  const entityIds = entities.map((e) => e.id)

  // Fetch total contracts
  const { data: contracts } = await supabaseServer
    .from('contracts')
    .select('amount_awarded')
    .in('grantee_entity_id', entityIds)

  const totalAmount = (contracts || []).reduce(
    (sum, c) => sum + (parseFloat(c.amount_awarded) || 0),
    0
  )

  // Fetch conflict_of_interest count
  const { data: coiRows } = await supabaseServer
    .from('connections')
    .select('id')
    .in('from_entity_id', entityIds)
    .eq('relationship_type', 'conflict_of_interest')

  return {
    county: countyName,
    slug: county,
    totalAmount,
    orgCount: entities.length,
    orgNames: entities.map((e) => e.name).slice(0, 3),
    coiCount: (coiRows || []).length,
  }
}
