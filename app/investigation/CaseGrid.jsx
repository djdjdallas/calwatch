'use client'

import { useRef, useState, useEffect } from 'react'
import { gsap, useGSAP, ScrollTrigger } from '@/lib/gsapClient'
import { getCases } from '@/lib/getCases'

const SEVERITY_COLORS = {
  CRITICAL: 'text-red-400 bg-red-500/15 border-red-500/20',
  HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  MEDIUM: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/15',
  FLAGGED: 'text-white/40 bg-white/5 border-white/10',
}

function formatCurrency(amount) {
  if (!amount || amount === 0) return '$0'
  if (amount >= 1_000_000) return '$' + (amount / 1_000_000).toFixed(1) + 'M'
  if (amount >= 1_000) return '$' + (amount / 1_000).toFixed(0) + 'K'
  return '$' + amount.toLocaleString()
}

export default function CaseGrid() {
  const [cases, setCases] = useState([])
  const gridRef = useRef(null)

  useEffect(() => {
    getCases().then((data) => setCases(data))
  }, [])

  useGSAP(
    () => {
      if (cases.length === 0) return
      const cards = gridRef.current?.querySelectorAll('.mini-case')
      if (!cards) return
      gsap.from(cards, {
        opacity: 0,
        y: 20,
        scale: 0.95,
        stagger: 0.06,
        duration: 0.4,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: gridRef.current,
          start: 'top 70%',
          toggleActions: 'play none none none',
        },
      })
    },
    { scope: gridRef, dependencies: [cases] }
  )

  if (cases.length === 0) return null

  // Skip case #4 (LTSC) since we already told that story
  const others = cases.filter(
    (c) => !c.orgName.toLowerCase().includes('ltsc')
  )

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-w-3xl mx-auto"
    >
      {others.slice(0, 12).map((c) => (
        <div
          key={c.caseNumber}
          className="mini-case bg-[#0d0d14] border border-white/[0.06] rounded-lg p-3 text-left"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[8px] font-mono text-white/20 uppercase">
              #{String(c.caseNumber).padStart(3, '0')}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[7px] font-mono font-bold uppercase border ${SEVERITY_COLORS[c.severity] || SEVERITY_COLORS.FLAGGED}`}
            >
              {c.severity}
            </span>
          </div>
          <p className="text-[11px] font-medium text-white/70 truncate mb-1">
            {c.orgName}
          </p>
          <p className="text-sm font-mono font-bold text-red-400/80 tabular-nums">
            {formatCurrency(c.contractAmount)}
          </p>
        </div>
      ))}
    </div>
  )
}
