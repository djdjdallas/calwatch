/**
 * Demo data for UI testing only.
 * These are clearly fake entities used to verify the graph renders correctly.
 * No real entity names, no real financial connections.
 */

export const DEMO_ENTITIES = [
  {
    id: 'demo-nonprofit-a',
    name: 'Demo Nonprofit A',
    type: 'nonprofit',
    city: 'Demo City',
    state: 'CA',
    ein: '00-0000000',
  },
  {
    id: 'demo-politician-b',
    name: 'Demo Politician B',
    type: 'politician',
    city: 'Demo City',
    state: 'CA',
  },
  {
    id: 'demo-contractor-c',
    name: 'Demo Contractor C',
    type: 'company',
    city: 'Demo City',
    state: 'CA',
  },
  {
    id: 'demo-agency-d',
    name: 'Demo Agency D',
    type: 'government_agency',
    city: 'Sacramento',
    state: 'CA',
  },
]

export const DEMO_CONNECTIONS = [
  {
    id: 'demo-conn-1',
    from_entity_id: 'demo-agency-d',
    to_entity_id: 'demo-nonprofit-a',
    relationship_type: 'received_contract',
    amount: 0,
    strength_score: 1.0,
    source_url: null,
    year: 2024,
  },
  {
    id: 'demo-conn-2',
    from_entity_id: 'demo-politician-b',
    to_entity_id: 'demo-agency-d',
    relationship_type: 'officer_of',
    amount: 0,
    strength_score: 0.8,
    source_url: null,
    year: 2024,
  },
  {
    id: 'demo-conn-3',
    from_entity_id: 'demo-contractor-c',
    to_entity_id: 'demo-politician-b',
    relationship_type: 'donated_to',
    amount: 0,
    strength_score: 0.6,
    source_url: null,
    year: 2024,
  },
]

export const DEMO_CONTRACTS = [
  {
    id: 'demo-contract-1',
    grantee_entity_id: 'demo-nonprofit-a',
    program: 'Demo Program',
    amount_awarded: 0,
    amount_spent: 0,
    outcomes_reported: false,
    outcome_notes: 'Demo — no real data',
    year: 2024,
    source_url: null,
  },
]
