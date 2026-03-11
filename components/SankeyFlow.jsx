'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey'

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const NODES = [
  { id: 0, name: 'California Taxpayers' },
  { id: 1, name: 'State Budget' },
  { id: 2, name: 'HCD', fullName: 'Dept of Housing & Community Development' },
  { id: 3, name: 'DHCS', fullName: 'Dept of Health Care Services' },
  { id: 4, name: 'CalOES', fullName: 'CA Office of Emergency Services' },
  { id: 5, name: 'Hope The Mission' },
  { id: 6, name: 'LTSC Community Dev.' },
  { id: 7, name: 'Abbey Road' },
  { id: 8, name: 'Other Nonprofits (148)' },
  { id: 9, name: 'Kevin de León' },
  { id: 10, name: 'Holly Mitchell' },
  { id: 11, name: 'Mark Ridley-Thomas' },
  { id: 12, name: 'Other Politicians (12)' },
]

const LINKS = [
  { source: 0, target: 1, value: 24000000000 },
  { source: 1, target: 2, value: 12000000000 },
  { source: 1, target: 3, value: 8000000000 },
  { source: 1, target: 4, value: 4000000000 },
  { source: 2, target: 5, value: 174677804, flagged: true },
  { source: 2, target: 6, value: 7157180, flagged: true },
  { source: 2, target: 7, value: 7830537, flagged: true },
  { source: 2, target: 8, value: 11000000000 },
  { source: 5, target: 9, value: 150, flagged: true },
  { source: 6, target: 10, value: 500, flagged: true },
  { source: 6, target: 11, value: 200, flagged: true },
  { source: 7, target: 10, value: 300, flagged: true },
  { source: 8, target: 12, value: 5000 },
]

const MAX_PARTICLES = 800
const CYAN = '#06b6d4'
const RED = '#ef4444'

// ---------------------------------------------------------------------------
// Bezier helper — get point on cubic bezier at t
// ---------------------------------------------------------------------------

function cubicBezier(x0, y0, cx0, cy0, cx1, cy1, x1, y1, t) {
  const mt = 1 - t
  const mt2 = mt * mt
  const mt3 = mt2 * mt
  const t2 = t * t
  const t3 = t2 * t
  return {
    x: mt3 * x0 + 3 * mt2 * t * cx0 + 3 * mt * t2 * cx1 + t3 * x1,
    y: mt3 * y0 + 3 * mt2 * t * cy0 + 3 * mt * t2 * cy1 + t3 * y1,
  }
}

// ---------------------------------------------------------------------------
// Compute layout
// ---------------------------------------------------------------------------

function computeLayout(width, height) {
  const paddingLeft = 160
  const paddingRight = 160
  const paddingTop = 60
  const paddingBottom = 40

  const sankeyGen = d3Sankey()
    .nodeId((d) => d.id)
    .nodeWidth(20)
    .nodePadding(30)
    .extent([
      [paddingLeft, paddingTop],
      [width - paddingRight, height - paddingBottom],
    ])

  const graph = sankeyGen({
    nodes: NODES.map((d) => ({ ...d })),
    links: LINKS.map((d) => ({ ...d })),
  })

  // Pre-compute bezier control points for each link
  graph.links.forEach((link) => {
    const x0 = link.source.x1
    const x1 = link.target.x0
    const midX = (x0 + x1) / 2
    link._bezier = {
      x0,
      y0: (link.y0 != null ? link.y0 : (link.source.y0 + link.source.y1) / 2),
      cx0: midX,
      cy0: (link.y0 != null ? link.y0 : (link.source.y0 + link.source.y1) / 2),
      cx1: midX,
      cy1: (link.y1 != null ? link.y1 : (link.target.y0 + link.target.y1) / 2),
      x1,
      y1: (link.y1 != null ? link.y1 : (link.target.y0 + link.target.y1) / 2),
    }
  })

  return graph
}

// ---------------------------------------------------------------------------
// Mobile fallback — static SVG
// ---------------------------------------------------------------------------

