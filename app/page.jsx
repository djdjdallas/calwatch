'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import MoneyGraph from '@/components/MoneyGraph'
import DetailPanel from '@/components/DetailPanel'
import SearchBar from '@/components/SearchBar'
import StatsBar from '@/components/StatsBar'
import ExportButton from '@/components/ExportButton'
import { loadGraphData } from '@/lib/dataLoader'
import { isDemoMode } from '@/lib/supabase'

function HomeContent() {
  const [graphData, setGraphData] = useState(null)
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [focusEntityId, setFocusEntityId] = useState(null)
  const graphContainerRef = useRef(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    loadGraphData().then(setGraphData)
  }, [])

  // Handle ?entity= URL param
  useEffect(() => {
    if (!graphData) return
    const entityId = searchParams.get('entity')
    if (entityId) {
      const node = graphData.nodes.find((n) => n.id === entityId)
      if (node) {
        setSelectedEntity(node)
        setFocusEntityId(entityId)
      }
    }
  }, [graphData, searchParams])

  const handleNodeClick = useCallback(
    (node) => {
      setSelectedEntity(node)
      router.push(`/?entity=${node.id}`, { scroll: false })
    },
    [router]
  )

  const handleSearchSelect = useCallback(
    (entity) => {
      const node = graphData?.nodes?.find((n) => n.id === entity.id)
      if (node) {
        setSelectedEntity(node)
        setFocusEntityId(entity.id)
        router.push(`/?entity=${entity.id}`, { scroll: false })
      }
    },
    [graphData, router]
  )

  const handleClosePanel = useCallback(() => {
    setSelectedEntity(null)
    router.push('/', { scroll: false })
  }, [router])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-canvas">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="absolute top-0 left-0 right-0 z-40 bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2.5 text-center">
          <p className="text-xs text-yellow-500 font-medium">
            DEMO MODE — displaying placeholder UI only. No real entities or
            financial connections are shown.
          </p>
        </div>
      )}

      {/* Top Bar */}
      <div
        className={`absolute ${isDemoMode ? 'top-10' : 'top-0'} left-0 right-0 z-30 flex items-center justify-between px-6 py-4`}
      >
        {/* Left: Logo */}
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-bold text-white tracking-tight">
            CalWatch
          </h1>
          <span className="text-[11px] text-white/30 font-medium tracking-wide">
            Follow the money
          </span>
        </div>

        {/* Center: Search trigger */}
        <button
          onClick={() => {
            window.dispatchEvent(
              new KeyboardEvent('keydown', {
                key: 'k',
                metaKey: true,
                ctrlKey: true,
              })
            )
          }}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-white/30 border border-white/10 rounded-md hover:border-white/20 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle
              cx="6"
              cy="6"
              r="4.5"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M9.5 9.5L13 13"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          Search entities...
          <kbd className="text-[9px] text-white/15 border border-white/10 rounded px-1 py-0.5 ml-1">
            {'\u2318'}K
          </kbd>
        </button>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <ExportButton graphRef={graphContainerRef} />
          <a
            href="/about"
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            About
          </a>
        </div>
      </div>

      {/* Graph */}
      <div ref={graphContainerRef} className="w-full h-full">
        {graphData && (
          <MoneyGraph
            data={graphData}
            onNodeClick={handleNodeClick}
            selectedEntityId={selectedEntity?.id}
            focusEntityId={focusEntityId}
          />
        )}
      </div>

      {/* Stats */}
      <StatsBar stats={graphData?.stats} />

      {/* Search */}
      <SearchBar onSelect={handleSearchSelect} />

      {/* Detail Panel */}
      {selectedEntity && (
        <DetailPanel
          entity={selectedEntity}
          connections={graphData?.links || []}
          onClose={handleClosePanel}
        />
      )}
    </div>
  )
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen bg-[#080808] flex items-center justify-center">
          <p className="text-xs text-white/30">Loading...</p>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  )
}
