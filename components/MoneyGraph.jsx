'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'

const NODE_COLORS = {
  nonprofit: '#f97316',       // orange
  company: '#f97316',         // orange
  politician: '#3b82f6',      // blue
  government_agency: '#8b5cf6', // purple
}

function nodeRadius(d) {
  if (!d.totalAmount || d.totalAmount === 0) return 10
  const scale = d3.scaleSqrt().domain([0, 10000000]).range([8, 40])
  return Math.max(8, Math.min(40, scale(d.totalAmount)))
}

function linkColor(d) {
  if (d.relationship_type === 'conflict_of_interest') return 'rgba(239,68,68,0.7)'
  if (d.relationship_type === 'donated_to') return 'rgba(234,179,8,0.5)'
  if (d.relationship_type === 'received_contract') return 'rgba(139,92,246,0.4)'
  if (d.relationship_type === 'officer_of') return 'rgba(59,130,246,0.5)'
  return 'rgba(255,255,255,0.15)'
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

    // Red glow filter for fraud triangle nodes
    const fraudGlow = defs.append('filter').attr('id', 'fraud-glow')
    fraudGlow
      .append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 0)
      .attr('stdDeviation', 6)
      .attr('flood-color', '#ef4444')
      .attr('flood-opacity', 0.6)

    // Subtle glow for HIGH risk nodes (non-fraud-triangle)
    const riskGlow = defs.append('filter').attr('id', 'risk-glow')
    riskGlow
      .append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 0)
      .attr('stdDeviation', 4)
      .attr('flood-color', '#ef4444')
      .attr('flood-opacity', 0.3)

    const g = svg.append('g')

    // Zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        g.selectAll('.node-label').style('display', () =>
          event.transform.k > 1.5 ? 'block' : 'none'
        )
      })

    svg.call(zoom)
    zoomRef.current = zoom

    svg.on('dblclick.zoom', null)
    svg.on('dblclick', () => {
      svg
        .transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity)
    })

    // Debug: log node types to catch miscolored nodes
    const typeCounts = {}
    data.nodes.forEach((n) => {
      typeCounts[n.type || 'undefined'] = (typeCounts[n.type || 'undefined'] || 0) + 1
    })
    console.log('[MoneyGraph] Node type counts:', typeCounts)

    // Tune simulation forces based on node count
    const nodeCount = data.nodes.length
    const linkDistance = nodeCount > 200 ? 80 : nodeCount > 50 ? 100 : 120

    const simulation = d3
      .forceSimulation(data.nodes)
      .force(
        'link',
        d3
          .forceLink(data.links)
          .id((d) => d.id)
          .distance(linkDistance)
      )
      .force('charge', d3.forceManyBody().strength(-400).distanceMax(300))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.08))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05))
      .force('collide', d3.forceCollide().radius((d) => nodeRadius(d) + 5))
      .alphaDecay(0.03)

    // Pre-compute layout so the graph appears already settled
    simulation.stop()
    for (let i = 0; i < 300; i++) simulation.tick()

    simulationRef.current = simulation

    // Links
    const link = g
      .append('g')
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke', linkColor)
      .attr('stroke-width', (d) => {
        if (d.relationship_type === 'conflict_of_interest') return 2.5
        return Math.max(1, Math.min(4, (d.strength_score || 1) * 1.5))
      })
      .attr('stroke-dasharray', (d) =>
        d.relationship_type === 'donated_to' ? '4,2' : 'none'
      )

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
      .attr('stroke', (d) => {
        if (d.isFraudTriangle) return '#ef4444'
        if (d.risk === 'HIGH') return '#ef4444'
        return 'rgba(255,255,255,0.1)'
      })
      .attr('stroke-width', (d) => (d.isFraudTriangle || d.risk === 'HIGH' ? 2 : 1))
      .attr('filter', (d) => {
        if (d.isFraudTriangle) return 'url(#fraud-glow)'
        if (d.risk === 'HIGH') return 'url(#risk-glow)'
        return 'none'
      })

    // Pulsing animation for fraud triangle nodes
    node
      .filter((d) => d.isFraudTriangle)
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

        d3.select(event.currentTarget)
          .select('.node-label')
          .style('display', 'block')
      })
      .on('mouseleave', () => {
        node.style('opacity', 1)
        link.style('opacity', 1)

        const currentTransform = d3.zoomTransform(svg.node())
        if (currentTransform.k <= 1.5) {
          g.selectAll('.node-label').style('display', 'none')
        }
      })
      .on('click', handleNodeClick)

    // Render pre-computed positions immediately (no top-left flash)
    link
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y)

    node.attr('transform', (d) => `translate(${d.x},${d.y})`)

    // Tick handler for interactive dragging
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y)

      node.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    // Restart simulation at low alpha for interactive response
    simulation.alpha(0.1).restart()

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