function StaticSankey() {
  const [graph, setGraph] = useState(null)

  useEffect(() => {
    setGraph(computeLayout(380, 600))
  }, [])

  if (!graph) return null

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 pt-16">
      <svg viewBox="0 0 380 600" className="w-full max-w-[380px] h-auto">
        {graph.links.map((link, i) => {
          const b = link._bezier
          const pathD = `M${b.x0},${b.y0} C${b.cx0},${b.cy0} ${b.cx1},${b.cy1} ${b.x1},${b.y1}`
          const w = Math.max(1, link.width || 1)
          return (
            <path
              key={i}
              d={pathD}
              fill="none"
              stroke={link.flagged ? 'rgba(239,68,68,0.25)' : 'rgba(6,182,212,0.12)'}
              strokeWidth={w}
            />
          )
        })}
        {graph.nodes.map((node) => (
          <g key={node.id}>
            <rect
              x={node.x0}
              y={node.y0}
              width={node.x1 - node.x0}
              height={Math.max(1, node.y1 - node.y0)}
              fill={LINKS.some((l) => l.flagged && (l.source === node.id || l.target === node.id)) ? '#1a0a0a' : '#0d1117'}
              stroke={LINKS.some((l) => l.flagged && (l.source === node.id || l.target === node.id)) ? '#ef4444' : '#1e2d3d'}
              strokeWidth="0.5"
              strokeOpacity="0.4"
            />
            <text
              x={node.x0 < 200 ? node.x0 - 4 : node.x1 + 4}
              y={(node.y0 + node.y1) / 2}
              dy="0.35em"
              textAnchor={node.x0 < 200 ? 'end' : 'start'}
              fill="white"
              fontSize="7"
              fontFamily="Inter, sans-serif"
            >
              {node.name}
            </text>
          </g>
        ))}
      </svg>
      <p className="text-[10px] text-white/20 font-mono mt-4 text-center">
        For full animation, view on desktop
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SankeyFlow() {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const animRef = useRef(null)
  const graphRef = useRef(null)
  const particlesRef = useRef([])
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const graph = graphRef.current
    if (!canvas || !graph) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)

    // Draw links (static bands)
    graph.links.forEach((link) => {
      const b = link._bezier
      const lw = Math.max(1, link.width || 1)

      ctx.beginPath()
      ctx.moveTo(b.x0, b.y0 - lw / 2)
      ctx.bezierCurveTo(b.cx0, b.cy0 - lw / 2, b.cx1, b.cy1 - lw / 2, b.x1, b.y1 - lw / 2)
      ctx.lineTo(b.x1, b.y1 + lw / 2)
      ctx.bezierCurveTo(b.cx1, b.cy1 + lw / 2, b.cx0, b.cy0 + lw / 2, b.x0, b.y0 + lw / 2)
      ctx.closePath()
      ctx.fillStyle = link.flagged ? 'rgba(239,68,68,0.08)' : 'rgba(6,182,212,0.05)'
      ctx.fill()
    })

    // Draw nodes
    graph.nodes.forEach((node) => {
      const nh = Math.max(2, node.y1 - node.y0)
      const nw = node.x1 - node.x0
      const isFlagged = graph.links.some(
        (l) =>
          l.flagged &&
          ((l.source.id ?? l.source) === node.id || (l.target.id ?? l.target) === node.id)
      )

      ctx.fillStyle = isFlagged ? '#1a0a0a' : '#0d1117'
      ctx.fillRect(node.x0, node.y0, nw, nh)
      ctx.strokeStyle = isFlagged ? 'rgba(239,68,68,0.4)' : 'rgba(30,45,61,0.5)'
      ctx.lineWidth = 1
      ctx.strokeRect(node.x0, node.y0, nw, nh)

      // Labels
      ctx.font = '13px Inter, sans-serif'
      ctx.textBaseline = 'middle'
      const cy = (node.y0 + node.y1) / 2

      // Determine label side by column
      const isLeft = node.x0 < w / 2
      if (isLeft) {
        ctx.textAlign = 'right'
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.fillText(node.name, node.x0 - 8, cy)
      } else {
        ctx.textAlign = 'left'
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.fillText(node.name, node.x1 + 8, cy)
      }
    })

    // Spawn particles
    const particles = particlesRef.current
    graph.links.forEach((link, li) => {
      // Spawn rate proportional to log of value (so tiny donations still get a few particles)
      const rate = Math.max(0.005, Math.min(0.5, Math.log10(link.value + 1) / 30))
      if (Math.random() < rate && particles.length < MAX_PARTICLES) {
        const b = link._bezier
        const lw = Math.max(1, link.width || 1)
        const offset = (Math.random() - 0.5) * lw * 0.6
        particles.push({
          li,
          t: 0,
          speed: 0.003 + Math.random() * 0.004,
          size: link.flagged ? 2.5 : 1.5 + Math.random() * 1.5,
          flagged: !!link.flagged,
          offset,
          trail: link.flagged ? [] : null,
        })
      }
    })

    // Update and draw particles
    const alive = []
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      p.t += p.speed
      if (p.t >= 1) continue

      const link = graph.links[p.li]
      const b = link._bezier
      const pt = cubicBezier(b.x0, b.y0, b.cx0, b.cy0, b.cx1, b.cy1, b.x1, b.y1, p.t)
      pt.y += p.offset

      // Trail for flagged particles
      if (p.trail) {
        p.trail.push({ x: pt.x, y: pt.y })
        if (p.trail.length > 12) p.trail.shift()

        for (let j = 0; j < p.trail.length; j++) {
          const tp = p.trail[j]
          const alpha = (j / p.trail.length) * 0.3
          ctx.beginPath()
          ctx.arc(tp.x, tp.y, p.size * 0.6, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(239,68,68,${alpha})`
          ctx.fill()
        }
      }

      // Draw particle
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = p.flagged ? RED : CYAN
      ctx.globalAlpha = 0.8
      ctx.fill()
      ctx.globalAlpha = 1

      alive.push(p)
    }
    particlesRef.current = alive

    ctx.restore()
    animRef.current = requestAnimationFrame(draw)
  }, [])

  // Setup canvas and start animation
  useEffect(() => {
    if (isMobile) return

    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    function resize() {
      const dpr = window.devicePixelRatio || 1
      const w = container.clientWidth
      const h = container.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      graphRef.current = computeLayout(w, h)
      particlesRef.current = []
    }

    resize()
    animRef.current = requestAnimationFrame(draw)

    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [isMobile, draw])

  if (isMobile) {
    return <StaticSankey />
  }

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Title */}
        <div className="absolute top-16 left-6">
          <p className="text-[11px] font-mono text-cyan-400/70 uppercase tracking-[0.2em]">
            CalWatch — Live Money Flow
          </p>
          <p className="text-[10px] text-white/20 font-mono mt-1">
            $24B tracked &middot; 18 fraud triangles detected
          </p>
        </div>

        {/* Legend */}
        <div className="absolute top-16 right-6">
          <div className="flex items-center gap-4 text-[10px] text-white/30 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Normal flow
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Flagged (conflict of interest)
            </span>
          </div>
        </div>

        {/* Bottom note */}
        <div className="absolute bottom-6 left-6">
          <p className="text-[9px] text-white/10 font-mono">
            Particle speed proportional to dollar volume &middot; Data: CA Open FI$Cal + CAL-ACCESS
          </p>
        </div>
      </div>
    </div>
  )
}
