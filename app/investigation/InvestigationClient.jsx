'use client'

import { useRef, useEffect, useState, Suspense, lazy } from 'react'
import Link from 'next/link'
import * as d3 from 'd3'
import { gsap, useGSAP, ScrollTrigger, SplitText, DrawSVGPlugin } from '@/lib/gsapClient'

const GEOJSON_URL =
  'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/california-counties.geojson'

const CaseGrid = lazy(() => import('./CaseGrid'))

const LTSC = {
  name: 'LTSC Community Development',
  contractAmount: 7_157_180,
  fiscalYears: '2019-2023',
  slug: 'ltsc-community-development',
}

const RIDLEY_THOMAS = {
  name: 'Mark Ridley-Thomas',
  convictionYear: 2023,
  charges: 'federal corruption charges',
  source: 'U.S. Department of Justice, 2023',
}

const CONNECTIONS = [
  { label: '$7,157,180 in contracts', type: 'contract' },
  { label: 'Officer donated to Holly Mitchell For Senate', type: 'donation' },
  { label: 'Officer donated to Committee Ridley-Thomas', type: 'donation' },
]

function formatCurrency(amount) {
  if (!amount || amount === 0) return '$0'
  return '$' + Math.round(amount).toLocaleString('en-US')
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(query)
    setMatches(mql.matches)
    const handler = (e) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])
  return matches
}

// ---------------------------------------------------------------------------
// Section 1: Hero — bigger, tighter, with subtext
// ---------------------------------------------------------------------------

