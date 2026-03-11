'use client'

import { forwardRef } from 'react'

function formatCurrency(amount) {
  if (!amount || amount === 0) return '$0'
  return '$' + Math.round(amount).toLocaleString('en-US')
}

const CountyReportCard = forwardRef(function CountyReportCard({ data }, ref) {
  if (!data || data.totalAmount === 0) return null

  const isFlagged = data.orgCount > 0

  return (
    <div
      ref={ref}
      className="w-[1600px] bg-[#111117] rounded-2xl border border-white/[0.06] overflow-hidden"
      style={{ aspectRatio: '1600 / 900' }}
    >
      <div className="flex flex-col h-full p-12">
        {/* Top row: branding + badge */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-baseline gap-3">
            <span className="text-lg font-mono font-medium text-cyan-400 tracking-widest uppercase">
              CalWatch.io
            </span>
            <span className="text-sm text-white/20 font-mono">
              Public Record Analysis
            </span>
          </div>
          {isFlagged ? (
            <span className="px-4 py-1.5 rounded-md text-sm font-mono font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/20">
              Flagged
            </span>
          ) : (
            <span className="px-4 py-1.5 rounded-md text-sm font-mono font-bold uppercase tracking-wider bg-white/5 text-white/30 border border-white/10">
              Clean
            </span>
          )}
        </div>

        {/* County name + stats row */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h2 className="text-6xl font-bold text-white leading-tight tracking-tight">
              {data.county} County
            </h2>
            <p className="text-lg text-white/30 mt-2">California</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-mono text-white/30 uppercase tracking-widest mb-2">
              Total Flagged Contracts
            </p>
            <p className="text-6xl font-mono font-bold text-red-400 leading-none">
              {formatCurrency(data.totalAmount)}
            </p>
          </div>
        </div>

        {/* Stats pills */}
        <div className="flex gap-4 mb-8">
          <div className="px-5 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <span className="text-xs text-white/30 uppercase tracking-wider font-mono">Flagged Orgs</span>
            <span className="text-2xl font-mono font-bold text-white ml-3">{data.orgCount}</span>
          </div>
          <div className="px-5 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <span className="text-xs text-white/30 uppercase tracking-wider font-mono">Connected Politicians</span>
            <span className="text-2xl font-mono font-bold text-white ml-3">{data.politicianCount}</span>
          </div>
        </div>

        {/* Org list */}
        <div className="flex-1 min-h-0">
          <p className="text-xs font-mono text-white/20 uppercase tracking-widest mb-3">
            Flagged Organizations
          </p>
          <div className="space-y-2">
            {data.orgs.slice(0, 5).map((org, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 px-5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm font-mono text-red-500/40 w-6">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-base font-medium text-white/80">
                      {org.name}
                    </p>
                    {org.politicians.length > 0 && (
                      <p className="text-xs text-white/30 mt-0.5">
                        <span className="text-blue-400/50">Connected to:</span>{' '}
                        {org.politicians.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-lg font-mono font-semibold text-red-400/80 tabular-nums">
                  {formatCurrency(org.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Watermark footer */}
        <div className="flex items-end justify-between mt-auto pt-6">
          <p className="text-xs text-white/10 font-mono">
            Generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
          <p className="text-xs text-white/15 font-mono">
            Data: CA Open FI$Cal + CAL-ACCESS
          </p>
        </div>
      </div>
    </div>
  )
})

export default CountyReportCard
