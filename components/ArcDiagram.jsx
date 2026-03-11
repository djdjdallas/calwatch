'use client'

import { useRef, useEffect, useCallback, useState } from 'react'

const NODE_COLORS = {
  nonprofit: '#f97316',
  company: '#f97316',
  politician: '#3b82f6',
}

const ARC_COLORS = {
  conflict_of_interest: { r: 239, g: 68, b: 68 },
  received_contract: { r: 249, g: 115, b: 22 },
  donated_to: { r: 59, g: 130, b: 246 },
  officer_of: { r: 100, g: 100, b: 140 },
}

const ARC_OPACITY = {
  conflict_of_interest: 0.7,
  received_contract: 0.4,
  donated_to: 0.4,
  officer_of: 0.2,
}

function formatCurrency(amount) {
  if (!amount || amount === 0) return '$0'
  if (amount >= 1_000_000) return '$' + (amount / 1_000_000).toFixed(1) + 'M'
  if (amount >= 1_000) return '$' + (amount / 1_000).toFixed(0) + 'K'
  return '$' + amount.toLocaleString()
}

function abbreviate(name, maxLen = 24) {
  if (!name) return ''
  if (name.length <= maxLen) return name
  // For politician committee names, show first 2 meaningful words + truncate
  const words = name.split(' ')
  // Keep adding words until we exceed maxLen
  let result = ''
  for (const word of words) {
    const next = result ? result + ' ' + word : word
    if (next.length > maxLen && result) break
    result = next
  }
  return result.length < name.length ? result + '...' : result
}

