'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import CaseFileCard from '@/components/CaseFileCard'

function formatCurrency(amount) {
  if (!amount || amount === 0) return '$0'
  return '$' + Math.round(amount).toLocaleString('en-US')
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High Value' },
  { key: 'political', label: 'Political' },
]

export default function CasesClient({ cases }) {
  const [filter, setFilter] = useState('all')
  const [toast, setToast] = useState('')

  const filtered = useMemo(() => {
    if (filter === 'all') return cases
    if (filter === 'critical') return cases.filter((c) => c.severity === 'CRITICAL')
    if (filter === 'high') return cases.filter((c) => c.severity === 'CRITICAL' || c.severity === 'HIGH')
    if (filter === 'political') return cases.filter((c) => c.donationAmount > 0)
    return cases
  }, [cases, filter])

  function handleDownloadAll() {
    const lines = cases.map((c) => {
      return [
        `═══════════════════════════════════════`,
        `CASE FILE #${String(c.caseNumber).padStart(3, '0')}  [${c.severity}]`,
        `═══════════════════════════════════════`,
        `Organization:      ${c.orgName}`,
        `Contract Value:    ${formatCurrency(c.contractAmount)}`,
        `Officer on Record: ${c.officerName} — ${c.officerTitle}`,
        `Political Link:    Donated ${formatCurrency(c.donationAmount)} to ${c.politicianName} (${c.year})`,
        `Status:            ${c.confirmed ? 'CONFIRMED' : 'UNCONFIRMED'}`,
        `Source:            calwatch.io/entity/${c.orgSlug}`,
        '',
      ].join('\n')
    })

    const header = [
      'CALWATCH — CASE FILES',
      `Generated: ${new Date().toISOString()}`,
      `Total Cases: ${cases.length}`,
      `Total Flagged: ${formatCurrency(cases.reduce((s, c) => s + c.contractAmount, 0))}`,
      '',
      'Data Sources: CA Open FI$Cal + CAL-ACCESS',
      'All data from public California government databases.',
      '',
      '',
    ].join('\n')

    const content = header + lines.join('\n')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = 'calwatch-cases.txt'
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
    setToast('Downloaded calwatch-cases.txt')
    setTimeout(() => setToast(''), 2500)
  }

  const totalFlagged = cases.reduce((s, c) => s + c.contractAmount, 0)

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="text-xl font-bold text-white tracking-tight">CalWatch</span>
          <span className="text-[11px] text-white/30 font-medium tracking-wide">Follow the money</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/search" className="text-xs text-red-400/70 hover:text-red-400 transition-colors">
            Search
          </Link>
          <Link href="/map" className="text-xs text-white/40 hover:text-white/70 transition-colors">
            Map
          </Link>
          <Link href="/" className="text-xs text-white/40 hover:text-white/70 transition-colors">
            Graph
          </Link>
          <Link href="/about" className="text-xs text-white/40 hover:text-white/70 transition-colors">
            About
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-4xl sm:text-5xl font-bold font-mono tracking-tight uppercase">
              Case Files
            </h1>
            <span className="case-blink relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
          </div>
          <p className="text-sm text-white/40 max-w-xl">
            {cases.length} confirmed conflicts of interest.{' '}
            <span className="font-mono text-red-400/70">{formatCurrency(totalFlagged)}</span>{' '}
            in flagged contracts tracked.
          </p>
        </div>

        {/* Filter bar + Download */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-1">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filter === key
                    ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                    : 'text-white/40 hover:text-white/60 border border-transparent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={handleDownloadAll}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white/60 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v7m0 0l-2.5-2.5M7 9l2.5-2.5M3 11h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download All Cases
          </button>
        </div>

        {/* Count */}
        <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mb-4">
          Showing {filtered.length} of {cases.length} cases
        </p>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c, i) => (
            <CaseFileCard key={c.caseNumber} {...c} index={i} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-white/30">No cases match this filter.</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-white/[0.04] text-center">
          <p className="text-[10px] text-white/15">
            All data sourced from public California government databases. CA Open FI$Cal + CAL-ACCESS.
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a1a] border border-white/10 rounded-lg px-5 py-3 shadow-xl">
          <p className="text-sm text-white/80">{toast}</p>
        </div>
      )}
    </div>
  )
}
