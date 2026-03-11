'use client'

export default function Error({ error, reset }) {
  return (
    <div className="w-screen h-screen bg-[#080808] flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <h2 className="text-lg font-semibold text-white mb-2">Something went wrong</h2>
        <p className="text-sm text-white/40 mb-6">
          {error?.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 text-sm text-white bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
