'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ArcDiagram from '@/components/ArcDiagram'
import DetailPanel from '@/components/DetailPanel'
import SearchBar from '@/components/SearchBar'
import StatsBar from '@/components/StatsBar'
import ExportButton from '@/components/ExportButton'
import {
  loadFraudTriangles,
  loadFullNetwork,
  loadEntityNeighborhood,
  fetchDbStats,
} from '@/lib/dataLoader'
import { isDemoMode } from '@/lib/supabase'

// View modes: 'fraud' (default), 'full', 'search'
function HomeContent() {
  const [graphData, setGraphData] = useState(null)
  const [viewMode, setViewMode] = useState('fraud')
  const [loading, setLoading] = useState(true)
  const [dbStats, setDbStats] = useState(null)
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [focusEntityId, setFocusEntityId] = useState(null)
  const [showFullConfirm, setShowFullConfirm] = useState(false)
  const graphContainerRef = useRef(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  // Load fraud triangles (default view) + DB stats on mount
  useEffect(() => {
    setLoading(true)
    Promise.all([loadFraudTriangles(), fetchDbStats()])
      .then(([data, stats]) => {
        setGraphData(data)
        setDbStats(stats)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load graph data:', err)
        setLoading(false)
      })
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
    async (entity) => {
      try {
        setLoading(true)
        setViewMode('search')
        const data = await loadEntityNeighborhood(entity.id)
        if (data) {
          setGraphData(data)
          const node = data.nodes.find((n) => n.id === entity.id)
          if (node) {
            setSelectedEntity(node)
            setFocusEntityId(entity.id)
          }
        }
        router.push(`/?entity=${entity.id}`, { scroll: false })
      } catch (err) {
        console.error('Search failed:', err)
      } finally {
        setLoading(false)
      }
    },
    [router]
  )

  const handleClosePanel = useCallback(() => {
    setSelectedEntity(null)
    router.push('/', { scroll: false })
  }, [router])

  const handleViewChange = useCallback(
    async (mode) => {
      if (mode === 'full') {
        setShowFullConfirm(true)
        return
      }
      if (mode === 'fraud') {
        try {
          setLoading(true)
          setViewMode('fraud')
          const data = await loadFraudTriangles()
          setGraphData(data)
          setSelectedEntity(null)
        } catch (err) {
          console.error('Failed to load fraud triangles:', err)
        } finally {
          setLoading(false)
        }
      }
    },
    []
  )

  const handleConfirmFull = useCallback(async () => {
    try {
      setShowFullConfirm(false)
      setLoading(true)
      setViewMode('full')
      const data = await loadFullNetwork()
      setGraphData(data)
      setSelectedEntity(null)
    } catch (err) {
      console.error('Failed to load full network:', err)
    } finally {
      setLoading(false)
    }
  }, [])

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
          <ExportButton graphRef={graphContainerRef} graphData={graphData} />
          <a
            href="/flow"
            className="text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
          >
            Flow
          </a>
          <a
            href="/investigation"
            className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
          >
            Investigation
          </a>
          <a
            href="/cases"
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Cases
          </a>
          <a
            href="/search"
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Search
          </a>
          <a
            href="/map"
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Map
          </a>
          <a
            href="/about"
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            About
          </a>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#080808]/80">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            <p className="text-xs text-white/40">Loading graph...</p>
          </div>
        </div>
      )}

      {/* Full Network confirmation dialog */}
      {showFullConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowFullConfirm(false)}
          />
          <div className="relative bg-[#141414] border border-white/10 rounded-xl shadow-2xl p-6 max-w-sm">
            <h3 className="text-sm font-semibold text-white mb-2">
              Load Full Network?
            </h3>
            <p className="text-xs text-white/50 mb-4 leading-relaxed">
              This will load 193,000+ connections and may be slow. The graph
              will be capped at 500 nodes for performance. Continue?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowFullConfirm(false)}
                className="px-3 py-1.5 text-xs text-white/50 border border-white/10 rounded-md hover:border-white/20"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFull}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-500/20 border border-red-500/40 rounded-md hover:bg-red-500/30"
              >
                Load Full Network
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Arc Diagram */}
      <div ref={graphContainerRef} className="w-full h-full">
        {graphData && !loading && (
          <ArcDiagram
            data={graphData}
            onNodeClick={handleNodeClick}
            selectedEntityId={selectedEntity?.id}
          />
        )}
      </div>

      {/* Stats */}
      <StatsBar
        stats={graphData?.stats}
        dbStats={dbStats}
        viewMode={viewMode}
        onViewChange={handleViewChange}
      />

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
