'use client'
import { Search, ChevronRight } from 'lucide-react'
import { openSearchOverlay } from '@/lib/searchOverlayBus'
import { Kbd } from '@/components/ui/Kbd'

export default function DashboardSearchBar() {
  return (
    <button
      type="button"
      onClick={openSearchOverlay}
      className="w-full max-w-xl h-11 px-5 flex items-center gap-3 rounded-full bg-[var(--surface-shell)]/80 border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-all text-left"
    >
      <Search className="w-5 h-5 text-zinc-500" />
      <span className="flex-1 text-sm text-zinc-500 truncate">Search and add a title</span>
      <Kbd keys="K" className="hidden md:inline-flex items-center gap-0.5 text-[10px] font-semibold text-zinc-500 border border-white/10 rounded px-1.5 py-0.5" />
      <ChevronRight className="w-4 h-4 text-zinc-500 md:hidden" aria-hidden="true" />
    </button>
  )
}
