'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { toPng } from 'html-to-image'
import CountyReportCard from '@/components/CountyReportCard'
import { getCountyReportData } from '@/lib/countyData'

const CA_COUNTIES = [
  'Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa',
  'Contra Costa', 'Del Norte', 'El Dorado', 'Fresno', 'Glenn', 'Humboldt',
  'Imperial', 'Inyo', 'Kern', 'Kings', 'Lake', 'Lassen', 'Los Angeles',
  'Madera', 'Marin', 'Mariposa', 'Mendocino', 'Merced', 'Modoc', 'Mono',
  'Monterey', 'Napa', 'Nevada', 'Orange', 'Placer', 'Plumas', 'Riverside',
  'Sacramento', 'San Benito', 'San Bernardino', 'San Diego', 'San Francisco',
  'San Joaquin', 'San Luis Obispo', 'San Mateo', 'Santa Barbara', 'Santa Clara',
  'Santa Cruz', 'Shasta', 'Sierra', 'Siskiyou', 'Solano', 'Sonoma',
  'Stanislaus', 'Sutter', 'Tehama', 'Trinity', 'Tulare', 'Tuolumne',
  'Ventura', 'Yolo', 'Yuba',
]

function formatCurrency(amount) {
  if (!amount || amount === 0) return '$0'
  return '$' + Math.round(amount).toLocaleString('en-US')
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const cardRef = useRef(null)
  const inputRef = useRef(null)

  const filtered = query.length > 0
    ? CA_COUNTIES.filter((c) =>
        c.toLowerCase().includes(query.toLowerCase())
      )
    : CA_COUNTIES

  const handleSelect = useCallback(async (county) => {
    setQuery(county)
    setShowDropdown(false)
    setLoading(true)
    const data = await getCountyReportData(county)
    setReportData(data)
    setLoading(false)
  }, [])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && filtered.length > 0) {
        handleSelect(filtered[0])
      }
      if (e.key === 'Escape') {
        setShowDropdown(false)
      }
    },
    [filtered, handleSelect]
  )

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleExport() {
    if (!cardRef.current || !reportData) return
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: '#0a0a0f',
      })
      // Download image
      const link = document.createElement('a')
      const slug = reportData.county.toLowerCase().replace(/\s+/g, '-')
      link.download = `calwatch-${slug}.png`
      link.href = dataUrl
      link.click()

      // Copy tweet to clipboard
      const amount = formatCurrency(reportData.totalAmount)
      const tweet = `${reportData.county} County had ${amount} in flagged homelessness contracts connected to ${reportData.politicianCount} politician${reportData.politicianCount !== 1 ? 's' : ''}.\n\nSee the full breakdown: calwatch.io/county/${slug}`
      await navigator.clipboard.writeText(tweet)

      setToast('Image downloaded + tweet copied to clipboard')
      setTimeout(() => setToast(''), 3500)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Nav */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="text-xl font-bold text-white tracking-tight">
            CalWatch
          </span>
          <span className="text-[11px] text-white/30 font-medium tracking-wide">
            Follow the money
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Graph
          </Link>
          <Link
            href="/map"
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Map
          </Link>
          <Link
            href="/about"
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            About
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
          Follow the money.
        </h1>
        <p className="text-lg text-white/40 max-w-xl mx-auto mb-12 leading-relaxed">
          $17.78B in California homelessness contracts. Cross-referenced with
          campaign finance data.
        </p>

        {/* Search input */}
        <div className="relative max-w-lg mx-auto" ref={inputRef}>
          <div className="relative">
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
            >
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search your county (e.g. Los Angeles)"
              className="w-full pl-12 pr-4 py-4 text-base bg-[#111117] border border-white/10 rounded-xl text-white placeholder:text-white/25 outline-none focus:border-white/20 transition-colors"
            />
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#111117] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[300px] overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-white/30">
                  No counties match.
                </p>
              ) : (
                filtered.map((county) => (
                  <button
                    key={county}
                    onClick={() => handleSelect(county)}
                    className="w-full text-left px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors flex items-center justify-between"
                  >
                    <span>{county} County</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-white/15">
                      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-red-500/20 border-t-red-500/60 rounded-full animate-spin" />
            <p className="text-xs text-white/40">Fetching county data...</p>
          </div>
        </div>
      )}

      {/* Report Card */}
      {!loading && reportData && (
        <div className="px-6 pb-16">
          {reportData.totalAmount === 0 ? (
            <div className="max-w-lg mx-auto text-center py-16">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {reportData.county} County: Clean
              </h3>
              <p className="text-sm text-white/40">
                No flagged conflict-of-interest connections found in this
                county&apos;s homelessness contract data.
              </p>
            </div>
          ) : (
            <>
              {/* Scrollable card container */}
              <div className="overflow-x-auto pb-4">
                <div className="min-w-[1600px] mx-auto">
                  <CountyReportCard ref={cardRef} data={reportData} />
                </div>
              </div>

              {/* Export button */}
              <div className="max-w-lg mx-auto mt-8 text-center">
                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 hover:border-red-500/30 rounded-xl transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Export &amp; Share
                </button>
                <p className="text-[11px] text-white/20 mt-3">
                  Downloads image + copies tweet to clipboard
                </p>
              </div>

              {/* Direct link */}
              <div className="max-w-lg mx-auto mt-6 text-center">
                <p className="text-xs text-white/20">
                  Direct link:{' '}
                  <Link
                    href={`/county/${reportData.county.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-cyan-400/50 hover:text-cyan-400/80"
                  >
                    calwatch.io/county/{reportData.county.toLowerCase().replace(/\s+/g, '-')}
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-white/5 py-8 px-6 text-center">
        <p className="text-[10px] text-white/15">
          All data sourced from public California government databases. CA Open FI$Cal + CAL-ACCESS.
        </p>
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
