const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const fs = require('fs')

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
envContent.split('\n').forEach((line) => {
  const match = line.match(/^([^#=]+)=(.+)$/)
  if (match) process.env[match[1].trim()] = match[2].trim()
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function audit() {
  console.log('\n========== CALWATCH DATA AUDIT ==========\n')

  // 1. Count all tables
  const tables = ['entities', 'contracts', 'connections', 'donations', 'officers']
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true })
    console.log(`${t}: ${count ?? 'ERROR'} rows${error ? ' (' + error.message + ')' : ''}`)
  }

  // 2. Check schema — sample 1 row from each table to see column names
  console.log('\n========== TABLE SCHEMAS (first row) ==========')
  for (const t of tables) {
    const { data } = await supabase.from(t).select('*').limit(1)
    if (data && data[0]) {
      console.log(`\n${t} columns:`, Object.keys(data[0]).join(', '))
    } else {
      console.log(`\n${t}: EMPTY or ERROR`)
    }
  }

  // 3. Get all conflict_of_interest connections
  console.log('\n========== CONFLICT OF INTEREST CONNECTIONS ==========')
  const { data: coiRows } = await supabase
    .from('connections')
    .select('*')
    .eq('relationship_type', 'conflict_of_interest')

  console.log(`Total conflict_of_interest rows: ${coiRows?.length || 0}`)
  if (!coiRows || coiRows.length === 0) {
    console.log('⚠️  NO CONFLICT OF INTEREST CONNECTIONS FOUND')
    return
  }

  // Collect entity IDs
  const entityIds = new Set()
  coiRows.forEach((c) => {
    if (c.from_entity_id) entityIds.add(c.from_entity_id)
    if (c.to_entity_id) entityIds.add(c.to_entity_id)
  })

  // Fetch all involved entities
  const entities = []
  const idList = [...entityIds]
  for (let i = 0; i < idList.length; i += 500) {
    const batch = idList.slice(i, i + 500)
    const { data } = await supabase.from('entities').select('*').in('id', batch)
    if (data) entities.push(...data)
  }
  const entityMap = new Map(entities.map((e) => [e.id, e]))

  // 4. For each COI connection, check contracts, officers, donations
  const seen = new Set()
  let caseNum = 0

  for (const coi of coiRows) {
    const fromEnt = entityMap.get(coi.from_entity_id)
    const toEnt = entityMap.get(coi.to_entity_id)
    if (!fromEnt || !toEnt) continue

    let org, politician
    if (fromEnt.type === 'politician') { politician = fromEnt; org = toEnt }
    else if (toEnt.type === 'politician') { politician = toEnt; org = fromEnt }
    else { org = fromEnt; politician = toEnt }
    if (!org || seen.has(org.id)) continue
    seen.add(org.id)
    caseNum++

    console.log(`\n--- Case #${caseNum}: ${org.name} → ${politician?.name || 'Unknown'} ---`)
    console.log(`  Org ID: ${org.id}`)
    console.log(`  Politician ID: ${politician?.id}`)

    // Contracts (grantee_entity_id, amount_awarded)
    const { data: contracts } = await supabase
      .from('contracts')
      .select('amount_awarded, year, program')
      .eq('grantee_entity_id', org.id)
    const contractTotal = (contracts || []).reduce((s, c) => s + (parseFloat(c.amount_awarded) || 0), 0)
    console.log(`  Contracts: ${contracts?.length || 0} rows, total: $${contractTotal.toLocaleString()}`)

    // Officers (entity_id, person_name, title)
    const { data: officers } = await supabase
      .from('officers')
      .select('person_name, title')
      .eq('entity_id', org.id)
    console.log(`  Officers: ${officers?.length || 0} found`)
    if (officers?.length) {
      officers.forEach((o) => console.log(`    - ${o.person_name} (${o.title})`))
    } else {
      console.log('  ⚠️  NO OFFICERS FOUND for this org')
    }

    // Donations — try direct donor_entity_id match
    const { data: donationsDirect } = await supabase
      .from('donations')
      .select('amount, year, donor_name, recipient_name')
      .eq('donor_entity_id', org.id)
    console.log(`  Donations (by org entity_id): ${donationsDirect?.length || 0}`)
    if (donationsDirect?.length) {
      donationsDirect.slice(0, 3).forEach((d) =>
        console.log(`    $${d.amount} (${d.year}): ${d.donor_name} → ${d.recipient_name}`)
      )
    }

    // Donations — try by donor_name matching org name
    const { data: donationsByName } = await supabase
      .from('donations')
      .select('amount, year, donor_name, recipient_name')
      .ilike('donor_name', `%${org.name.split(' ')[0]}%`)
      .limit(5)
    console.log(`  Donations (by name "${org.name.split(' ')[0]}"): ${donationsByName?.length || 0}`)
    if (donationsByName?.length) {
      donationsByName.forEach((d) =>
        console.log(`    $${d.amount} (${d.year}): "${d.donor_name}" → "${d.recipient_name}"`)
      )
    }

    // Donations — also check if politician name appears as recipient
    if (politician) {
      const { data: donationsToP } = await supabase
        .from('donations')
        .select('amount, year, donor_name, recipient_name')
        .ilike('recipient_name', `%${politician.name.split(' ')[0]}%`)
        .limit(5)
      console.log(`  Donations to politician "${politician.name.split(' ')[0]}": ${donationsToP?.length || 0}`)
      if (donationsToP?.length) {
        donationsToP.forEach((d) =>
          console.log(`    $${d.amount} (${d.year}): "${d.donor_name}" → "${d.recipient_name}"`)
        )
      }
    }
  }

  // 5. Officers table sample
  console.log('\n========== OFFICERS TABLE SAMPLE ==========')
  const { data: officerSample } = await supabase
    .from('officers')
    .select('person_name, title, entity_id')
    .limit(10)
  if (!officerSample?.length) {
    console.log('⚠️  OFFICERS TABLE IS EMPTY')
  } else {
    for (const o of officerSample) {
      const ent = entityMap.get(o.entity_id)
      console.log(`  ${o.person_name} (${o.title}) @ ${ent?.name || o.entity_id}`)
    }
  }

  // 6. Donations table sample
  console.log('\n========== DONATIONS TABLE SAMPLE ==========')
  const { data: donSample } = await supabase
    .from('donations')
    .select('amount, year, donor_name, recipient_name, donor_entity_id, recipient_entity_id')
    .gt('amount', 0)
    .limit(10)
  if (!donSample?.length) {
    console.log('⚠️  NO DONATIONS WITH amount > 0')
    // Check if there are any donations at all
    const { data: anyDon } = await supabase.from('donations').select('amount, donor_name').limit(5)
    console.log('  Raw sample (any amount):', anyDon)
  } else {
    donSample.forEach((d) => {
      const donorResolved = entityMap.get(d.donor_entity_id)?.name || '(unresolved)'
      console.log(`  $${d.amount} (${d.year}): donor_name="${d.donor_name}" donor_entity="${donorResolved}" → recipient="${d.recipient_name}"`)
    })
  }

  console.log('\n========== AUDIT COMPLETE ==========\n')
}

audit().catch(console.error)
