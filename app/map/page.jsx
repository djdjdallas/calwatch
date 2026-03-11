'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as d3 from 'd3'
import { toPng } from 'html-to-image'
import { loadMapData } from '@/lib/mapData'

const GEOJSON_URL =
  'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/california-counties.geojson'

function formatCurrency(amount) {
  if (!amount || amount === 0) return '$0'
  if (amount >= 1_000_000_000) return '$' + (amount / 1_000_000_000).toFixed(2) + 'B'
  if (amount >= 1_000_000) return '$' + (amount / 1_000_000).toFixed(1) + 'M'
  if (amount >= 1_000) return '$' + (amount / 1_000).toFixed(0) + 'K'
  return '$' + amount.toLocaleString()
}

function getFillColor(amount) {
  if (!amount || amount === 0) return '#1e293b'
  if (amount > 100_000_000) return '#ef4444'
  if (amount > 10_000_000) return '#f97316'
  if (amount > 1_000_000) return '#eab308'
  return '#4a0a0a'
}

function getGlowLevel(amount) {
  if (!amount || amount < 1_000_000) return 0
  if (amount < 10_000_000) return 1
  if (amount < 100_000_000) return 2
  return 3
}

function getSideColor(amount) {
  if (!amount || amount === 0) return '#0f172a'
  if (amount > 100_000_000) return '#991b1b'
  if (amount > 10_000_000) return '#9a3412'
  if (amount > 1_000_000) return '#854d0e'
  return '#1c1917'
}

function getElevation(amount) {
  if (!amount || amount === 0) return 0
  return Math.max(6, Math.min(120, Math.log10(amount) * 18 - 70))
}

function resolveCountyName(props) {
  const raw = props.name || props.NAME || props.NAMELSAD || props.Name || ''
  return raw.replace(/\s+County$/i, '').trim()
}

/**
 * Normalize county name for matching: lowercase, strip "county", trim whitespace.
 */
function normalizeCounty(name) {
  if (!name) return ''
  return name.toLowerCase().replace(/\s*county\s*/gi, '').replace(/\s+/g, ' ').trim()
}

/**
 * Build a lookup from countyData keyed by normalized name.
 */
function buildNormalizedLookup(countyData) {
  const lookup = {}
  Object.entries(countyData).forEach(([key, value]) => {
    lookup[normalizeCounty(key)] = value
  })
  return lookup
}

// ---------------------------------------------------------------------------
// CHOROPLETH MAP (desktop)
// ---------------------------------------------------------------------------

