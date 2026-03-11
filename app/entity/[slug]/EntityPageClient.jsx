'use client'

import { useState } from 'react'
import Link from 'next/link'

function formatCurrency(amount) {
  if (!amount || amount === 0) return '$0'
  return '$' + Math.round(amount).toLocaleString('en-US')
}

function formatType(type) {
  if (!type) return 'Entity'
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function EntityPageClient({ data, slug }) {
  const [toast, setToast] = useState('')

  function handleShare() {
    const url = `${window.location.origin}/entity/${slug}`
    navigator.clipboard.writeText(url).then(() => {
      setToast('Link copied — the preview card will show automatically when posted')
      setTimeout(() => setToast(''), 3000)
    })
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center">
        <p className="text-white/40 mb-4">Entity not found.</p>
        <Link href="/" className="text-xs text-blue-400 hover:text-blue-300">
          Back to graph
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Nav */}
        <div className="flex items-center justify-between mb-10">
          <Link
            href="/"
            className="text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            &larr; Back to graph
          </Link>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white border border-white/10 hover:border-white/20 rounded-md transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M5 6.5L9 4M5 7.5L9 10M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 9a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM4 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </svg>
            Share
          </button>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-white/10 text-white/60">
                {formatType(data.type)}
              </span>
              {data.isFlagged ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/20">
                  Flagged
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-green-500/10 text-green-500/60">
                  Clean
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold">{data.name}</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="p-5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">
              Total Contracts
            </p>
            <p className={`text-2xl font-mono font-bold ${data.isFlagged ? 'text-red-400' : 'text-white'}`}>
              {formatCurrency(data.totalAmount)}
            </p>
          </div>
          <div className="p-5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">
              Conflict Connections
            </p>
            <p className={`text-2xl font-mono font-bold ${data.coiCount > 0 ? 'text-red-400' : 'text-white/40'}`}>
              {data.coiCount}
            </p>
          </div>
        </div>

        {/* Politicians */}
        {data.isFlagged && data.politicians.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
              Connected Politicians
            </h2>
            <div className="space-y-2">
              {data.politicians.map((name, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                >
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase bg-blue-500/15 text-blue-400">
                    Politician
                  </span>
                  <span className="text-sm text-white/80">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Link to graph */}
        <div className="p-5 rounded-lg border border-white/10 bg-white/[0.02] text-center">
          <p className="text-sm text-white/50 mb-3">
            See this entity in the full network graph
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/15 rounded-lg transition-colors"
          >
            Open Graph View
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-white/[0.06]">
          <p className="text-[10px] text-white/20 text-center">
            Data: CA Open FI$Cal + CAL-ACCESS &mdash; calwatch.io
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
