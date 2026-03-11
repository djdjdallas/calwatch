'use client'

function formatCurrency(amount) {
  if (!amount || amount === 0) return '$0'
  if (amount >= 1_000_000_000) return '$' + (amount / 1_000_000_000).toFixed(1) + 'B'
  if (amount >= 1_000_000) return '$' + (amount / 1_000_000).toFixed(1) + 'M'
  if (amount >= 1_000) return '$' + (amount / 1_000).toFixed(0) + 'K'
  return '$' + amount.toLocaleString()
}

function formatNum(n) {
  if (n == null) return '—'
  return n.toLocaleString()
}

const VIEW_BUTTONS = [
  { key: 'fraud', label: 'Fraud Triangles' },
  { key: 'full', label: 'Full Network' },
]

export default function StatsBar({ stats, dbStats, viewMode, onViewChange }) {
  return (
    <div className="fixed bottom-6 left-6 z-30 flex items-center gap-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-4 py-2.5">
      {/* DB totals */}
      <div>
        <p className="text-[10px] text-white/40 uppercase tracking-wider">
          Total Contracts
        </p>
        <p className="text-sm font-mono font-semibold text-white">
          {dbStats?.totalContracts || '—'}
        </p>
      </div>
      <div className="w-px h-7 bg-white/10" />
      <div>
        <p className="text-[10px] text-white/40 uppercase tracking-wider">
          Connections
        </p>
        <p className="text-sm font-mono font-semibold text-white">
          {formatNum(dbStats?.totalConnections)}
        </p>
      </div>
      <div className="w-px h-7 bg-white/10" />
      <div>
        <p className="text-[10px] text-white/40 uppercase tracking-wider">
          Fraud Triangles
        </p>
        <p className="text-sm font-mono font-semibold text-red-400">
          {formatNum(dbStats?.fraudTriangles)}
        </p>
      </div>

      <div className="w-px h-7 bg-white/10" />

      {/* Current view stats */}
      <div>
        <p className="text-[10px] text-white/40 uppercase tracking-wider">
          Viewing
        </p>
        <p className="text-sm font-mono text-white/70">
          {stats ? `${stats.entityCount} nodes / ${formatNum(stats.connectionCount)} edges` : '—'}
          {stats?.capped && (
            <span className="text-[10px] text-yellow-500 ml-1">
              (top 500 of {formatNum(stats.totalEntityCount)})
            </span>
          )}
        </p>
      </div>

      <div className="w-px h-7 bg-white/10" />

      {/* View mode toggle */}
      <div className="flex gap-1">
        {VIEW_BUTTONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onViewChange?.(key)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors ${
              viewMode === key
                ? key === 'fraud'
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
            }`}
          >
            {label}
          </button>
        ))}
        {viewMode === 'search' && (
          <span className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-blue-500/20 border border-blue-500/40 text-blue-400">
            Search Focus
          </span>
        )}
      </div>

      <div className="w-px h-7 bg-white/10" />

      {/* Connection legend */}
      <div className="flex items-center gap-3 text-[10px] text-white/40">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 bg-purple-400 rounded" />
          Contract
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 border-t border-dashed border-yellow-400" />
          Donation
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 bg-blue-400 rounded" />
          Officer
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 bg-red-500 rounded" />
          Conflict
        </span>
      </div>
    </div>
  )
}
