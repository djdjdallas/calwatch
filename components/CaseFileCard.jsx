'use client'

import { useState } from 'react'
import Link from 'next/link'

const SEVERITY_STYLES = {
  CRITICAL: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'CRITICAL' },
  HIGH: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', label: 'HIGH' },
  MEDIUM: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20', label: 'MEDIUM' },
  FLAGGED: { bg: 'bg-white/5', text: 'text-white/50', border: 'border-white/10', label: 'FLAGGED' },
}

function formatCurrency(amount) {
  if (!amount || amount === 0) return '$0'
  return '$' + Math.round(amount).toLocaleString('en-US')
}

export default function CaseFileCard({
  caseNumber,
  orgName,
  orgSlug,
  contractAmount,
  officerName,
  officerTitle,
  donationAmount,
  donationSource,
  politicianName,
  year,
  confirmed,
  severity,
  index,
}) {
  const [toast, setToast] = useState(false)
  const sev = SEVERITY_STYLES[severity] || SEVERITY_STYLES.FLAGGED

  function handleShare(e) {
    e.preventDefault()
    e.stopPropagation()
    const text = `${orgName} received ${formatCurrency(contractAmount)} in CA homelessness contracts. Officer donated to ${politicianName}. calwatch.io/entity/${orgSlug}`
    navigator.clipboard.writeText(text).then(() => {
      setToast(true)
      setTimeout(() => setToast(false), 1500)
    })
  }

  return (
    <div
      className="case-card group relative rounded-lg overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{
        background: '#0d0d14',
        border: '1px solid #1e1e2e',
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Red header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-red-500/10 border-b border-red-500/15">
        <span className="text-[11px] font-mono font-bold text-red-400 tracking-widest uppercase">
          Case File #{String(caseNumber).padStart(3, '0')}
        </span>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${sev.bg} ${sev.text} border ${sev.border}`}>
            {sev.label}
          </span>
          {/* Share button */}
          <button
            onClick={handleShare}
            className="p-1 rounded text-white/20 hover:text-white/60 hover:bg-white/5 transition-colors"
            title="Copy share text"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 6.5L9 4M5 7.5L9 10M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 9a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM4 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
      </div>

      {/* CONFIRMED stamp */}
      {confirmed && (
        <div className="confirmed-stamp absolute top-12 right-3 pointer-events-none select-none">
          <span className="text-[28px] font-mono font-black uppercase tracking-[0.15em] text-red-500/20 leading-none">
            Confirmed
          </span>
        </div>
      )}

      {/* Body */}
      <div className="px-4 py-4 space-y-4">
        {/* Organization */}
        <div>
          <p className="text-[9px] font-mono text-white/25 uppercase tracking-[0.2em] mb-1">
            Organization
          </p>
          <p className="text-base font-semibold text-white leading-tight">
            {orgName}
          </p>
        </div>

        {/* Contract value */}
        <div>
          <p className="text-[9px] font-mono text-white/25 uppercase tracking-[0.2em] mb-1">
            Contract Value
          </p>
          <p className="text-2xl font-mono font-bold text-red-400 leading-none tabular-nums">
            {formatCurrency(contractAmount)}
          </p>
        </div>

        {/* Officer */}
        <div>
          <p className="text-[9px] font-mono text-white/25 uppercase tracking-[0.2em] mb-1">
            Officer on Record
          </p>
          {officerName ? (
            <p className="text-sm text-white/70">
              {officerName}
              {officerTitle && (
                <span className="text-white/30"> — {officerTitle}</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-white/30 italic">
              Not disclosed (IRS BMF)
            </p>
          )}
        </div>

        {/* Political connection */}
        <div>
          <p className="text-[9px] font-mono text-white/25 uppercase tracking-[0.2em] mb-1">
            Political Connection
          </p>
          <p className="text-sm text-white/70">
            {donationAmount > 0 ? (
              <>
                Donated{' '}
                <span className="font-mono text-yellow-500/80 tabular-nums">
                  {formatCurrency(donationAmount)}
                </span>
                {donationSource === 'partial_match' && (
                  <span className="text-white/20 text-[9px] ml-1" title="Matched by partial name">~</span>
                )}
              </>
            ) : (
              <span className="text-white/30 italic text-xs" title="CAL-ACCESS minimum reporting threshold is $100">
                Donation amount: not in public record
              </span>
            )}{' '}
            to{' '}
            <span className="text-blue-400/80">{politicianName}</span>
          </p>
          {year && (
            <p className="text-[10px] font-mono text-white/20 mt-0.5">{year}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 pt-2 border-t border-red-500/10">
        <Link
          href={`/entity/${orgSlug}`}
          className="flex items-center justify-between text-[11px] font-mono text-red-400/60 hover:text-red-400 transition-colors uppercase tracking-wider"
        >
          <span>View Full Case</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      {/* Share toast */}
      {toast && (
        <div className="absolute bottom-2 left-2 right-2 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-center z-10">
          <p className="text-[10px] text-white/70">Copied to clipboard</p>
        </div>
      )}
    </div>
  )
}
