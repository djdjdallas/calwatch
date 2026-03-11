import { supabase, isDemoMode } from './supabase'

// Known convicted politicians for CRITICAL severity
const CONVICTED_POLITICIANS = ['mark ridley-thomas', 'ridley-thomas']

function getSeverity(amount, politicianName) {
  const isConvicted = CONVICTED_POLITICIANS.some(
    (n) => politicianName?.toLowerCase().includes(n)
  )
  if (amount > 50_000_000 || isConvicted) return 'CRITICAL'
  if (amount > 10_000_000) return 'HIGH'
  if (amount > 1_000_000) return 'MEDIUM'
  return 'FLAGGED'
}

const DEMO_CASES = [
  { caseNumber: 1, orgName: 'Hope The Mission', orgSlug: 'hope-the-mission', contractAmount: 174_677_804, officerName: 'Ken Craft', officerTitle: 'CEO', donationAmount: 4_900, politicianName: 'Mike Feuer', year: 2022, confirmed: true, severity: 'CRITICAL' },
  { caseNumber: 2, orgName: 'San Luis Obispo County', orgSlug: 'san-luis-obispo-county', contractAmount: 25_069_193, officerName: 'Wade Horton', officerTitle: 'County Admin', donationAmount: 2_500, politicianName: 'Dawn Addis', year: 2022, confirmed: true, severity: 'HIGH' },
  { caseNumber: 3, orgName: 'Abbey Road', orgSlug: 'abbey-road', contractAmount: 7_830_537, officerName: 'Board Member', officerTitle: 'Director', donationAmount: 1_500, politicianName: 'Mike Feuer', year: 2021, confirmed: true, severity: 'HIGH' },
  { caseNumber: 4, orgName: 'Ltsc Community Development', orgSlug: 'ltsc-community-development', contractAmount: 7_157_180, officerName: 'Dean Matsubayashi', officerTitle: 'Executive Dir', donationAmount: 5_000, politicianName: 'Mark Ridley-Thomas', year: 2020, confirmed: true, severity: 'CRITICAL' },
  { caseNumber: 5, orgName: 'East La Community', orgSlug: 'east-la-community', contractAmount: 1_779_263, officerName: 'Board Member', officerTitle: 'Director', donationAmount: 1_000, politicianName: 'Hilda Solis', year: 2021, confirmed: true, severity: 'MEDIUM' },
  { caseNumber: 6, orgName: 'Beacon House Assn Of San Pedro', orgSlug: 'beacon-house-assn-of-san-pedro', contractAmount: 1_250_000, officerName: 'Board Member', officerTitle: 'Director', donationAmount: 500, politicianName: 'Joe Buscaino', year: 2020, confirmed: true, severity: 'MEDIUM' },
  { caseNumber: 7, orgName: 'Chico Housing Action Team', orgSlug: 'chico-housing-action-team', contractAmount: 288_550, officerName: 'Leslie Johnson', officerTitle: 'Exec Director', donationAmount: 750, politicianName: 'Jim Gallagher', year: 2022, confirmed: true, severity: 'FLAGGED' },
  { caseNumber: 8, orgName: 'Westside Family Health Center', orgSlug: 'westside-family-health-center', contractAmount: 76_875, officerName: 'Board Member', officerTitle: 'Director', donationAmount: 250, politicianName: 'Mike Bonin', year: 2021, confirmed: true, severity: 'FLAGGED' },
  { caseNumber: 9, orgName: 'Pra International', orgSlug: 'pra-international', contractAmount: 22_712, officerName: 'Board Member', officerTitle: 'Director', donationAmount: 500, politicianName: 'Holly Mitchell', year: 2020, confirmed: true, severity: 'FLAGGED' },
  { caseNumber: 10, orgName: 'International Association Of', orgSlug: 'international-association-of', contractAmount: 995, officerName: 'Board Member', officerTitle: 'Representative', donationAmount: 200, politicianName: 'Mike Feuer', year: 2021, confirmed: true, severity: 'FLAGGED' },
]

/**
 * Fetch all confirmed conflict-of-interest cases, enriched with
 * contract amounts, officer names, donation details, and politician names.
 */