export default function ArcDiagram({ data, onNodeClick, selectedEntityId }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const animRef = useRef(null)
  const layoutRef = useRef(null)
  const hoverRef = useRef(null)
  const progressRef = useRef(0)
  const [tooltip, setTooltip] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const computeLayout = useCallback((w, h) => {
    if (!data || !data.nodes.length) return null

    const padX = 80
    const nodeLineY = h * 0.72
    const topPad = h * 0.08
    const maxArcH = nodeLineY - topPad

    // Classify nodes — some politicians are mis-typed as 'company' in the DB
    // because the load script defaults unknown types to 'company'.
    // Use name patterns to catch them.
    const politicianKeywords = [
      'for senate', 'for assembly', 'for mayor', 'for council',
      'for supervisor', 'committee', 'friends', 'officeholder',
      'krekorian', 'ridley-thomas', 'de leon', 'de kevin',
      'mitchell j', 'hahn',
    ]
    function isPoliticianNode(n) {
      if (n.type === 'politician') return true
      const lower = (n.name || '').toLowerCase()
      return politicianKeywords.some((kw) => lower.includes(kw))
    }

    // Include all non-politician nodes (nonprofits, companies, even gov agencies)
    // so their arcs still connect
    const nonprofits = data.nodes
      .filter((n) => !isPoliticianNode(n))
      .sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0))

    const politicians = data.nodes
      .filter((n) => isPoliticianNode(n))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))

    if (nonprofits.length === 0 && politicians.length === 0) return null

    // Split layout: nonprofits get left 48%, gap 4%, politicians right 48%
    const totalW = w - padX * 2
    const npWidth = totalW * 0.48
    const gapWidth = totalW * 0.04
    const polWidth = totalW * 0.48
    const dividerX = padX + npWidth + gapWidth / 2

    const nodePositions = new Map()

    nonprofits.forEach((node, i) => {
      const spacing = npWidth / Math.max(nonprofits.length - 1, 1)
      nodePositions.set(node.id, {
        x: padX + i * spacing,
        y: nodeLineY,
        node,
        isPolitician: false,
      })
    })

    const polStartX = padX + npWidth + gapWidth
    politicians.forEach((node, i) => {
      const spacing = polWidth / Math.max(politicians.length - 1, 1)
      nodePositions.set(node.id, {
        x: polStartX + i * spacing,
        y: nodeLineY,
        node,
        isPolitician: true,
      })
    })

    const ordered = [...nonprofits, ...politicians]

    // For arc sizing, use SOURCE node's totalAmount (contract value)
    // because COI link.amount is 0 — the dollar value lives on the entity
    const nodeAmountMap = new Map(data.nodes.map((n) => [n.id, n.totalAmount || 0]))
    const allNodeAmounts = data.nodes.map((n) => n.totalAmount || 0).filter((a) => a > 0)
    const maxNodeAmount = Math.max(...allNodeAmounts, 1)
    const logMax = Math.log10(maxNodeAmount)

    // Track arc index per source node to offset overlapping arcs
    const sourceArcCount = new Map()

    // Build arcs
    const arcs = data.links
      .map((link) => {
        const sId = typeof link.source === 'object' ? link.source.id : link.source
        const tId = typeof link.target === 'object' ? link.target.id : link.target
        const sPos = nodePositions.get(sId)
        const tPos = nodePositions.get(tId)
        if (!sPos || !tPos) return null

        // Use the nonprofit side's contract amount for arc sizing
        const sAmount = nodeAmountMap.get(sId) || 0
        const tAmount = nodeAmountMap.get(tId) || 0
        const arcAmount = Math.max(sAmount, tAmount, link.amount || 0, 100)
        const normalized = Math.max(0.08, Math.log10(arcAmount) / logMax)

        // Offset arcs from same source so they fan out instead of stacking
        const countKey = sId
        const idx = sourceArcCount.get(countKey) || 0
        sourceArcCount.set(countKey, idx + 1)
        const fanOffset = idx * 0.06

        const peakHeight = Math.max(50, (normalized + fanOffset) * maxArcH * 0.85)

        // Stroke width: 1 to 6px
        const strokeWidth = 1 + normalized * 5

        return {
          link,
          sX: sPos.x,
          tX: tPos.x,
          baseY: nodeLineY,
          peakY: nodeLineY - peakHeight,
          type: link.relationship_type || 'conflict_of_interest',
          amount: arcAmount,
          width: strokeWidth,
          normalized,
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.peakY - b.peakY) // tallest first

    return { nodePositions, ordered, nonprofits, politicians, arcs, nodeLineY, dividerX, w, h, topPad }
  }, [data])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const layout = layoutRef.current
    if (!canvas || !layout) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const { nodePositions, ordered, nonprofits, politicians, arcs, nodeLineY, dividerX, w, h } = layout
    const hoverId = hoverRef.current
    const progress = progressRef.current

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)

    // Node baseline
    ctx.beginPath()
    ctx.moveTo(50, nodeLineY)
    ctx.lineTo(w - 50, nodeLineY)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Group divider
    ctx.beginPath()
    ctx.setLineDash([4, 4])
    ctx.moveTo(dividerX, nodeLineY - 30)
    ctx.lineTo(dividerX, nodeLineY + 15)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.setLineDash([])

    // Group labels
    ctx.font = '9px Inter, sans-serif'
    ctx.fillStyle = 'rgba(6,182,212,0.5)'
    ctx.textAlign = 'right'
    ctx.fillText('NONPROFITS', dividerX - 12, nodeLineY - 36)
    ctx.fillStyle = 'rgba(59,130,246,0.5)'
    ctx.textAlign = 'left'
    ctx.fillText('POLITICIANS', dividerX + 12, nodeLineY - 36)

    // Connected IDs for hover
    const connectedIds = new Set()
    if (hoverId) {
      connectedIds.add(hoverId)
      arcs.forEach((a) => {
        const sId = typeof a.link.source === 'object' ? a.link.source.id : a.link.source
        const tId = typeof a.link.target === 'object' ? a.link.target.id : a.link.target
        if (sId === hoverId || tId === hoverId) {
          connectedIds.add(sId)
          connectedIds.add(tId)
        }
      })
    }

    // Draw arcs — top 3 by normalized amount get glow
    arcs.forEach((arc, i) => {
      const arcProgress = Math.max(0, Math.min(1, (progress - i * 0.04) / 0.6))
      if (arcProgress <= 0) return

      const sId = typeof arc.link.source === 'object' ? arc.link.source.id : arc.link.source
      const tId = typeof arc.link.target === 'object' ? arc.link.target.id : arc.link.target
      const isConnected = !hoverId || connectedIds.has(sId) || connectedIds.has(tId)

      const color = ARC_COLORS[arc.type] || ARC_COLORS.received_contract
      const baseAlpha = ARC_OPACITY[arc.type] || 0.3
      const alpha = isConnected ? baseAlpha : 0.05

      // Glow on top 3 arcs (they're sorted tallest first)
      if (i < 3 && isConnected) {
        ctx.shadowColor = `rgba(${color.r},${color.g},${color.b},0.5)`
        ctx.shadowBlur = 8
      }

      ctx.beginPath()
      const drawTX = arc.sX + (arc.tX - arc.sX) * arcProgress
      const drawPeakY = arc.baseY + (arc.peakY - arc.baseY) * arcProgress

      ctx.moveTo(arc.sX, arc.baseY)
      ctx.bezierCurveTo(arc.sX, drawPeakY, drawTX, drawPeakY, drawTX, arc.baseY)

      ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${alpha})`
      ctx.lineWidth = arc.width
      if (arc.type === 'donated_to') {
        ctx.setLineDash([4, 4])
      } else {
        ctx.setLineDash([])
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.shadowBlur = 0
    })

    // Draw nodes
    const nodeAlpha = Math.max(0, Math.min(1, (progress - 0.7) / 0.3))
    if (nodeAlpha > 0) {
      ordered.forEach((node) => {
        const pos = nodePositions.get(node.id)
        if (!pos) return
        const { x, y, isPolitician } = pos
        const isHovered = hoverId === node.id
        const isConnected = !hoverId || connectedIds.has(node.id)
        const dimAlpha = isConnected ? nodeAlpha : nodeAlpha * 0.2

        // Tick
        ctx.beginPath()
        ctx.moveTo(x, y - 10)
        ctx.lineTo(x, y + 10)
        ctx.strokeStyle = isHovered
          ? `rgba(255,255,255,${dimAlpha})`
          : `rgba(255,255,255,${0.15 * dimAlpha})`
        ctx.lineWidth = isHovered ? 2 : 1
        ctx.stroke()

        // Dot
        ctx.beginPath()
        ctx.arc(x, y, isHovered ? 5 : 4, 0, Math.PI * 2)
        ctx.fillStyle = NODE_COLORS[node.type] || '#666'
        ctx.globalAlpha = dimAlpha
        ctx.fill()
        ctx.globalAlpha = 1

        // Label — nonprofits rotate -55deg (left), politicians rotate +55deg (right)
        ctx.save()
        ctx.translate(x, y - 16)
        const angle = isPolitician ? (55 * Math.PI) / 180 : -(55 * Math.PI) / 180
        ctx.rotate(angle)
        ctx.font = '11px Inter, sans-serif'
        ctx.fillStyle = `rgba(255,255,255,${isHovered ? 0.9 * dimAlpha : 0.5 * dimAlpha})`
        ctx.textAlign = isPolitician ? 'right' : 'left'
        ctx.fillText(abbreviate(node.name), 0, 0)
        ctx.restore()

        // Amount below tick (nonprofits only)
        if (!isPolitician && node.totalAmount > 0) {
          ctx.font = '10px JetBrains Mono, monospace'
          ctx.fillStyle = `rgba(239,68,68,${0.6 * dimAlpha})`
          ctx.textAlign = 'center'
          ctx.fillText(formatCurrency(node.totalAmount), x, y + 26)
        }
      })
    }

    ctx.restore()
  }, [])

  // Animation
  useEffect(() => {
    if (!data || isMobile) return
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    let resizeHandler

    function resize() {
      const dpr = window.devicePixelRatio || 1
      const w = container.clientWidth
      const h = container.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      layoutRef.current = computeLayout(w, h)
    }

    resize()
    progressRef.current = 0

    const startTime = Date.now()
    function animate() {
      progressRef.current = Math.min(1, (Date.now() - startTime) / 2500)
      draw()
      if (progressRef.current < 1) {
        animRef.current = requestAnimationFrame(animate)
      }
    }
    animRef.current = requestAnimationFrame(animate)

    resizeHandler = () => {
      resize()
      progressRef.current = 1
      draw()
    }
    window.addEventListener('resize', resizeHandler)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resizeHandler)
    }
  }, [data, isMobile, computeLayout, draw])

  // Mouse
  const handleMouseMove = useCallback(
    (e) => {
      const layout = layoutRef.current
      if (!layout) return
      const rect = canvasRef.current.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      let found = null
      layout.ordered.forEach((node) => {
        const pos = layout.nodePositions.get(node.id)
        if (!pos) return
        if (Math.abs(pos.x - mx) < 14 && Math.abs(pos.y - my) < 30) found = node
      })

      hoverRef.current = found?.id || null
      progressRef.current = 1
      draw()

      if (found) {
        const connected = []
        data.links.forEach((l) => {
          const sId = typeof l.source === 'object' ? l.source.id : l.source
          const tId = typeof l.target === 'object' ? l.target.id : l.target
          if (sId === found.id) {
            const n = data.nodes.find((nn) => nn.id === tId)
            if (n) connected.push(n.name)
          }
          if (tId === found.id) {
            const n = data.nodes.find((nn) => nn.id === sId)
            if (n) connected.push(n.name)
          }
        })
        setTooltip({ name: found.name, type: found.type, amount: found.totalAmount, connected })
      } else {
        setTooltip(null)
      }
    },
    [data, draw]
  )

  const handleClick = useCallback(
    (e) => {
      const layout = layoutRef.current
      if (!layout) return
      const rect = canvasRef.current.getBoundingClientRect()
      const mx = e.clientX - rect.left

      let found = null
      layout.ordered.forEach((node) => {
        const pos = layout.nodePositions.get(node.id)
        if (pos && Math.abs(pos.x - mx) < 14) found = node
      })
      if (found) onNodeClick?.(found)
    },
    [onNodeClick]
  )

  const handleMouseLeave = useCallback(() => {
    hoverRef.current = null
    setTooltip(null)
    progressRef.current = 1
    draw()
  }, [draw])

  // Mobile fallback
  if (isMobile) {
    const sorted = (data?.nodes || [])
      .filter((n) => n.type !== 'government_agency')
      .sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0))

    return (
      <div className="w-full h-full overflow-y-auto pt-16 pb-20 px-4 bg-[#0a0a0f]">
        <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mb-4">
          {sorted.length} entities in view
        </p>
        <div className="space-y-1.5">
          {sorted.map((node) => (
            <button
              key={node.id}
              onClick={() => onNodeClick?.(node)}
              className="w-full flex items-center justify-between py-2.5 px-3 rounded bg-white/[0.02] border border-white/[0.04] hover:border-white/10 transition-colors text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: NODE_COLORS[node.type] || '#666' }} />
                <span className="text-xs text-white/70 truncate">{node.name}</span>
              </div>
              {node.totalAmount > 0 && (
                <span className="text-[10px] font-mono text-red-400/70 ml-2 flex-shrink-0">{formatCurrency(node.totalAmount)}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full h-full pb-20">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ background: '#0a0a0f' }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
      />

      {/* Tooltip */}
      {tooltip && (
        <div className="absolute top-16 right-6 z-10 bg-[#0c0c0c]/95 backdrop-blur-md border border-white/10 rounded-lg px-4 py-3 shadow-2xl min-w-[200px] max-w-[280px] pointer-events-none">
          <p className="text-sm font-semibold text-white mb-1">{tooltip.name}</p>
          <span
            className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium uppercase mb-2"
            style={{
              backgroundColor: tooltip.type === 'politician' ? 'rgba(59,130,246,0.15)' : 'rgba(249,115,22,0.15)',
              color: tooltip.type === 'politician' ? '#3b82f6' : '#f97316',
            }}
          >
            {tooltip.type?.replace(/_/g, ' ') || 'entity'}
          </span>
          {tooltip.amount > 0 && (
            <p className="text-xs text-white/50 mb-1">
              Contracts: <span className="font-mono text-red-400">{formatCurrency(tooltip.amount)}</span>
            </p>
          )}
          {tooltip.connected.length > 0 && (
            <div className="mt-1">
              <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Connected to</p>
              {tooltip.connected.slice(0, 5).map((name, i) => (
                <p key={i} className="text-[11px] text-white/50 truncate">{name}</p>
              ))}
              {tooltip.connected.length > 5 && (
                <p className="text-[10px] text-white/20">+{tooltip.connected.length - 5} more</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-24 left-6 z-10 bg-[#0a0a0f]/80 backdrop-blur-md border border-white/5 rounded-lg px-4 py-3">
        <div className="space-y-1.5 text-[10px] text-white/40">
          <div className="flex items-center gap-2">
            <span className="w-5 h-0.5 bg-red-500 rounded" />
            <span>Conflict of Interest</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-0.5 border-t border-dashed border-blue-400" />
            <span>Donation</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-0.5 bg-orange-500 rounded" />
            <span>Contract</span>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-white/5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>Nonprofit</span>
            <span className="w-2 h-2 rounded-full bg-blue-500 ml-2" />
            <span>Politician</span>
          </div>
        </div>
      </div>
    </div>
  )
}