function ChoroplethMap({ countyData, onHover, onClick }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!svgRef.current) return

    const width = 800
    const height = 900

    const svg = d3
      .select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')

    svg.selectAll('*').remove()

    const defs = svg.append('defs')

    // Glow filters
    ;[
      { id: 'glow-3', std: 10, color: '#ef4444', opacity: 0.7 },
      { id: 'glow-2', std: 6, color: '#f97316', opacity: 0.5 },
      { id: 'glow-1', std: 4, color: '#eab308', opacity: 0.3 },
    ].forEach(({ id, std, color, opacity }) => {
      const f = defs.append('filter').attr('id', id)
        .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
      f.append('feDropShadow')
        .attr('dx', 0).attr('dy', 0).attr('stdDeviation', std)
        .attr('flood-color', color).attr('flood-opacity', opacity)
    })

    // Scanline pattern
    const scan = defs.append('pattern')
      .attr('id', 'scanlines').attr('width', 4).attr('height', 4)
      .attr('patternUnits', 'userSpaceOnUse')
    scan.append('line')
      .attr('x1', 0).attr('y1', 0).attr('x2', 4).attr('y2', 0)
      .attr('stroke', 'rgba(255,255,255,0.012)').attr('stroke-width', 1)

    const g = svg.append('g')

    // Build normalized lookup
    const normalizedLookup = buildNormalizedLookup(countyData)

    fetch(GEOJSON_URL)
      .then((res) => res.json())
      .then((geojson) => {
        if (!geojson?.features) return

        const projection = d3.geoMercator().fitSize([width - 40, height - 60], geojson)
        const pathGen = d3.geoPath().projection(projection)

        // Pass 1: draw ALL counties as flat base layer
        const baseLayer = g.append('g')
        geojson.features.forEach((feature) => {
          const p = baseLayer.append('path')
            .attr('d', pathGen(feature))
            .attr('fill', '#1e293b')
            .attr('stroke', '#2a2a4a')
            .attr('stroke-width', 0.4)

          // Hover on unflagged counties shows county name in tooltip area
          p.on('mouseenter', (event) => {
              p.attr('stroke', '#4a4a6a').attr('stroke-width', 0.8)
              onHover(null, null)
            })
            .on('mouseleave', () => {
              p.attr('stroke', '#2a2a4a').attr('stroke-width', 0.4)
            })
        })

        // Pass 2: draw extruded flagged counties ON TOP (sorted north-first for overlap)
        const flaggedFeatures = geojson.features
          .map((feature) => {
            const name = resolveCountyName(feature.properties)
            const data = normalizedLookup[normalizeCounty(name)]
            return { feature, name, data, amount: data?.totalAmount || 0 }
          })
          .filter((f) => f.amount > 0)
          .sort((a, b) => {
            // North first so southern counties draw on top
            const latA = d3.geoCentroid(a.feature)[1]
            const latB = d3.geoCentroid(b.feature)[1]
            return latB - latA
          })

        const extLayer = g.append('g')

        flaggedFeatures.forEach(({ feature, name, data, amount }) => {
          const elev = getElevation(amount)
          const fillColor = getFillColor(amount)
          const sideColor = getSideColor(amount)
          const glowLvl = getGlowLevel(amount)
          const pathStr = pathGen(feature)
          if (!pathStr) return

          const fg = extLayer.append('g').attr('cursor', 'pointer')

          // 3D extrusion: 3 layers, shadow goes down-right, face stays in place
          // Shadow depth capped at 8px to avoid bleeding past state border
          const depth = Math.min(8, Math.max(3, elev * 0.06))

          // Layer 1: deep shadow (furthest back)
          fg.append('path')
            .attr('d', pathStr)
            .attr('fill', 'rgba(0,0,0,0.3)')
            .attr('transform', `translate(${depth}, ${depth * 1.3})`)
            .style('pointer-events', 'none')

          // Layer 2: side face (mid depth)
          fg.append('path')
            .attr('d', pathStr)
            .attr('fill', sideColor)
            .attr('transform', `translate(${depth * 0.5}, ${depth * 0.65})`)
            .style('pointer-events', 'none')

          // Layer 3: county face — NO transform, exact geographic position
          const topFace = fg.append('path')
            .attr('d', pathStr)
            .attr('fill', fillColor)
            .attr('stroke', '#06b6d4')
            .attr('stroke-width', 0.8)
            .attr('stroke-opacity', 0.5)

          if (glowLvl > 0) topFace.attr('filter', `url(#glow-${glowLvl})`)
          if (amount > 50_000_000) topFace.attr('class', 'county-pulse')

          // Hover / click on the whole group
          fg.on('mouseenter', (event) => {
              topFace.attr('stroke', '#ff4444').attr('stroke-width', 2).attr('stroke-opacity', 1)
              onHover(data, event)
            })
            .on('mousemove', (event) => onHover(data, event))
            .on('mouseleave', () => {
              topFace.attr('stroke', '#06b6d4').attr('stroke-width', 0.8).attr('stroke-opacity', 0.5)
              onHover(null, null)
            })
            .on('click', () => onClick(data))
        })

        // Pass 3: labels on top face centroids
        const labelLayer = g.append('g').attr('pointer-events', 'none')
        flaggedFeatures.forEach(({ feature, name, data }) => {
          const [cx, cy] = pathGen.centroid(feature)
          if (isNaN(cx) || isNaN(cy)) return

          labelLayer.append('text')
            .attr('x', cx).attr('y', cy - 6)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white').attr('font-size', '10px')
            .attr('font-family', 'Inter, sans-serif').attr('font-weight', '600')
            .attr('opacity', 0.85)
            .text(name)

          labelLayer.append('text')
            .attr('x', cx).attr('y', cy + 8)
            .attr('text-anchor', 'middle')
            .attr('fill', '#ef4444').attr('font-size', '11px')
            .attr('font-family', 'JetBrains Mono, monospace').attr('font-weight', '500')
            .attr('opacity', 0.9)
            .text(formatCurrency(data.totalAmount))
        })

        // Scanline overlay
        g.append('rect')
          .attr('width', width).attr('height', height)
          .attr('fill', 'url(#scanlines)')
          .attr('pointer-events', 'none')
      })
      .catch((err) => console.error('GeoJSON fetch failed:', err))
  }, [countyData, onHover, onClick])

  return (
    <svg
      ref={svgRef}
      width="800"
      height="900"
      className="max-w-full max-h-full"
      style={{ filter: 'drop-shadow(0 0 40px rgba(255,0,0,0.04))' }}
    />
  )
}

