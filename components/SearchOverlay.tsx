'use client'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, CheckCircle2, Bookmark } from 'lucide-react'
import type { TmdbSearchResult } from '@/types'
import { useModal } from '@/lib/useModal'
import { useTmdbSearch } from '@/lib/useTmdbSearch'
import { useLibraryIds } from '@/lib/useLibraryIds'
import { useMediaActions } from '@/lib/useMediaActions'
import MediaInfoModal from '@/components/MediaInfoModal'
import { Badge } from '@/components/ui/Badge'

interface Props {
  onClose: () => void
}

export default function SearchOverlay({ onClose }: Props) {
  const { query, setQuery, results, loading, clear } = useTmdbSearch()
  const { watchedIds, watchlistIds, setWatchedIds, setWatchlistIds } = useLibraryIds()
  const { addToWatchlist, markWatched } = useMediaActions({ priority: 'want_to_watch' })

  const [selected, setSelected] = useState<TmdbSearchResult | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const { containerRef } = useModal(handleClose)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const prevSelected = useRef<TmdbSearchResult | null>(null)

  // Closing resets the query + results. The overlay stays mounted underneath a
  // layered MediaInfoModal, so the reset happens here rather than on unmount.
  function handleClose() {
    clear()
    onClose()
  }

  // useModal moves focus to the panel container, but the search input is the
  // element that should own focus — steer it back once the panel exists.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // When the layered MediaInfoModal closes, hand focus back to the input so the
  // user can keep searching without reaching for the mouse.
  useEffect(() => {
    if (prevSelected.current && !selected) {
      inputRef.current?.focus()
    }
    prevSelected.current = selected
  }, [selected])

  // Keep the highlighted row in view as the arrow keys move it.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // A fresh keystroke starts the highlight back at the top. Results only change
  // through a debounced search triggered from this handler, so resetting here
  // covers every new result set without an effect.
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    setActiveIndex(0)
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (results.length === 0) return
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (results.length === 0) return
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const active = results[activeIndex]
      if (active) {
        e.preventDefault()
        setSelected(active)
      }
    }
  }

  return (
    <>
    <div
      className="fixed inset-0 z-[45] flex items-start justify-center backdrop-blur-md"
      style={{ background: 'var(--scrim)', paddingTop: '12vh' }}
      onClick={handleClose}
    >
      <motion.div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search movies and TV shows"
        initial={{ opacity: 0, scale: 0.98, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--surface-modal)', width: 'min(640px, calc(100vw - 32px))' }}
        className="rounded-[var(--radius-2xl)] border border-white/15 shadow-2xl overflow-hidden"
      >
        {/* Input row */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-white/5">
          <Search className="w-5 h-5 text-zinc-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder="Search movies and TV shows…"
            autoFocus
            className="flex-1 bg-transparent border-none outline-none text-base text-white placeholder:text-zinc-500"
          />
        </div>

        {/* Results list */}
        <div ref={listRef} className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
          {query.trim().length < 2 && (
            <div className="py-8 text-sm text-zinc-600 text-center">Type to search</div>
          )}
          {query.trim().length >= 2 && loading && (
            <div className="py-8 text-sm text-zinc-600 text-center">Searching…</div>
          )}
          {query.trim().length >= 2 && !loading && results.length === 0 && (
            <div className="py-8 text-sm text-zinc-600 text-center">No matches for &ldquo;{query}&rdquo;.</div>
          )}
          {results.map((r, i) => {
            const watched = watchedIds.has(r.tmdb_id)
            const listed = watchlistIds.has(r.tmdb_id)
            return (
              <button
                key={`${r.type}-${r.tmdb_id}`}
                type="button"
                data-index={i}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => setSelected(r)}
                className={`flex items-center gap-3 p-2 rounded-[var(--radius-md)] cursor-pointer w-full text-left ${i === activeIndex ? 'bg-white/[0.06]' : ''}`}
              >
                {r.poster_url ? (
                  <Image
                    src={r.poster_url}
                    alt=""
                    width={40}
                    height={56}
                    className="w-10 h-14 rounded-[var(--radius-xl)] object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-14 rounded-[var(--radius-xl)] flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-black border border-white/5 text-zinc-600 text-xs">
                    No Poster
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{r.title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-500">{r.release_year ?? '—'} · {r.type === 'show' ? 'TV Show' : 'Movie'}</span>
                    {watched && (
                      <Badge tone="success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 className="w-3 h-3" /> Watched
                      </Badge>
                    )}
                    {!watched && listed && (
                      <Badge tone="neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Bookmark className="w-3 h-3" /> Watchlist
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-white/5 flex gap-4 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>Esc Close</span>
        </div>
      </motion.div>

    </div>

    {/* Layered above the overlay — it portals to body at z-50, above the
        overlay's z-45 scrim. The overlay stays mounted underneath so focus
        can return to the input when the modal closes. Kept a React sibling of
        the scrim, not a child: portal events bubble through the React tree,
        so nesting it inside the scrim would let every click in the modal hit
        the scrim's close handler. */}
    {selected && (
      <MediaInfoModal
        item={selected}
        onClose={() => setSelected(null)}
        onAddToWatchlist={async () => {
          await addToWatchlist(selected.tmdb_id, selected.type)
          setWatchlistIds((prev) => new Set(prev).add(selected.tmdb_id))
        }}
        onMarkAsWatched={async (opts) => {
          await markWatched(selected.tmdb_id, selected.type, opts)
          setWatchedIds((prev) => new Set(prev).add(selected.tmdb_id))
        }}
      />
    )}
    </>
  )
}