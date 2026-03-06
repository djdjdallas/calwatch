'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { searchEntities } from '@/lib/dataLoader'

const TYPE_COLORS = {
  nonprofit: 'bg-blue-500',
  politician: 'bg-red-500',
  company: 'bg-orange-500',
  government_agency: 'bg-purple-500',
}

const TYPE_LABELS = {
  nonprofit: 'Nonprofit',
  politician: 'Politician',
  company: 'Company',
  government_agency: 'Agency',
}

export default function SearchBar({ onSelect }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const inputRef = useRef(null)

  // CMD+K to open
  useEffect(() => {
    function handleKeydown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResults([])
    }
  }, [open])

  // Search on query change
  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setResults([])
      return
    }
    const data = await searchEntities(q)
    setResults(data)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 200)
    return () => clearTimeout(timer)
  }, [query, doSearch])

  function handleSelect(entity) {
    onSelect?.(entity)
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Command palette */}
      <div className="relative w-full max-w-[520px] bg-[#141414] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center px-4 py-3 border-b border-white/10">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-white/30 mr-3 flex-shrink-0"
          >
            <circle
              cx="7"
              cy="7"
              r="5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M11 11l3.5 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entities..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
          />
          <kbd className="text-[10px] text-white/20 border border-white/10 rounded px-1.5 py-0.5 ml-2">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto">
          {results.length === 0 && query.length >= 2 && (
            <p className="text-xs text-white/30 text-center py-6">
              No entities found.
            </p>
          )}
          {results.map((entity) => (
            <button
              key={entity.id}
              onClick={() => handleSelect(entity)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
            >
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase text-white ${TYPE_COLORS[entity.type] || 'bg-gray-600'}`}
              >
                {TYPE_LABELS[entity.type] || entity.type}
              </span>
              <span className="text-sm text-white/80 truncate">
                {entity.name}
              </span>
              {entity.city && (
                <span className="text-[10px] text-white/30 ml-auto">
                  {entity.city}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
