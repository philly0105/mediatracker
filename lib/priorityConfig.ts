import type { ComponentType } from 'react'
import { Flame, Sparkles, Inbox } from 'lucide-react'
import type { WatchlistPriority } from '@/types'

// Priority badge colors + icons. Shared by the watchlist page's section headers
// and the "Tonight's Pick" modal so the pick card's badge never drifts from the
// page's own rendering.
export const PRIORITY_CONFIG: Record<WatchlistPriority, { color: string; icon: ComponentType<{ className?: string }> }> = {
  must_watch: { color: 'text-[var(--rust-300)] border-[var(--rust-tint-border)] bg-[var(--rust-tint-bg)]', icon: Flame },
  want_to_watch: { color: 'text-[var(--amber-300)] border-[var(--amber-tint-border)] bg-[var(--amber-tint-bg)]', icon: Sparkles },
  someday: { color: 'text-zinc-400 border-[var(--border-subtle)] bg-white/5', icon: Inbox },
}