'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'

const NODE_COLORS = {
  nonprofit: '#3b82f6',
  politician: '#ef4444',
  company: '#f97316',
  government_agency: '#8b5cf6',
}

const RISK_GLOW = {
  HIGH: 'rgba(239,68,68,0.6)',
  MEDIUM: 'rgba(234,179,8,0.3)',
  LOW: 'none',
}

function nodeRadius(d) {
  if (!d.totalAmount || d.totalAmount === 0) return 10
  const scale = d3.scaleSqrt().domain([0, 10000000]).range([8, 40])
  return Math.max(8, Math.min(40, scale(d.totalAmount)))
}

export default function MoneyGraph({
  data,
  onNodeClick,
  selectedEntityId,
  focusEntityId,
}) {
  const svgRef = useRef(null)
  const simulationRef = useRef(null)
  const zoomRef = useRef(null)

  const handleNodeClick = useCallback(
    (event, d) => {
      event.stopPropagation()
      onNodeClick?.(d)
    },
    [onNodeClick]
  )

  // Focus on entity when focusEntityId changes
  useEffect(() => {
    if (!focusEntityId || !svgRef.current || !zoomRef.current) return

    const svg = d3.select(svgRef.current)
    const node = data?.nodes?.find((n) => n.id === focusEntityId)
    if (!node) return

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    svg
      .transition()
      .duration(750)
      .call(
        zoomRef.current.transform,
        d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(2.5)
          .translate(-node.x, -node.y)
      )
  }, [focusEntityId, data])

  useEffect(() => {
    if (!data || !svgRef.current) return

    const container = svgRef.current.parentElement
    const width = container.clientWidth
    const height = container.clientHeight

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)

    svg.selectAll('*').remove()

    const defs = svg.append('defs')

    // Glow filter for high-risk nodes
    const glowFilter = defs.append('filter').attr('id', 'glow')
    glowFilter
      .append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur')
    const feMerge = glowFilter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    const g = svg.append('g')

    // Zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)

        // Show labels only at zoom > 1.5
        g.selectAll('.node-label').style('display', () =>
          event.transform.k > 1.5 ? 'block' : 'none'
        )
      })

    svg.call(zoom)
    zoomRef.current = zoom

    // Double-click to reset zoom
    svg.on('dblclick.zoom', null)
    svg.on('dblclick', () => {
      svg
        .transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity)
    })

    // Build simulation
    const simulation = d3
      .forceSimulation(data.nodes)
      .force(
        'link',
        d3
          .forceLink(data.links)
          .id((d) => d.id)
          .distance(120)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius((d) => nodeRadius(d) + 5))
      .alphaDecay(0.005) // Keep simulation alive longer

    simulationRef.current = simulation

    // Links
    const link = g
      .append('g')
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke', (d) => {
        const targetNode = data.nodes.find((n) => {
          const targetId =
            typeof d.target === 'object' ? d.target.id : d.target
          return n.id === targetId
        })
        return targetNode?.risk === 'HIGH'
          ? 'rgba(239,68,68,0.6)'
          : 'rgba(255,255,255,0.15)'
      })
      .attr('stroke-width', (d) => Math.max(1, (d.strength_score || 1) * 2))

    // Node groups
    const node = g
      .append('g')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.005)
            d.fx = null
            d.fy = null
          })
      )

    // Node circles
    node
      .append('circle')
      .attr('r', (d) => nodeRadius(d))
      .attr('fill', (d) => NODE_COLORS[d.type] || '#666')
      .attr('stroke', (d) =>
        d.risk === 'HIGH' ? '#ef4444' : 'rgba(255,255,255,0.1)'
      )
      .attr('stroke-width', (d) => (d.risk === 'HIGH' ? 2 : 1))
      .attr('filter', (d) => (d.risk === 'HIGH' ? 'url(#glow)' : 'none'))

    // Pulsing animation for high-risk nodes
    node
      .filter((d) => d.risk === 'HIGH')
      .select('circle')
      .each(function pulseAnimate() {
        const el = d3.select(this)
        function pulse() {
          el.transition()
            .duration(1000)
            .attr('stroke-opacity', 1)
            .transition()
            .duration(1000)
            .attr('stroke-opacity', 0.3)
            .on('end', pulse)
        }
        pulse()
      })

    // Labels (hidden by default, shown on zoom > 1.5)
    node
      .append('text')
      .attr('class', 'node-label')
      .text((d) => d.name)
      .attr('x', 0)
      .attr('y', (d) => nodeRadius(d) + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '11px')
      .attr('font-family', 'Inter, sans-serif')
      .style('display', 'none')
      .style('pointer-events', 'none')

    // Hover behavior
    node
      .on('mouseenter', (event, d) => {
        const connectedIds = new Set()
        connectedIds.add(d.id)
        data.links.forEach((l) => {
          const sId = typeof l.source === 'object' ? l.source.id : l.source
          const tId = typeof l.target === 'object' ? l.target.id : l.target
          if (sId === d.id) connectedIds.add(tId)
          if (tId === d.id) connectedIds.add(sId)
        })

        node.style('opacity', (n) => (connectedIds.has(n.id) ? 1 : 0.2))
        link.style('opacity', (l) => {
          const sId = typeof l.source === 'object' ? l.source.id : l.source
          const tId = typeof l.target === 'object' ? l.target.id : l.target
          return sId === d.id || tId === d.id ? 1 : 0.05
        })

        // Show label on hover regardless of zoom
        d3.select(event.currentTarget)
          .select('.node-label')
          .style('display', 'block')
      })
      .on('mouseleave', () => {
        node.style('opacity', 1)
        link.style('opacity', 1)

        // Re-hide labels if not zoomed in
        const currentTransform = d3.zoomTransform(svg.node())
        if (currentTransform.k <= 1.5) {
          g.selectAll('.node-label').style('display', 'none')
        }
      })
      .on('click', handleNodeClick)

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y)

      node.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    return () => {
      simulation.stop()
    }
  }, [data, handleNodeClick])

  return (
    <svg
      ref={svgRef}
      style={{
        width: '100%',
        height: '100%',
        background: '#080808',
        display: 'block',
      }}
    />
  )
}
