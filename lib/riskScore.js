/**
 * Calculate risk score for a contract.
 * HIGH: no outcomes reported AND amount > $500k
 * MEDIUM: no outcomes reported AND amount <= $500k
 * LOW: outcomes reported
 */
export function getContractRisk(contract) {
  if (contract.outcomes_reported) return 'LOW'
  if (contract.amount_awarded > 500000) return 'HIGH'
  return 'MEDIUM'
}

/**
 * Calculate aggregate risk for an entity based on its contracts
 * and political donation overlap.
 */
export function getEntityRisk(entity, contracts, connections) {
  if (!contracts || contracts.length === 0) return 'LOW'

  const risks = contracts.map(getContractRisk)
  if (risks.includes('HIGH')) return 'HIGH'

  // Flag HIGH if entity officer donated to politician connected to their grants
  if (connections) {
    const hasDonationLoop = connections.some(
      (c) =>
        c.relationship_type === 'donated_to' &&
        (c.from_entity_id === entity.id || c.to_entity_id === entity.id)
    )
    const hasContract = connections.some(
      (c) =>
        c.relationship_type === 'received_contract' &&
        (c.from_entity_id === entity.id || c.to_entity_id === entity.id)
    )
    if (hasDonationLoop && hasContract) return 'HIGH'
  }

  if (risks.includes('MEDIUM')) return 'MEDIUM'
  return 'LOW'
}

export const RISK_COLORS = {
  HIGH: '#ef4444',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
}
