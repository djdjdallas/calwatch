'use client'

import { RISK_COLORS } from '@/lib/riskScore'
import { isDemoMode } from '@/lib/supabase'

const TYPE_LABELS = {
  nonprofit: 'Nonprofit',
  politician: 'Politician',
  company: 'Company',
  government_agency: 'Government Agency',
}

const TYPE_COLORS = {
  nonprofit: 'bg-blue-500',
  politician: 'bg-red-500',
  company: 'bg-orange-500',
  government_agency: 'bg-purple-500',
}

const REL_LABELS = {
  received_contract: 'Received Contract',
  officer_of: 'Officer Of',
  donated_to: 'Donated To',
  conflict_of_interest: 'Conflict of Interest',
  family_of: 'Family Of',
  board_member_of: 'Board Member Of',
}

function formatAmount(amount) {
  if (!amount || amount === 0) return '$0'
  return '$' + amount.toLocaleString('en-US')
}

export default function DetailPanel({ entity, connections, onClose }) {
  if (!entity) return null

  const directConnections = connections.filter((c) => {
    const sId = typeof c.source === 'object' ? c.source.id : c.source
    const tId = typeof c.target === 'object' ? c.target.id : c.target
    return sId === entity.id || tId === entity.id
  })

  const riskColor = RISK_COLORS[entity.risk] || RISK_COLORS.LOW
  const hasOutcomes = entity.contracts?.some((c) => c.outcomes_reported)

  return (
    <div className="fixed right-0 top-0 h-full w-[380px] bg-[#111111] border-l border-white/10 z-50 overflow-y-auto shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-white/10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider text-white ${TYPE_COLORS[entity.type] || 'bg-gray-600'}`}
            >
              {TYPE_LABELS[entity.type] || entity.type}
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider text-white flex items-center gap-1"
              style={{ backgroundColor: riskColor + '33', color: riskColor }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: riskColor }}
              />
              {entity.risk}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-white truncate">
            {entity.name}
          </h2>
          {entity.city && (
            <p className="text-xs text-white/40 mt-0.5">
              {entity.city}, {entity.state || 'CA'}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white p-1 ml-2"
          aria-label="Close panel"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M15 5L5 15M5 5l10 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Stats */}
      <div className="p-5 border-b border-white/10 space-y-3">
        {entity.ein && (
          <div className="flex justify-between">
            <span className="text-xs text-white/40">EIN</span>
            <span className="text-xs text-white/70 font-mono">
              {entity.ein}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-xs text-white/40">Total Contracts</span>
          <span className="text-sm text-white font-mono font-medium">
            {formatAmount(entity.totalAmount)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-white/40">Outcomes Reported</span>
          <span
            className={`text-xs font-medium ${hasOutcomes ? 'text-green-400' : 'text-red-400'}`}
          >
            {hasOutcomes ? 'Yes' : 'No'}
          </span>
        </div>

        {/* Source URL */}
        <div className="flex justify-between items-center">
          <span className="text-xs text-white/40">Source</span>
          {entity.source_url ? (
            <a
              href={entity.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View source
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className="inline"
              >
                <path
                  d="M3.5 8.5l5-5M4.5 3.5h4v4"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          ) : (
            <span className="text-xs text-yellow-500/70 italic">
              Source pending
            </span>
          )}
        </div>
      </div>

      {/* Connections */}
      <div className="p-5">
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3">
          Connections ({directConnections.length})
        </h3>
        {directConnections.length === 0 ? (
          <p className="text-xs text-white/30">No connections found.</p>
        ) : (
          <div className="space-y-2">
            {directConnections.map((conn, i) => {
              const sId =
                typeof conn.source === 'object' ? conn.source.id : conn.source
              const tId =
                typeof conn.target === 'object' ? conn.target.id : conn.target
              const other = sId === entity.id ? conn.target : conn.source
              const otherName =
                typeof other === 'object' ? other.name : other
              return (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white/80 truncate">
                      {otherName || 'Unknown'}
                    </p>
                    <p className="text-[10px] text-white/40 uppercase">
                      {REL_LABELS[conn.relationship_type] ||
                        conn.relationship_type}
                    </p>
                  </div>
                  {conn.amount > 0 && (
                    <span className="text-xs text-white/60 font-mono ml-2">
                      {formatAmount(conn.amount)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {isDemoMode && (
        <div className="mx-5 mb-5 p-3 rounded bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-[10px] text-yellow-500/70 text-center">
            DEMO MODE — This entity is a placeholder for UI testing only.
          </p>
        </div>
      )}
    </div>
  )
}