function Section1() {
  const containerRef = useRef(null)
  const h1Ref = useRef(null)
  const h2Ref = useRef(null)
  const subRef = useRef(null)

  useGSAP(
    () => {
      const split = new SplitText(h1Ref.current, { type: 'chars' })
      gsap.from(split.chars, {
        opacity: 0,
        y: 20,
        stagger: 0.03,
        duration: 0.5,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      })
      gsap.from(h2Ref.current, {
        opacity: 0,
        y: 30,
        duration: 0.8,
        delay: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      })
      gsap.from(subRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.8,
        delay: 1.5,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      })
    },
    { scope: containerRef }
  )

  return (
    <section
      ref={containerRef}
      className="relative min-h-[75vh] flex flex-col items-center justify-center px-6 text-center"
    >
      <h1
        ref={h1Ref}
        className="text-5xl sm:text-6xl md:text-7xl font-bold text-white leading-tight max-w-4xl"
      >
        California spent <span className="whitespace-nowrap">$24 billion</span> on homelessness.
      </h1>
      <p
        ref={h2Ref}
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-red-400 mt-6"
      >
        It got worse.
      </p>
      <p
        ref={subRef}
        className="text-base sm:text-lg text-slate-400 mt-8 max-w-lg"
      >
        We connected the databases. Here&apos;s what we found.
      </p>

      <div className="absolute bottom-10 flex flex-col items-center gap-2 animate-bounce">
        <span className="text-[10px] text-white/20 uppercase tracking-widest font-mono">
          Scroll
        </span>
        <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
          <path
            d="M8 4v12m0 0l-4-4m4 4l4-4"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Section 2: Sticky map + scroll panels (3 panels = 300vh)
// ---------------------------------------------------------------------------

function Section2({ isMobile }) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const laRef = useRef(null)
  const pinRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const vw = 500
    const vh = 600
    const projection = d3.geoAlbers()
      .center([0, 37.5])
      .rotate([120, 0])
      .parallels([34, 40.5])
      .scale(3000)
      .translate([vw / 2, vh / 2])

    const pathGen = d3.geoPath().projection(projection)
    const g = svg.append('g')

    fetch(GEOJSON_URL)
      .then((res) => res.json())
      .then((geojson) => {
        if (!geojson?.features) return
        g.selectAll('path.county')
          .data(geojson.features)
          .join('path')
          .attr('class', (f) => {
            const name = (f.properties.name || '').replace(/\s+County$/i, '')
            return name === 'Los Angeles' ? 'county la-county' : 'county'
          })
          .attr('d', pathGen)
          .attr('fill', '#1e2d3d')
          .attr('stroke', '#2a2a4a')
          .attr('stroke-width', 0.5)

        const laPath = g.select('.la-county').node()
        if (laPath && laRef.current) laRef.current.setAttribute('d', laPath.getAttribute('d'))

        const laFeature = geojson.features.find(
          (f) => (f.properties.name || '').replace(/\s+County$/i, '') === 'Los Angeles'
        )
        if (laFeature && pinRef.current) {
          const [cx, cy] = pathGen.centroid(laFeature)
          pinRef.current.setAttribute('transform', `translate(${cx}, ${cy})`)
        }
        setMapReady(true)
      })
      .catch((err) => console.error('GeoJSON fetch failed:', err))
  }, [])

  useGSAP(
    () => {
      if (isMobile || !mapReady) return
      if (laRef.current) {
        gsap.to(laRef.current, {
          fill: '#ef4444',
          filter: 'drop-shadow(0 0 12px rgba(239,68,68,0.5))',
          duration: 0.6,
          scrollTrigger: { trigger: '#scroll-panel-b', start: 'top center', toggleActions: 'play none none reverse' },
        })
      }
      if (pinRef.current) {
        gsap.from(pinRef.current, {
          y: -60, opacity: 0, scale: 0, duration: 0.6, ease: 'back.out(2)',
          scrollTrigger: { trigger: '#scroll-panel-c', start: 'top center', toggleActions: 'play none none reverse' },
        })
      }
    },
    { scope: containerRef, dependencies: [isMobile, mapReady] }
  )

  const mapPanel = (
    <div className="relative flex items-center justify-center" style={{ width: 'min(420px, 90%)' }}>
      {/* Red radial glow behind map */}
      <div
        className="absolute inset-0 rounded-full opacity-20 county-pulse"
        style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)' }}
      />
      <svg ref={svgRef} viewBox="0 0 500 600" className="w-full h-auto relative" xmlns="http://www.w3.org/2000/svg" />
      <svg viewBox="0 0 500 600" className="absolute inset-0 w-full h-auto pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <path ref={laRef} d="" fill="#1e2d3d" stroke="#2a2a4a" strokeWidth="0.5" />
        <g ref={pinRef} transform="translate(250, 400)">
          <circle r="6" fill="#ef4444" />
          <circle r="12" fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.3">
            <animate attributeName="r" from="8" to="20" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
          </circle>
          <text y="-16" textAnchor="middle" fill="white" fontSize="8" fontFamily="JetBrains Mono, monospace">LTSC</text>
        </g>
      </svg>
    </div>
  )

  if (isMobile) {
    return (
      <section ref={containerRef} className="px-6 py-16 space-y-16">
        <div className="text-center">
          <p className="text-lg text-white/60 mb-6">152,000+ contracts across 58 counties</p>
          {mapPanel}
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-red-400">$191M</p>
          <p className="text-sm text-white/40 mt-2">flagged in Los Angeles alone</p>
        </div>
        <div className="text-center">
          <p className="text-lg text-white/60">One organization.</p>
          <p className="text-3xl font-mono font-bold text-red-400 mt-2">$7.1M</p>
        </div>
      </section>
    )
  }

  return (
    <section ref={containerRef} className="relative" style={{ height: '300vh' }}>
      <div className="flex h-full">
        <div className="w-1/2 sticky top-0 h-screen flex items-center justify-center px-8">
          {mapPanel}
        </div>
        <div className="w-1/2">
          <div id="scroll-panel-a" className="h-screen flex items-center px-8">
            <div>
              <p className="text-sm font-mono text-cyan-400/60 uppercase tracking-widest mb-3">The Scale</p>
              <p className="text-2xl text-white/80 leading-relaxed">152,000+ contracts across 58 counties. $17.78 billion tracked.</p>
            </div>
          </div>
          <div id="scroll-panel-b" className="h-screen flex items-center px-8">
            <div>
              <p className="text-sm font-mono text-cyan-400/60 uppercase tracking-widest mb-3">The Hotspot</p>
              <p className="text-4xl font-mono font-bold text-red-400 mb-3">$191M</p>
              <p className="text-lg text-white/60">flagged in Los Angeles County alone.</p>
            </div>
          </div>
          <div id="scroll-panel-c" className="h-screen flex items-center px-8">
            <div>
              <p className="text-sm font-mono text-cyan-400/60 uppercase tracking-widest mb-3">The Target</p>
              <p className="text-lg text-white/80 leading-relaxed">
                One organization. <span className="font-mono text-red-400 font-bold">$7.1M</span> in homelessness contracts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Section 3: LTSC card — with grid background and bigger card
// ---------------------------------------------------------------------------

function Section3() {
  const containerRef = useRef(null)
  const cardRef = useRef(null)
  const counterRef = useRef(null)
  const sourceRef = useRef(null)

  useGSAP(
    () => {
      gsap.from(cardRef.current, {
        x: 100, opacity: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: containerRef.current, start: 'top 60%', toggleActions: 'play none none none' },
      })
      const counter = { val: 0 }
      gsap.to(counter, {
        val: LTSC.contractAmount, duration: 2, ease: 'power2.out',
        scrollTrigger: { trigger: containerRef.current, start: 'top 60%', toggleActions: 'play none none none' },
        onUpdate: () => {
          if (counterRef.current) counterRef.current.textContent = '$' + Math.round(counter.val).toLocaleString('en-US')
        },
      })
      if (sourceRef.current) {
        const split = new SplitText(sourceRef.current, { type: 'chars' })
        gsap.from(split.chars, {
          opacity: 0, stagger: 0.02, duration: 0.3,
          delay: 2.2,
          scrollTrigger: { trigger: containerRef.current, start: 'top 60%', toggleActions: 'play none none none' },
        })
      }
    },
    { scope: containerRef }
  )

  return (
    <section
      ref={containerRef}
      className="min-h-[60vh] py-24 flex items-center justify-center px-6"
      style={{
        backgroundImage: 'linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    >
      <div ref={cardRef} className="w-full" style={{ maxWidth: '520px' }}>
        <p className="text-sm font-mono text-cyan-400/60 uppercase tracking-widest mb-6">The Organization</p>
        <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-10">
          <p className="text-sm font-mono text-white/25 uppercase tracking-[0.2em] mb-2">Organization</p>
          <h2 className="text-3xl font-bold text-white mb-6">{LTSC.name}</h2>
          <p className="text-sm font-mono text-white/25 uppercase tracking-[0.2em] mb-2">Total Contract Value</p>
          <p ref={counterRef} className="text-5xl font-mono font-bold text-red-400 mb-6 tabular-nums">$0</p>
          <p className="text-sm font-mono text-white/25 uppercase tracking-[0.2em] mb-2">Fiscal Years</p>
          <p className="text-lg text-white/60 font-mono">{LTSC.fiscalYears}</p>
          <p ref={sourceRef} className="text-[11px] text-cyan-400/40 font-mono mt-8">
            Source: CA Open FI$Cal — Fiscal Year 2019-2023
          </p>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Section 4: The Politician
// ---------------------------------------------------------------------------

function Section4() {
  const containerRef = useRef(null)
  const badgeRef = useRef(null)
  const textRef = useRef(null)

  useGSAP(
    () => {
      gsap.from(badgeRef.current, {
        scale: 0, rotation: -15, duration: 0.5, ease: 'back.out(2)',
        scrollTrigger: { trigger: containerRef.current, start: 'top 50%', toggleActions: 'play none none none' },
      })
      gsap.from(textRef.current, {
        opacity: 0, y: 20, duration: 0.8, delay: 0.6,
        scrollTrigger: { trigger: containerRef.current, start: 'top 50%', toggleActions: 'play none none none' },
      })
    },
    { scope: containerRef }
  )

  return (
    <section ref={containerRef} className="min-h-[60vh] py-24 flex items-center justify-center px-6">
      <div className="max-w-xl w-full text-center">
        <p className="text-sm font-mono text-cyan-400/60 uppercase tracking-widest mb-8">The Politician</p>
        <div className="w-28 h-28 rounded-full bg-white/[0.04] border border-white/[0.08] mx-auto mb-4 flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-white/10">
            <circle cx="12" cy="8" r="4" fill="currentColor" />
            <path d="M4 20c0-4 4-7 8-7s8 3 8 7" fill="currentColor" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">{RIDLEY_THOMAS.name}</h2>
        <div ref={badgeRef} className="inline-block px-5 py-2 rounded-md bg-red-500/20 border-2 border-red-500/40 mb-8">
          <span className="text-lg font-mono font-black text-red-400 uppercase tracking-widest">Convicted</span>
        </div>
        <p ref={textRef} className="text-lg text-white/60 leading-relaxed mb-4">
          Ridley-Thomas was found guilty in <span className="text-white font-semibold">{RIDLEY_THOMAS.convictionYear}</span>{' '}
          of {RIDLEY_THOMAS.charges} for <span className="text-red-400">steering Los Angeles city contracts in exchange for political favors</span>.
        </p>
        <p className="text-[10px] text-white/15 font-mono">Source: {RIDLEY_THOMAS.source}</p>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Section 5: Evidence Board — bigger nodes, dossier style, EXHIBIT A watermark
// ---------------------------------------------------------------------------

function Section5() {
  const containerRef = useRef(null)
  const line1Ref = useRef(null)
  const line2Ref = useRef(null)
  const line3Ref = useRef(null)
  const label1Ref = useRef(null)
  const label2Ref = useRef(null)
  const label3Ref = useRef(null)

  useGSAP(
    () => {
      const lines = [line1Ref, line2Ref, line3Ref]
      const labels = [label1Ref, label2Ref, label3Ref]
      lines.forEach((ref, i) => {
        if (!ref.current) return
        gsap.fromTo(ref.current, { drawSVG: '0%' }, {
          drawSVG: '100%', duration: 1, ease: 'power2.inOut',
          scrollTrigger: { trigger: containerRef.current, start: `top+=${i * 120} 50%`, toggleActions: 'play none none none' },
        })
      })
      labels.forEach((ref, i) => {
        if (!ref.current) return
        gsap.from(ref.current, {
          opacity: 0, y: 10, duration: 0.5,
          scrollTrigger: { trigger: containerRef.current, start: `top+=${i * 120 + 60} 50%`, toggleActions: 'play none none none' },
        })
      })
    },
    { scope: containerRef }
  )

  return (
    <section ref={containerRef} className="min-h-[60vh] py-24 flex items-center justify-center px-6 relative overflow-hidden">
      {/* EXHIBIT A watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style={{ transform: 'rotate(-15deg)' }}>
        <span className="text-[120px] sm:text-[160px] font-mono font-black text-white/[0.03] uppercase tracking-widest">
          Exhibit A
        </span>
      </div>

      <div className="max-w-3xl w-full relative">
        <p className="text-sm font-mono text-cyan-400/60 uppercase tracking-widest mb-8 text-center">The Connection</p>

        <svg viewBox="0 0 700 320" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="line-glow">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ef4444" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Left node: LTSC — dossier style */}
          <rect x="10" y="30" width="200" height="90" rx="6" fill="#0d1117" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.3" />
          <text x="110" y="52" textAnchor="middle" fill="#06b6d4" fontSize="9" fontFamily="JetBrains Mono, monospace" letterSpacing="0.15em">NONPROFIT</text>
          <text x="110" y="72" textAnchor="middle" fill="white" fontSize="14" fontWeight="700" fontFamily="Inter, sans-serif">LTSC Community</text>
          <text x="110" y="90" textAnchor="middle" fill="white" fontSize="14" fontWeight="700" fontFamily="Inter, sans-serif">Development</text>
          <text x="110" y="110" textAnchor="middle" fill="#ef4444" fontSize="11" fontFamily="JetBrains Mono, monospace">$7,157,180</text>

          {/* Right node: Ridley-Thomas */}
          <rect x="490" y="30" width="200" height="90" rx="6" fill="#0d1117" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.3" />
          <text x="590" y="52" textAnchor="middle" fill="#06b6d4" fontSize="9" fontFamily="JetBrains Mono, monospace" letterSpacing="0.15em">POLITICIAN</text>
          <text x="590" y="75" textAnchor="middle" fill="white" fontSize="14" fontWeight="700" fontFamily="Inter, sans-serif">Mark Ridley-Thomas</text>
          <text x="590" y="95" textAnchor="middle" fill="#ef4444" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="700">CONVICTED 2023</text>

          {/* Line 1: contracts (red, solid) */}
          <line ref={line1Ref} x1="210" y1="75" x2="490" y2="75" stroke="#ef4444" strokeWidth="2" filter="url(#line-glow)" />
          <g ref={label1Ref}>
            <rect x="270" y="55" width="160" height="24" rx="4" fill="#0a0a0f" stroke="#ef4444" strokeWidth="0.5" strokeOpacity="0.2" />
            <text x="350" y="71" textAnchor="middle" fill="#ef4444" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="600">$7,157,180</text>
          </g>
          <text x="350" y="48" textAnchor="middle" fill="white" fontSize="8" fontFamily="JetBrains Mono, monospace" opacity="0.3">homelessness contracts</text>

          {/* Line 2: donation (yellow dashed) */}
          <line ref={line2Ref} x1="210" y1="180" x2="490" y2="180" stroke="#eab308" strokeWidth="1.5" strokeDasharray="6,3" />
          <g ref={label2Ref}>
            <rect x="230" y="160" width="240" height="22" rx="4" fill="#0a0a0f" />
            <text x="350" y="175" textAnchor="middle" fill="#eab308" fontSize="9" fontFamily="JetBrains Mono, monospace">{CONNECTIONS[1].label}</text>
          </g>

          {/* Line 3: donation (blue dashed — reverse direction) */}
          <line ref={line3Ref} x1="490" y1="250" x2="210" y2="250" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="6,3" />
          <g ref={label3Ref}>
            <rect x="230" y="230" width="240" height="22" rx="4" fill="#0a0a0f" />
            <text x="350" y="245" textAnchor="middle" fill="#3b82f6" fontSize="9" fontFamily="JetBrains Mono, monospace">{CONNECTIONS[2].label}</text>
          </g>

          <text x="350" y="285" textAnchor="middle" fill="white" fontSize="8" fontFamily="JetBrains Mono, monospace" opacity="0.15">Campaign donations flow back</text>
        </svg>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Section 6: "This Is Not Unique"
// ---------------------------------------------------------------------------

function Section6() {
  const containerRef = useRef(null)
  const counterRef = useRef(null)

  useGSAP(
    () => {
      const counter = { val: 0 }
      gsap.to(counter, {
        val: 17, duration: 1.5, ease: 'power2.out',
        scrollTrigger: { trigger: containerRef.current, start: 'top 60%', toggleActions: 'play none none none' },
        onUpdate: () => { if (counterRef.current) counterRef.current.textContent = Math.round(counter.val) },
      })
    },
    { scope: containerRef }
  )

  return (
    <section ref={containerRef} className="min-h-[60vh] py-24 flex items-center justify-center px-6">
      <div className="max-w-4xl w-full text-center">
        <p className="text-sm font-mono text-cyan-400/60 uppercase tracking-widest mb-6">The Pattern</p>
        <p className="text-lg text-white/50 mb-2">This is not unique.</p>
        <p className="text-6xl sm:text-7xl font-mono font-bold text-white mb-2">
          <span ref={counterRef}>0</span>
        </p>
        <p className="text-lg text-white/40 mb-12">other connections found.</p>
        <Suspense
          fallback={<div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>}
        >
          <CaseGrid />
        </Suspense>
        <Link href="/cases" className="inline-flex items-center gap-2 px-6 py-3 mt-10 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 rounded-xl transition-colors">
          View All Case Files
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Section 7: CTA
// ---------------------------------------------------------------------------

function Section7() {
  const containerRef = useRef(null)
  const headlineRef = useRef(null)

  useGSAP(
    () => {
      const split = new SplitText(headlineRef.current, { type: 'chars' })
      gsap.from(split.chars, {
        opacity: 0, y: 30, stagger: 0.04, duration: 0.6, ease: 'power2.out',
        scrollTrigger: { trigger: containerRef.current, start: 'top 60%', toggleActions: 'play none none none' },
      })
    },
    { scope: containerRef }
  )

  return (
    <section ref={containerRef} className="min-h-[60vh] py-24 flex flex-col items-center justify-center px-6 text-center">
      <h2 ref={headlineRef} className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-10">Follow the money.</h2>
      <div className="flex flex-col sm:flex-row gap-4 mb-10">
        <Link href="/search" className="px-6 py-3 text-sm font-medium text-white bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 rounded-xl transition-colors">Search Your County</Link>
        <Link href="/map" className="px-6 py-3 text-sm font-medium text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors">View The Map</Link>
      </div>
      <p className="text-[11px] text-white/15 font-mono max-w-md">Data sources: CA Open FI$Cal, CAL-ACCESS, IRS Form 990 BMF</p>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Vertical progress line
// ---------------------------------------------------------------------------

function ProgressLine() {
  const lineRef = useRef(null)

  useGSAP(() => {
    if (!lineRef.current) return
    gsap.fromTo(lineRef.current, { scaleY: 0 }, {
      scaleY: 1,
      ease: 'none',
      scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 0.5 },
    })
  })

  return (
    <div
      ref={lineRef}
      className="fixed left-10 hidden md:block z-40 pointer-events-none"
      style={{
        top: '10%',
        width: '2px',
        height: '80%',
        background: 'linear-gradient(to bottom, transparent, #ef4444 20%, #ef4444 80%, transparent)',
        transformOrigin: 'top',
        willChange: 'transform',
        opacity: 0.3,
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function InvestigationClient() {
  const isMobile = useMediaQuery('(max-width: 768px)')

  return (
    <div className="bg-[#0a0a0f] text-white min-h-screen overflow-x-hidden">
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="text-lg font-bold text-white tracking-tight">CalWatch</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/cases" className="text-xs text-red-400/70 hover:text-red-400 transition-colors">Cases</Link>
          <Link href="/search" className="text-xs text-white/40 hover:text-white/70 transition-colors">Search</Link>
          <Link href="/map" className="text-xs text-white/40 hover:text-white/70 transition-colors">Map</Link>
        </div>
      </div>

      <ProgressLine />

      <div className="pt-12">
        <Section1 />
        <Section2 isMobile={isMobile} />
        <Section3 />
        <Section4 />
        <Section5 />
        <Section6 />
        <Section7 />
      </div>

      <div className="border-t border-white/[0.04] py-8 px-6 text-center">
        <p className="text-[10px] text-white/10">All data sourced from public California government databases. calwatch.io</p>
      </div>
    </div>
  )
}
