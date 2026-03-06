'use client'

function formatCurrency(amount) {
  if (!amount || amount === 0) return '$0'
  if (amount >= 1_000_000_000) return '$' + (amount / 1_000_000_000).toFixed(1) + 'B'
  if (amount >= 1_000_000) return '$' + (amount / 1_000_000).toFixed(1) + 'M'
  if (amount >= 1_000) return '$' + (amount / 1_000).toFixed(0) + 'K'
  return '$' + amount.toLocaleString()
}

export default function StatsBar({ stats }) {
  if (!stats) return null

  return (
    <div className="fixed bottom-6 left-6 z-30 flex items-center gap-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-5 py-3">
      <div>
        <p className="text-[10px] text-white/40 uppercase tracking-wider">
          Total Tracked
        </p>
        <p className="text-lg font-mono font-semibold text-white">
          {formatCurrency(stats.totalAmount)}
        </p>
      </div>
      <div className="w-px h-8 bg-white/10" />
      <div>
        <p className="text-[10px] text-white/40 uppercase tracking-wider">
          Entities
        </p>
        <p className="text-lg font-mono font-semibold text-white">
          {stats.entityCount}
        </p>
      </div>
      <div className="w-px h-8 bg-white/10" />
      <div>
        <p className="text-[10px] text-white/40 uppercase tracking-wider">
          Flagged
        </p>
        <p className="text-lg font-mono font-semibold text-red-400">
          {stats.highRiskCount}
        </p>
      </div>
    </div>
  )
}
