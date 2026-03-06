'use client'

import { useState } from 'react'
import { toPng } from 'html-to-image'
import { isDemoMode } from '@/lib/supabase'

export default function ExportButton({ graphRef }) {
  const [toast, setToast] = useState(false)

  async function handleExport() {
    if (!graphRef?.current) return

    try {
      const dataUrl = await toPng(graphRef.current, {
        pixelRatio: 2,
        backgroundColor: '#080808',
      })

      // If demo mode, add watermark
      if (isDemoMode) {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)

          // Watermark
          ctx.save()
          ctx.globalAlpha = 0.3
          ctx.fillStyle = '#ef4444'
          ctx.font = 'bold 48px Inter, sans-serif'
          ctx.translate(canvas.width / 2, canvas.height / 2)
          ctx.rotate(-Math.PI / 6)
          ctx.textAlign = 'center'
          ctx.fillText('DEMO — No real data', 0, 0)
          ctx.restore()

          const link = document.createElement('a')
          link.download = `calwatch-${Date.now()}.png`
          link.href = canvas.toDataURL('image/png')
          link.click()
        }
        img.src = dataUrl
      } else {
        const link = document.createElement('a')
        link.download = `calwatch-${Date.now()}.png`
        link.href = dataUrl
        link.click()
      }

      setToast(true)
      setTimeout(() => setToast(false), 2000)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  return (
    <>
      <button
        onClick={handleExport}
        className="px-3 py-1.5 text-xs font-medium text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded-md transition-colors"
      >
        Export PNG
      </button>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3 shadow-xl">
          <p className="text-sm text-white/80">Captured!</p>
        </div>
      )}
    </>
  )
}