export async function getCases() {
  if (isDemoMode || !supabase) {
    return DEMO_CASES
  }

  // Step 1: Fetch conflict_of_interest connections
  const { data: coiRows } = await supabase
    .from('connections')
    .select('*')
    .eq('relationship_type', 'conflict_of_interest')

  if (!coiRows || coiRows.length === 0) return []

  // Step 2: Collect entity IDs
  const entityIds = new Set()
  coiRows.forEach((c) => {
    entityIds.add(c.from_entity_id)
    entityIds.add(c.to_entity_id)
  })
  const idList = [...entityIds]

  // Step 3: Fetch entities
  const entities = []
  for (let i = 0; i < idList.length; i += 500) {
    const batch = idList.slice(i, i + 500)
    const { data } = await supabase.from('entities').select('*').in('id', batch)
    if (data) entities.push(...data)
  }
  const entityMap = new Map(entities.map((e) => [e.id, e]))

  // Step 4: Fetch contracts
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

  // Step 5: Fetch officers for the nonprofit entities
  const orgIds = []
  coiRows.forEach((coi) => {
    const from = entityMap.get(coi.from_entity_id)
    const to = entityMap.get(coi.to_entity_id)
    if (from && from.type !== 'politician') orgIds.push(from.id)
    if (to && to.type !== 'politician') orgIds.push(to.id)
  })
  const officers = []
  const uniqueOrgIds = [...new Set(orgIds)]
  for (let i = 0; i < uniqueOrgIds.length; i += 500) {
    const batch = uniqueOrgIds.slice(i, i + 500)
    const { data } = await supabase.from('officers').select('*').in('entity_id', batch)
    if (data) officers.push(...data)
  }
  const officersByEntity = new Map()
  officers.forEach((o) => {
    if (!officersByEntity.has(o.entity_id)) officersByEntity.set(o.entity_id, o)
  })

  // Step 6: Donation lookup
  // The cross-reference script matched OFFICERS of nonprofits who donated to
  // politician campaigns. donations.donor_name = person name (the officer),
  // donations.recipient_name = politician committee name.
  // donor_entity_id is NULL for all rows (person names don't map to entity IDs).
  // So we must look up by officer name → recipient name.
  //
  // Build a function that queries donations for a specific officer+politician pair.
  async function findDonation(officerNames, politicianName) {
    if (!officerNames.length || !politicianName) return { total: 0, year: '', source: 'not_found' }

    // Try each officer name as donor
    for (const name of officerNames) {
      if (!name) continue
      // Split to get last name for broader matching
      const parts = name.trim().split(/\s+/)
      const lastName = parts[parts.length - 1]
      if (lastName.length < 3) continue

      const { data } = await supabase
        .from('donations')
        .select('amount, year, donor_name, recipient_name')
        .ilike('donor_name', `%${lastName}%`)
        .ilike('recipient_name', `%${politicianName.split(' ')[0]}%`)
        .limit(20)

      if (data && data.length > 0) {
        // Further filter: check first name match too for accuracy
        const firstWord = parts[0]?.toLowerCase() || ''
        const strong = data.filter((d) => d.donor_name?.toLowerCase().includes(firstWord))
        const matches = strong.length > 0 ? strong : data

        const total = matches.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0)
        const year = matches[0]?.year || ''
        return { total, year, source: strong.length > 0 ? 'name_match' : 'partial_match' }
      }
    }

    return { total: 0, year: '', source: 'not_found' }
  }

  // Step 7: Build cases
  const seen = new Set()
  const casePairs = []

  coiRows.forEach((coi) => {
    const fromEntity = entityMap.get(coi.from_entity_id)
    const toEntity = entityMap.get(coi.to_entity_id)
    if (!fromEntity || !toEntity) return

    let org, politician
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
    if (seen.has(org.id)) return
    seen.add(org.id)
    casePairs.push({ org, politician })
  })

  // Build cases with async donation lookups
  const cases = []
  for (const { org, politician } of casePairs) {
    const entityContracts = contractsByEntity.get(org.id) || []
    const contractAmount = entityContracts.reduce(
      (sum, c) => sum + (parseFloat(c.amount_awarded) || 0), 0
    )

    const officer = officersByEntity.get(org.id)
    // officers table uses person_name, not name
    const officerName = officer?.person_name || null
    const officerTitle = officer?.title || null

    // Get all officer names for this org (for donation lookup)
    const orgOfficerNames = officers
      .filter((o) => o.entity_id === org.id)
      .map((o) => o.person_name)
      .filter(Boolean)
      .slice(0, 5) // limit to avoid too many queries

    // Look up donation: officer donated to politician's committee
    const donation = await findDonation(orgOfficerNames, politician?.name)

    const slug = (org.slug || org.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    cases.push({
      caseNumber: 0,
      orgName: org.name,
      orgSlug: slug,
      contractAmount,
      officerName,
      officerTitle,
      donationAmount: donation.total,
      donationSource: donation.source,
      politicianName: politician?.name || 'Unknown',
      year: donation.year,
      confirmed: true,
      severity: getSeverity(contractAmount, politician?.name),
    })
  }

  // Sort by contract amount DESC and assign case numbers
  cases.sort((a, b) => b.contractAmount - a.contractAmount)
  cases.forEach((c, i) => { c.caseNumber = i + 1 })

  // Debug: log first case
  if (cases.length > 0) {
    console.log('[CalWatch] Case #001:', JSON.stringify(cases[0], null, 2))
  }

  return cases
}
