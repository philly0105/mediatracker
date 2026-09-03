'use client'
import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useModal } from '@/lib/useModal'
import { Select } from '@/components/ui/Select'
import { ClearFilters } from '@/components/ui/ClearFilters'
import type { WatchEntrySort } from '@/lib/watchEntrySort'

// The option lists arrive as props rather than being imported from LibraryView:
// LibraryView already imports this component, and reaching back the other way
// for two constants would make the pair a cycle.
export interface LibraryFilterDrawerProps {
  onClose: () => void
  sortBy: WatchEntrySort
  ratingFilter: string
  genreFilter: string
  decadeFilter: string
  genres: string[]
  decades: number[]
  hasActiveFilters: boolean
  setFilter: (key: string, value: string) => void
  resetFilters: (keys: string[]) => void
  sortOptions: { id: WatchEntrySort; label: string }[]
  ratingOptions: { id: string; label: string }[]
}

export default function LibraryFilterDrawer({
  onClose,
  sortBy,
  ratingFilter,
  genreFilter,
  decadeFilter,
  genres,
  decades,
  hasActiveFilters,
  setFilter,
  resetFilters,
  sortOptions,
  ratingOptions,
}: LibraryFilterDrawerProps) {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const { containerRef } = useModal(onClose)

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end"
      style={{ background: 'var(--scrim)' }}
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-filter-drawer-title"
        className="relative z-10 flex flex-col w-full sm:w-80 md:w-96 max-h-[85dvh] sm:max-h-full h-auto sm:h-full bg-[var(--surface-modal)] border-t sm:border-t-0 sm:border-l border-[var(--border-subtle)] shadow-2xl rounded-t-[var(--radius-2xl)] sm:rounded-none overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] shrink-0">
          <h2 id="library-filter-drawer-title" className="text-base font-bold text-[var(--text-primary)]">
            Filters
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="p-1.5 rounded-sm text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="space-y-1.5 [&>div]:w-full">
            <label htmlFor="library-filter-sort" className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Sort by
            </label>
            <Select
              id="library-filter-sort"
              label="Sort by"
              value={sortBy}
              onChange={(e) => setFilter('sort', e.target.value)}
              className="w-full"
            >
              {sortOptions.map((o) => (
                <option key={o.id} value={o.id} className="bg-[var(--bg-void)]">
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5 [&>div]:w-full">
            <label htmlFor="library-filter-rating" className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Rating
            </label>
            <Select
              id="library-filter-rating"
              label="Rating"
              value={ratingFilter}
              onChange={(e) => setFilter('rating', e.target.value)}
              className="w-full"
            >
              {ratingOptions.map((o) => (
                <option key={o.id} value={o.id} className="bg-[var(--bg-void)]">
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5 [&>div]:w-full">
            <label htmlFor="library-filter-genre" className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Filter by genre
            </label>
            <Select
              id="library-filter-genre"
              label="Filter by genre"
              value={genreFilter}
              onChange={(e) => setFilter('genre', e.target.value)}
              className="w-full"
            >
              <option value="All" className="bg-[var(--bg-void)]">All Genres</option>
              {genres.map((g) => (
                <option key={g} value={g} className="bg-[var(--bg-void)]">{g}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5 [&>div]:w-full">
            <label htmlFor="library-filter-decade" className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Filter by decade
            </label>
            <Select
              id="library-filter-decade"
              label="Filter by decade"
              value={decadeFilter}
              onChange={(e) => setFilter('decade', e.target.value)}
              className="w-full"
            >
              <option value="All" className="bg-[var(--bg-void)]">All Years</option>
              {decades.map((d) => (
                <option key={d} value={String(d)} className="bg-[var(--bg-void)]">{d}s</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Resets exactly the controls hasActiveFilters reports on, so the
            chip's presence and its effect stay in step. Type, sort and the
            grid/list toggle are view preferences, not narrowing filters,
            and survive the clear. */}
        {hasActiveFilters && (
          <div className="p-4 border-t border-[var(--border-subtle)] flex items-center justify-end shrink-0">
            <ClearFilters onClear={() => resetFilters(['q', 'genre', 'rating', 'decade'])} />
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
