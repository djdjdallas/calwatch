'use client'

import { useState, useRef, useEffect } from 'react'
import { toPng } from 'html-to-image'

function formatAmount(amount) {
  if (!amount || amount === 0) return '$0'
  return '$' + amount.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function buildCsvContent(graphData) {
  if (!graphData) return null

  const { nodes, links } = graphData

  // Entities sheet
  const entityHeader = 'Name,Type,Risk,Total Contract Amount,City,EIN'
  const entityRows = nodes.map((n) => {
    const name = `"${(n.name || '').replace(/"/g, '""')}"`
    const city = `"${(n.city || '').replace(/"/g, '""')}"`
    return `${name},${n.type || ''},${n.risk || ''},${n.totalAmount || 0},${city},${n.ein || ''}`
  })

  // Connections sheet
  const connHeader = 'Source,Target,Type,Amount,Year'
  const connRows = links.map((l) => {
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source
    const targetId = typeof l.target === 'object' ? l.target.id : l.target
    const sourceName = typeof l.source === 'object' ? l.source.name : sourceId
    const targetName = typeof l.target === 'object' ? l.target.name : targetId
    return `"${(sourceName || '').replace(/"/g, '""')}","${(targetName || '').replace(/"/g, '""')}",${l.relationship_type || ''},${l.amount || 0},${l.year || ''}`
  })

  return (
    'ENTITIES\n' +
    entityHeader + '\n' +
    entityRows.join('\n') +
    '\n\nCONNECTIONS\n' +
    connHeader + '\n' +
    connRows.join('\n')
  )
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = filename
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}

export default function ExportButton({ graphRef, graphData }) {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState('')
  const menuRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  async function handlePng() {
    setOpen(false)
    if (!graphRef?.current) return

    try {
      const dataUrl = await toPng(graphRef.current, {
        pixelRatio: 2,
        backgroundColor: '#080808',
      })

      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)

        ctx.save()
        ctx.globalAlpha = 0.4
        ctx.fillStyle = '#ffffff'
        ctx.font = '24px Inter, sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(
          'CalWatch.io \u2014 Data: CA Open FI$Cal + CAL-ACCESS',
          canvas.width - 40,
          canvas.height - 30
        )
        ctx.restore()

        const link = document.createElement('a')
        link.download = `calwatch-${Date.now()}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
      img.src = dataUrl
      showToast('PNG exported')
    } catch (err) {
      console.error('PNG export failed:', err)
    }
  }

  function handleCsv() {
    setOpen(false)
    const content = buildCsvContent(graphData)
    if (!content) return
    downloadFile(content, `calwatch-${Date.now()}.csv`, 'text/csv;charset=utf-8;')
    showToast('CSV exported')
  }

  function handlePdf() {
    setOpen(false)
    if (!graphData) return

    const { nodes, links, stats } = graphData

    // Build a simple HTML report and print to PDF via browser
    const riskCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 }
    nodes.forEach((n) => { riskCounts[n.risk] = (riskCounts[n.risk] || 0) + 1 })

    const typeCounts = {}
    links.forEach((l) => {
      const t = l.relationship_type || 'unknown'
      typeCounts[t] = (typeCounts[t] || 0) + 1
    })

    const entityTableRows = nodes
      .sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0))
      .map((n) => `<tr>
        <td>${n.name || ''}</td>
        <td>${n.type || ''}</td>
        <td style="color:${n.risk === 'HIGH' ? '#ef4444' : n.risk === 'MEDIUM' ? '#eab308' : '#22c55e'}">${n.risk || ''}</td>
        <td style="text-align:right">${formatAmount(n.totalAmount)}</td>
      </tr>`)
      .join('')

    const connTableRows = links
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))
      .slice(0, 200)
      .map((l) => {
        const sName = typeof l.source === 'object' ? l.source.name : l.source
        const tName = typeof l.target === 'object' ? l.target.name : l.target
        return `<tr>
          <td>${sName || ''}</td>
          <td>${tName || ''}</td>
          <td>${(l.relationship_type || '').replace(/_/g, ' ')}</td>
          <td style="text-align:right">${l.amount ? formatAmount(l.amount) : ''}</td>
        </tr>`
      })
      .join('')

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>CalWatch Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; color: #1a1a1a; padding: 40px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 12px; margin-bottom: 24px; }
  .stats { display: flex; gap: 32px; margin-bottom: 24px; padding: 16px; background: #f5f5f5; border-radius: 8px; }
  .stat-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-value { font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
  h2 { font-size: 14px; margin: 24px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; font-weight: 600; padding: 6px 8px; border-bottom: 2px solid #ccc; font-size: 10px; text-transform: uppercase; color: #666; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; }
  tr:hover { background: #fafafa; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd; color: #999; font-size: 10px; }
  @media print { body { padding: 20px; } .stats { background: #f9f9f9; } }
</style>
</head><body>
<h1>CalWatch Report</h1>
<p class="subtitle">California Homelessness Spending Transparency &mdash; ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

<div class="stats">
  <div><div class="stat-label">Entities</div><div class="stat-value">${stats?.entityCount || 0}</div></div>
  <div><div class="stat-label">Connections</div><div class="stat-value">${stats?.connectionCount || 0}</div></div>
  <div><div class="stat-label">High Risk</div><div class="stat-value" style="color:#ef4444">${riskCounts.HIGH}</div></div>
  <div><div class="stat-label">Medium Risk</div><div class="stat-value" style="color:#eab308">${riskCounts.MEDIUM}</div></div>
</div>

<h2>Entities (${nodes.length})</h2>
<table>
  <thead><tr><th>Name</th><th>Type</th><th>Risk</th><th style="text-align:right">Contract Amount</th></tr></thead>
  <tbody>${entityTableRows}</tbody>
</table>

<h2>Connections (top ${Math.min(links.length, 200)} of ${links.length})</h2>
<table>
  <thead><tr><th>From</th><th>To</th><th>Type</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${connTableRows}</tbody>
</table>

<div class="footer">
  CalWatch.io &mdash; Data: CA Open FI$Cal + CAL-ACCESS &mdash; Generated ${new Date().toISOString()}
</div>
</body></html>`

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      showToast('Popup blocked — allow popups to export PDF')
      return
    }
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
    }
    showToast('PDF ready — use Print dialog to save')
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded-md transition-colors"
      >
        Export
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-white/40">
          <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
          <button
            onClick={handlePng}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-white/70 hover:bg-white/5 hover:text-white transition-colors text-left"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-white/40 flex-shrink-0">
              <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="5" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1" />
              <path d="M1 10l3-3 2 2 3-4 4 5" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
            </svg>
            PNG Image
          </button>
          <button
            onClick={handleCsv}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-white/70 hover:bg-white/5 hover:text-white transition-colors text-left"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-white/40 flex-shrink-0">
              <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4 4.5h6M4 7h6M4 9.5h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
            CSV Data
          </button>
          <button
            onClick={handlePdf}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-white/70 hover:bg-white/5 hover:text-white transition-colors text-left"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-white/40 flex-shrink-0">
              <path d="M3 1h5l4 4v8a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" />
              <path d="M8 1v4h4" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            PDF Report
          </button>
        </div>
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