// ---------------------------------------------------------------------------
// HOVER TOOLTIP
// ---------------------------------------------------------------------------

function HoverCard({ data, position }) {
  if (!data || !position) return null

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: position.x + 16, top: position.y - 10 }}
    >
      <div className="bg-[#0c0c0c]/95 backdrop-blur-md border border-red-500/30 rounded-lg px-4 py-3 shadow-2xl min-w-[220px]">
        <p className="text-sm font-semibold text-white mb-1">
          {data.county} County
        </p>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[10px] text-white/40 uppercase tracking-wider">
            Flagged Contracts
          </span>
          <span className="text-sm font-mono font-semibold text-red-400">
            {formatCurrency(data.totalAmount)}
          </span>
        </div>
        <p className="text-[10px] text-white/40 mb-1">
          {data.triangleCount} fraud triangle{data.triangleCount !== 1 ? 's' : ''}
        </p>
        <div className="space-y-1">
          {data.orgs.slice(0, 4).map((org, i) => (
            <div key={i} className="flex items-baseline justify-between text-[11px]">
              <span className="text-white/60 truncate mr-2">{org.name}</span>
              <span className="text-red-400/80 font-mono flex-shrink-0">
                {formatCurrency(org.amount)}
              </span>
            </div>
          ))}
          {data.orgs.length > 4 && (
            <p className="text-[10px] text-white/30">
              +{data.orgs.length - 4} more
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DRILL-DOWN SIDEBAR
// ---------------------------------------------------------------------------

function DrillPanel({ data, onClose }) {
  if (!data) return null

  return (
    <div className="fixed right-0 top-0 h-full w-[400px] bg-[#0a0a0a] border-l border-red-500/10 z-50 overflow-y-auto shadow-2xl">
      <div className="flex items-start justify-between p-5 border-b border-white/10">
        <div>
          <p className="text-[10px] text-red-400 uppercase tracking-widest font-medium mb-1">
            County Intelligence
          </p>
          <h2 className="text-lg font-bold text-white">{data.county} County</h2>
          <p className="text-2xl font-mono font-bold text-red-400 mt-1">
            {formatCurrency(data.totalAmount)}
          </p>
          <p className="text-[11px] text-white/40 mt-1">
            {data.triangleCount} conflict-of-interest connection{data.triangleCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white p-1 ml-2">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="p-5 space-y-3">
        <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium">
          Flagged Organizations
        </p>
        {data.orgs
          .sort((a, b) => b.amount - a.amount)
          .map((org, i) => (
            <div key={i} className="bg-[#111111] border border-white/5 rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <p className="text-sm font-semibold text-white">{org.name}</p>
                <span className="text-xs font-mono text-red-400 ml-2 flex-shrink-0">
                  {formatCurrency(org.amount)}
                </span>
              </div>
              {org.officer && (
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-white/30">Officer:</span>
                  <span className="text-white/60">{org.officer}</span>
                </div>
              )}
              {org.politician && (
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-white/30">Donated to:</span>
                  <span className="text-blue-400/80">{org.politician}</span>
                  {org.donationAmount > 0 && (
                    <span className="text-yellow-500/60 font-mono">
                      ({formatCurrency(org.donationAmount)})
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3 pt-1">
                <span className="px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider bg-red-500/15 text-red-400 rounded">
                  Conflict
                </span>
                {org.sourceUrl && (
                  <a
                    href={org.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-400/60 hover:text-blue-400 flex items-center gap-1"
                  >
                    Source
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M3 7l4-4M3.5 3H7v3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Link to county page */}
      <div className="p-5 border-t border-white/5">
        <Link
          href={`/county/${data.county.toLowerCase().replace(/\s+/g, '-')}`}
          className="block w-full text-center py-2.5 text-xs font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
        >
          View full county report
        </Link>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MOBILE COUNTY LIST
// ---------------------------------------------------------------------------

function MobileCountyList({ countyData, onClick }) {
  const sorted = Object.values(countyData).sort((a, b) => b.totalAmount - a.totalAmount)

  return (
    <div className="md:hidden space-y-2 p-4">
      {sorted.map((data) => (
        <button
          key={data.county}
          onClick={() => onClick(data)}
          className="w-full bg-[#111] border border-white/5 rounded-lg p-4 text-left hover:border-red-500/30 transition-colors"
        >
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-white">{data.county} County</span>
            <span className="text-sm font-mono font-bold text-red-400">
              {formatCurrency(data.totalAmount)}
            </span>
          </div>
          <p className="text-[11px] text-white/40 mt-1">
            {data.triangleCount} triangle{data.triangleCount !== 1 ? 's' : ''} &middot;{' '}
            {data.orgs.length} org{data.orgs.length !== 1 ? 's' : ''}
          </p>
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MAIN PAGE
// ---------------------------------------------------------------------------

export default function MapPage() {
  const [mapData, setMapData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hoverData, setHoverData] = useState(null)
  const [hoverPos, setHoverPos] = useState(null)
  const [drillData, setDrillData] = useState(null)
  const [toast, setToast] = useState('')
  const containerRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    loadMapData().then((data) => {
      setMapData(data)
      setLoading(false)
    })
  }, [])

  const handleHover = useCallback((data, event) => {
    setHoverData(data)
    if (event) {
      setHoverPos({ x: event.clientX, y: event.clientY })
    } else {
      setHoverPos(null)
    }
  }, [])

  const handleClick = useCallback((data) => {
    setDrillData(data)
  }, [])

  async function handleExport() {
    if (!containerRef.current) return
    try {
      const dataUrl = await toPng(containerRef.current, {
        pixelRatio: 2,
        backgroundColor: '#0a0a0f',
      })
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        ctx.save()
        ctx.globalAlpha = 0.5
        ctx.fillStyle = '#ffffff'
        ctx.font = '24px Inter, sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText('CalWatch.io \u2014 Follow The Money', canvas.width - 40, canvas.height - 30)
        ctx.restore()
        const link = document.createElement('a')
        link.download = `calwatch-map-${Date.now()}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
      img.src = dataUrl
      setToast('Exported')
      setTimeout(() => setToast(''), 2000)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Top stats bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-3 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-baseline gap-3 mr-4">
            <h1 className="text-xl font-bold text-white tracking-tight">CalWatch</h1>
            <span className="text-[11px] text-white/30 font-medium tracking-wide">Follow the money</span>
          </Link>

          <div className="hidden sm:flex items-center gap-5">
            <div>
              <p className="text-[9px] text-white/30 uppercase tracking-widest font-medium">Total Tracked</p>
              <p className="text-sm font-mono font-semibold text-white">$17.78B</p>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div>
              <p className="text-[9px] text-white/30 uppercase tracking-widest font-medium">Flagged</p>
              <p className="text-sm font-mono font-semibold text-red-400">
                {mapData ? formatCurrency(mapData.totalFlagged) : '—'}
              </p>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div>
              <p className="text-[9px] text-white/30 uppercase tracking-widest font-medium">Fraud Triangles</p>
              <p className="text-sm font-mono font-semibold text-red-400">{mapData?.triangleCount ?? '—'}</p>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div>
              <p className="text-[9px] text-white/30 uppercase tracking-widest font-medium">Counties</p>
              <p className="text-sm font-mono font-semibold text-red-400">{mapData?.affectedCounties ?? '—'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white border border-white/10 hover:border-white/20 rounded-md transition-colors"
          >
            Export PNG
          </button>
          <Link href="/search" className="text-xs text-red-400/70 hover:text-red-400 transition-colors">
            Search Counties
          </Link>
          <Link href="/" className="text-xs text-white/40 hover:text-white/70 transition-colors">
            Graph
          </Link>
          <Link href="/about" className="text-xs text-white/40 hover:text-white/70 transition-colors">
            About
          </Link>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-red-500/20 border-t-red-500/60 rounded-full animate-spin" />
            <p className="text-xs text-white/40">Loading intelligence...</p>
          </div>
        </div>
      )}

      {/* Map container */}
      {!loading && mapData && (
        <div ref={containerRef} className="absolute inset-0 pt-14 flex items-center justify-center">
          {/* Desktop map */}
          <div className="hidden md:flex items-center justify-center w-full h-full">
            <ChoroplethMap
              countyData={mapData.counties}
              onHover={handleHover}
              onClick={handleClick}
            />
          </div>

          {/* Mobile list */}
          <div className="md:hidden w-full h-full overflow-y-auto pt-4">
            <MobileCountyList countyData={mapData.counties} onClick={handleClick} />
          </div>

          {/* Legend — bottom left */}
          <div className="absolute bottom-6 left-6 z-20 hidden md:block">
            <div className="bg-[#0a0a0f]/80 backdrop-blur-md border border-white/5 rounded-lg px-4 py-3">
              <p className="text-[9px] text-white/30 uppercase tracking-widest font-medium mb-2">
                Flagged Contract Volume
              </p>
              <div className="flex items-end gap-1 mb-1.5">
                <div className="w-7 h-2 rounded-sm bg-[#1e293b]" />
                <div className="w-7 h-3 rounded-sm bg-[#4a0a0a]" />
                <div className="w-7 h-5 rounded-sm bg-[#eab308]" />
                <div className="w-7 h-7 rounded-sm bg-[#f97316]" />
                <div className="w-7 h-10 rounded-sm bg-[#ef4444] county-pulse" />
              </div>
              <div className="flex justify-between text-[9px] text-white/30 font-mono w-[155px]">
                <span>$0</span>
                <span>$1M</span>
                <span>$10M</span>
                <span>$100M+</span>
              </div>
              <p className="text-[8px] text-white/15 mt-2">
                Height = flagged contract amount
              </p>
              <p className="text-[8px] text-white/10 mt-0.5">
                Data: CA Open FI$Cal + CAL-ACCESS
              </p>
            </div>
          </div>

          {/* Classification badge — bottom right */}
          <div className="absolute bottom-6 right-6 z-20 hidden md:block">
            <div className="border border-red-500/20 rounded px-3 py-1.5">
              <p className="text-[9px] text-red-500/40 uppercase tracking-widest font-mono font-medium">
                Public Record Analysis
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hover tooltip */}
      <HoverCard data={hoverData} position={hoverPos} />

      {/* Drill-down panel */}
      {drillData && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setDrillData(null)} />
          <DrillPanel data={drillData} onClose={() => setDrillData(null)} />
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3 shadow-xl">
          <p className="text-sm text-white/80">{toast}</p>
        </div>
      )}
    </div>
  )
}
