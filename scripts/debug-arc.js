// Run in browser console on the homepage, or run with node
// This simulates what ArcDiagram does to find missing connections

// Paste the graphData from React devtools, or we'll fetch it here
const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const fs = require('fs')

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

async function debug() {
  // Fetch COI connections
  const { data: coiRows } = await supabase
    .from('connections')
    .select('*')
    .eq('relationship_type', 'conflict_of_interest')

  console.log(`COI connections: ${coiRows.length}`)

  // Collect all entity IDs
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

  console.log('\n=== COI Entity pairs ===')
  coiRows.forEach((c) => {
    const from = entities.find((e) => e.id === c.from_entity_id)
    const to = entities.find((e) => e.id === c.to_entity_id)
    console.log(`  ${from?.name} (${from?.type}) → ${to?.name} (${to?.type})`)
  })

  // Now fetch ALL connections between these entities (what loadFraudTriangles does)
  const allConns = []
  for (let i = 0; i < idList.length; i += 500) {
    const batch = idList.slice(i, i + 500)
    const { data } = await supabase.from('connections').select('*').in('from_entity_id', batch)
    if (data) data.forEach((c) => { if (entityIds.has(c.to_entity_id)) allConns.push(c) })
  }
  // Also reverse direction
  const seen = new Set(allConns.map((c) => c.id))
  for (let i = 0; i < idList.length; i += 500) {
    const batch = idList.slice(i, i + 500)
    const { data } = await supabase.from('connections').select('*').in('to_entity_id', batch)
    if (data) data.forEach((c) => { if (entityIds.has(c.from_entity_id) && !seen.has(c.id)) allConns.push(c) })
  }

  // Expand to 1-hop neighbors
  const expandedIds = new Set(entityIds)
  allConns.forEach((c) => {
    expandedIds.add(c.from_entity_id)
    expandedIds.add(c.to_entity_id)
  })

  // Fetch expanded entities
  const expandedList = [...expandedIds].filter((id) => !entityIds.has(id))
  const neighborEntities = []
  for (let i = 0; i < expandedList.length; i += 500) {
    const batch = expandedList.slice(i, i + 500)
    const { data } = await supabase.from('entities').select('*').in('id', batch)
    if (data) neighborEntities.push(...data)
  }

  const allEntities = [...entities, ...neighborEntities]
  const entityMap = new Map(allEntities.map((e) => [e.id, e]))

  console.log(`\n=== All entities in graph: ${allEntities.length} ===`)
  console.log('  Politicians:')
  allEntities.filter((e) => e.type === 'politician').forEach((e) => console.log(`    ${e.name} (${e.type}) [${e.id}]`))
  console.log('  Non-politicians with politician-like names:')
  const polKw = ['for senate', 'for assembly', 'committee', 'friends', 'officeholder', 'krekorian', 'ridley-thomas', 'de leon', 'de kevin', 'mitchell j', 'hahn', 'karen bass']
  allEntities.filter((e) => e.type !== 'politician' && polKw.some((kw) => (e.name || '').toLowerCase().includes(kw)))
    .forEach((e) => console.log(`    ${e.name} (${e.type}) [${e.id}]`))

  // Check which links reference entities NOT in the expanded set
  console.log(`\n=== Links: ${allConns.length} total ===`)
  const targetSet = new Set([...expandedIds])
  const filteredConns = allConns.filter((c) => targetSet.has(c.from_entity_id) && targetSet.has(c.to_entity_id))
  console.log(`  Filtered (both endpoints in set): ${filteredConns.length}`)

  // Check specifically for the missing politicians
  const missing = ['karen bass', 'de kevin', 'mark r', 'ridley-thomas mark']
  console.log('\n=== Checking specific politicians ===')
  for (const name of missing) {
    const ent = allEntities.find((e) => (e.name || '').toLowerCase().includes(name))
    if (ent) {
      console.log(`  Found: "${ent.name}" (${ent.type}) [${ent.id}]`)
      const conns = filteredConns.filter((c) => c.from_entity_id === ent.id || c.to_entity_id === ent.id)
      console.log(`    Connections: ${conns.length}`)
      conns.forEach((c) => {
        const other = c.from_entity_id === ent.id ? entityMap.get(c.to_entity_id) : entityMap.get(c.from_entity_id)
        console.log(`      ${c.relationship_type}: ${other?.name || c.from_entity_id}`)
      })
    } else {
      console.log(`  NOT FOUND in graph data: "${name}"`)
    }
  }
}

debug().catch(console.error)
