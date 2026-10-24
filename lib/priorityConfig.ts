import { Flame, Sparkles, Inbox, type LucideIcon } from 'lucide-react'
import type { WatchlistPriority } from '@/types'

// Priority badge colors + icons. Shared by the watchlist page's section headers
// and the "Tonight's Pick" modal so the pick card's badge never drifts from the
// page's own rendering.
export interface PriorityConfigItem {
  color: string
  textClass: string
  borderClass: string
  bgClass: string
  icon: LucideIcon
}

// The one spelling of each bucket. This used to be declared four times over
// — the watchlist page, the details modal, the public share page and an
// inline ternary in the pick modal, all Title Case — while the sidebar and the
// dashboard spelled the same bucket in sentence case, so the dashboard said
// "On Must watch" and the watchlist one click away said "Must Watch".
export const PRIORITY_LABELS: Record<WatchlistPriority, string> = {
  must_watch: 'Must watch',
  want_to_watch: 'Want to watch',
  someday: 'Someday',
}

export const PRIORITY_CONFIG: Record<WatchlistPriority, PriorityConfigItem> = {
  must_watch: {
    color: 'text-[var(--rust-300)] border-[var(--rust-tint-border)] bg-[var(--rust-tint-bg)]',
    textClass: 'text-[var(--rust-300)]',
    borderClass: 'border-[var(--rust-tint-border)]',
    bgClass: 'bg-[var(--rust-tint-bg)]',
    icon: Flame,
  },
  want_to_watch: {
    color: 'text-[var(--amber-300)] border-[var(--amber-tint-border)] bg-[var(--amber-tint-bg)]',
    textClass: 'text-[var(--amber-300)]',
    borderClass: 'border-[var(--amber-tint-border)]',
    bgClass: 'bg-[var(--amber-tint-bg)]',
    icon: Sparkles,
  },
  someday: {
    color: 'text-zinc-400 border-[var(--border-subtle)] bg-[var(--btn-ghost-bg)]',
    textClass: 'text-zinc-400',
    borderClass: 'border-[var(--border-subtle)]',
    bgClass: 'bg-[var(--btn-ghost-bg)]',
    icon: Inbox,
  },
}