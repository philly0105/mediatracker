'use client'
import { Search } from 'lucide-react'
import { openSearchOverlay } from '@/lib/searchOverlayBus'

export default function DashboardSearchBar() {
  return (
    <button
      type="button"
      onClick={openSearchOverlay}
      className="w-full max-w-xl h-11 px-5 flex items-center gap-3 rounded-full bg-[var(--surface-shell)]/80 backdrop-blur-xl border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-all text-left"
    >
      <Search className="w-5 h-5 text-zinc-500" />
      <span className="flex-1 text-sm text-zinc-500 truncate">Quick log a movie or TV show...</span>
      <kbd className="hidden md:inline-flex items-center gap-0.5 text-[10px] font-semibold text-zinc-500 border border-white/10 rounded px-1.5 py-0.5">⌘K</kbd>
    </button>
  )
}
