import Link from 'next/link'
import FlowClient from './FlowClient'

export const metadata = {
  title: 'Money Flow — CalWatch',
  description: 'Animated visualization of how California homelessness dollars flow from taxpayers through agencies to nonprofits and back to politicians.',
}

export default function FlowPage() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Nav */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-3 bg-[#0a0a0f]/70 backdrop-blur-md border-b border-white/5">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="text-lg font-bold text-white tracking-tight">CalWatch</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/investigation" className="text-xs text-red-400/70 hover:text-red-400 transition-colors">Investigation</Link>
          <Link href="/cases" className="text-xs text-white/40 hover:text-white/70 transition-colors">Cases</Link>
          <Link href="/map" className="text-xs text-white/40 hover:text-white/70 transition-colors">Map</Link>
          <Link href="/" className="text-xs text-white/40 hover:text-white/70 transition-colors">Graph</Link>
        </div>
      </div>

      <FlowClient />
    </div>
  )
}
