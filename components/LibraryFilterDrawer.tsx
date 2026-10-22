'use client'
import { useSyncExternalStore, type CSSProperties } from 'react'
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

// The field label: 13/18 muted in plain case, like every eyebrow in the system.
const LABEL = 'block text-[length:var(--text-sm)] leading-[18px] font-medium text-[var(--text-muted)]'

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
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end">
      {/* The scrim and its fade live on this sibling, not the wrapper: an
          opacity animation on an ancestor makes it a backdrop root, and the
          sheet's blur would then see only the scrim instead of the page. */}
      <div
        className="motion-backdrop-fade absolute inset-0"
        style={{ background: 'var(--scrim)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* A glass sheet: a side sheet from md up, rounded on the edge that faces
          the page, and a bottom sheet under it. The panel class brings the
          blur; the radius utilities override its 28 on the edges that touch
          the viewport. */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-filter-drawer-title"
        className="glass-panel glass-rim relative z-10 flex flex-col w-full md:w-96 max-h-[85dvh] md:max-h-full h-auto md:h-full rounded-t-[var(--radius-2xl)] rounded-b-none md:rounded-l-[var(--radius-2xl)] md:rounded-r-none overflow-hidden [animation:sheet-up_.24s_var(--ease-out-expo)_both] md:[animation:dialog-in_.26s_var(--ease-out-expo)_both]"
      >
        <div className="flex items-center justify-between pl-6 pr-3 py-3 shrink-0">
          <h2
            id="library-filter-drawer-title"
            className="text-[length:var(--text-xl)] leading-[26px] tracking-[var(--tracking-snug)] text-[var(--text-primary)]"
            style={{ margin: 0, fontWeight: 'var(--weight-heading)' as CSSProperties['fontWeight'] }}
          >
            Filters
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="inline-flex items-center justify-center w-11 h-11 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-fill-hover)] transition-colors"
          >
            <X className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-1 space-y-5">
          <div className="space-y-2 [&>div]:w-full">
            <label htmlFor="library-filter-sort" className={LABEL}>
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

          <div className="space-y-2 [&>div]:w-full">
            <label htmlFor="library-filter-rating" className={LABEL}>
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

          <div className="space-y-2 [&>div]:w-full">
            <label htmlFor="library-filter-genre" className={LABEL}>
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

          <div className="space-y-2 [&>div]:w-full">
            <label htmlFor="library-filter-decade" className={LABEL}>
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
          <div className="px-6 py-4 border-t border-[var(--border-divider)] flex items-center justify-end shrink-0">
            <ClearFilters onClear={() => resetFilters(['q', 'genre', 'rating', 'decade'])} />
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
