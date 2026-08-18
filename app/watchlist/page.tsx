'use client'
import Image from 'next/image'

import { useState, useEffect, useRef, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Sparkles, Inbox, Film, Tv, Loader2, Trash2, Dices, Search } from 'lucide-react'
import type { WatchlistItem, WatchlistPriority } from '@/types'
import { mediaToResult } from '@/lib/mediaToResult'
import { useMediaActions } from '@/lib/useMediaActions'
import { useUrlFilters } from '@/lib/useUrlFilters'
import MediaInfoModal from '@/components/MediaInfoModal'
import SelectableOverlay from '@/components/SelectableOverlay'
import TonightPickModal from '@/components/TonightPickModal'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ToastProvider'
import { useDeferredAction } from '@/lib/useDeferredAction'
import { PRIORITY_CONFIG } from '@/lib/priorityConfig'

const PRIORITY_LABELS = {
  must_watch: 'Must Watch',
  want_to_watch: 'Want to Watch',
  someday: 'Someday',
}
const PRIORITY_ORDER: Array<keyof typeof PRIORITY_LABELS> = ['must_watch', 'want_to_watch', 'someday']

// Filter state mirrored into the URL so a filtered view is bookmarkable and
// survives reloads; params are omitted from the URL while at their default.
const WATCHLIST_DEFAULTS = { type: 'all', genre: 'All', sort: 'added', q: '' }

function WatchlistContent() {
  const [filters, setFilter] = useUrlFilters(WATCHLIST_DEFAULTS)
  // Re-validate the URL-supplied type so a malformed param in a shared link
  // falls back to the default instead of flowing into the API query. Genre is
  // free-vocabulary: the facet effect below corrects unknown values.
  const typeFilter = (['all', 'movie', 'show'] as const).find((t) => t === filters.type) ?? 'all'
  const genreFilter = filters.genre
  // Free-text `q` and enumerated `sort` are read straight off the URL mirror;
  // the former is debounced by useUrlFilters, the latter is validated inside
  // the API route (anything unknown falls back to 'added').
  const searchQuery = filters.q
  const sortOrder = filters.sort
  const [availableGenres, setAvailableGenres] = useState<string[]>([])
  const [showPick, setShowPick] = useState(false)
  const [refreshSignals, setRefreshSignals] = useState<Record<WatchlistPriority, number>>({
    must_watch: 0,
    want_to_watch: 0,
    someday: 0,
  })

  // Keep the latest genre handy for the facet effect below without re-running
  // it on every genre change (the fetch is meant to key off the type only).
  // Updated in an effect rather than during render so the ref write stays out
  // of the render pass.
  const genreFilterRef = useRef(genreFilter)
  useEffect(() => {
    genreFilterRef.current = genreFilter
  }, [genreFilter])

  // The genre dropdown is built from the genres actually in the user's watchlist
  // rather than a fixed TMDB list (which mixed movie and TV vocabularies and
  // offered dozens of empty options). Refetch when the type filter changes so
  // "Movies Only" narrows the genre list too, and reset the selection if the
  // current genre no longer exists — otherwise the user is stuck on a filter
  // that matches nothing with no obvious cause.
  useEffect(() => {
    let active = true
    const params = new URLSearchParams()
    params.set('facets', '1')
    if (typeFilter !== 'all') params.set('type', typeFilter)

    fetch(`/api/watchlist?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        const genres = (Array.isArray(data?.genres) ? data.genres : []) as string[]
        setAvailableGenres(genres)
        // Reset to All when the active genre disappears from this type's facet,
        // and mirror the correction into the URL so the shared link matches
        // what's actually shown.
        if (genreFilterRef.current !== 'All' && !genres.includes(genreFilterRef.current)) {
          setFilter('genre', 'All')
        }
      })
      .catch(() => {
        if (active) setAvailableGenres([])
      })

    return () => {
      active = false
    }
  }, [typeFilter, setFilter])

  function handlePriorityChanged(toPriority: WatchlistPriority) {
    setRefreshSignals(prev => ({ ...prev, [toPriority]: prev[toPriority] + 1 }))
  }

  return (
    <div className="space-y-8">
      {/* Five controls are too wide to sit beside the title, so they get their
          own row under it rather than being squeezed into the header's action slot. */}
      <div>
        <PageHeader
          eyebrow="Up next"
          title="Watchlist"
          sub="Prioritize movies and shows you want to watch next."
        />

        <div className="flex flex-wrap items-center gap-3 pb-6 border-b border-[var(--border-subtle)]">
          <div className="min-w-[180px]">
            <Input
              icon={<Search className="w-4 h-4" />}
              placeholder="Search your watchlist..."
              value={searchQuery}
              onChange={(e) => setFilter('q', e.target.value)}
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setFilter('type', e.target.value)}
            className="px-4 py-2 rounded-sm bg-[var(--surface-input)] border border-[var(--border-default)] text-sm font-semibold text-white focus:outline-none focus:border-[var(--border-focus)] appearance-none min-w-[120px]"
          >
            <option value="all" className="bg-[var(--bg-void)]">All Types</option>
            <option value="movie" className="bg-[var(--bg-void)]">Movies Only</option>
            <option value="show" className="bg-[var(--bg-void)]">TV Shows Only</option>
          </select>

          <select
            value={genreFilter}
            onChange={(e) => setFilter('genre', e.target.value)}
            className="px-4 py-2 rounded-sm bg-[var(--surface-input)] border border-[var(--border-default)] text-sm font-semibold text-white focus:outline-none focus:border-[var(--border-focus)] appearance-none min-w-[140px]"
          >
            <option value="All" className="bg-[var(--bg-void)]">All Genres</option>
            {availableGenres.map(g => <option key={g} value={g} className="bg-[var(--bg-void)]">{g}</option>)}
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setFilter('sort', e.target.value)}
            className="px-4 py-2 rounded-sm bg-[var(--surface-input)] border border-[var(--border-default)] text-sm font-semibold text-white focus:outline-none focus:border-[var(--border-focus)] appearance-none min-w-[140px]"
          >
            <option value="added" className="bg-[var(--bg-void)]">Recently Added</option>
            <option value="oldest" className="bg-[var(--bg-void)]">Oldest First</option>
            <option value="title" className="bg-[var(--bg-void)]">Title A–Z</option>
            <option value="year" className="bg-[var(--bg-void)]">Release Year</option>
          </select>

          <Button onClick={() => setShowPick(true)}>
            <Dices className="w-4 h-4" />
            <span>Pick for me</span>
          </Button>
        </div>
      </div>

      <div className="space-y-12 pb-12">
        {PRIORITY_ORDER.map(priority => (
          <WatchlistSection
            key={priority}
            priority={priority}
            typeFilter={typeFilter}
            genreFilter={genreFilter}
            searchQuery={searchQuery}
            sortOrder={sortOrder}
            refreshSignal={refreshSignals[priority]}
            onPriorityChanged={handlePriorityChanged}
          />
        ))}
      </div>

      {/* "Pick for me" modal */}
      <AnimatePresence>
        {showPick && (
          <TonightPickModal
            typeFilter={typeFilter}
            genreFilter={genreFilter}
            onClose={() => setShowPick(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function WatchlistSection({
  priority,
  typeFilter,
  genreFilter,
  searchQuery,
  sortOrder,
  refreshSignal,
  onPriorityChanged,
}: {
  priority: WatchlistPriority;
  typeFilter: 'all' | 'movie' | 'show';
  genreFilter: string;
  searchQuery: string;
  sortOrder: string;
  refreshSignal: number;
  onPriorityChanged: (toPriority: WatchlistPriority) => void;
}) {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)

  const sentinelRef = useRef<HTMLDivElement>(null)
  const config = PRIORITY_CONFIG[priority]
  const Icon = config.icon

  // Only markWatched is shared. Removal here deletes by watchlist row id, not by
  // tmdb_id/type like the hook's removeFromWatchlist, so it stays inline.
  const { markWatched } = useMediaActions()
  const { toast } = useToast()
  const { schedule, cancel } = useDeferredAction()

  // A filter change invalidates the page window as well as the rows, so the
  // reset and the refetch belong together. The cascading render is deliberate:
  // the old rows must not stay on screen under the new filter.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems([])
    setPage(1)
    setHasMore(true)
    fetchPage(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priority, typeFilter, genreFilter, searchQuery, sortOrder, refreshSignal])

  async function fetchPage(targetPage: number, isInitial = false) {
    if (isInitial) setLoading(true)
    else setLoadingMore(true)

    try {
      const params = new URLSearchParams()
      params.set('priority', priority)
      params.set('page', targetPage.toString())
      params.set('limit', '24')
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (genreFilter !== 'All') params.set('genre', genreFilter)
      if (searchQuery.trim() !== '') params.set('q', searchQuery)
      if (sortOrder !== 'added') params.set('sort', sortOrder)

      const res = await fetch(`/api/watchlist?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()

      if (isInitial) {
        setItems(data.items || [])
      } else {
        setItems(prev => [...prev, ...(data.items || [])])
      }
      
      setTotal(data.total)
      setHasMore(data.items.length === 24)
    } catch (err) {
      console.error(err)
      setHasMore(false)
    } finally {
      if (isInitial) setLoading(false)
      else setLoadingMore(false)
    }
  }

  // Infinite Scroll Observer
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || loading || !hasMore || items.length === 0) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loadingMore) {
        const nextPage = page + 1
        setPage(nextPage)
        fetchPage(nextPage)
      }
    }, { rootMargin: '200px' })

    observer.observe(sentinel)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, loadingMore, hasMore, page, items.length])

  // Actions
  //
  // From the card this used to be silent: the row vanished from the section you
  // were looking at with no statement of where it went, and the target section
  // is usually far enough down the page to be off-screen. The same action taken
  // inside MediaInfoModal has always toasted.
  const handleUpdatePriority = async (itemId: string, newPriority: WatchlistPriority) => {
    const moved = items.find(i => i.id === itemId)
    try {
      setActioningId(itemId)
      const res = await fetch('/api/watchlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, priority: newPriority }),
      })
      if (!res.ok) throw new Error('Failed to update')
      
      setItems(prev => prev.filter(i => i.id !== itemId))
      setTotal(prev => prev - 1)
      if (selectedItem?.id === itemId) setSelectedItem(null)
      onPriorityChanged(newPriority)

      toast(`Moved ${moved?.media?.title ?? 'item'} to ${PRIORITY_LABELS[newPriority]}.`, {
        tone: 'success',
        // The reverse is one more PATCH, so offering it costs nothing. Unlike
        // removal this is a completed write, not a deferred one — Undo issues a
        // second request rather than cancelling the first.
        action: moved ? {
          label: 'Undo',
          onClick: async () => {
            try {
              const undo = await fetch('/api/watchlist', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: itemId, priority: moved.priority }),
              })
              if (!undo.ok) throw new Error('Failed to move back')
              setItems(prev => (prev.some(i => i.id === itemId) ? prev : [...prev, moved]))
              setTotal(prev => prev + 1)
              // Refresh the section it briefly landed in so the row leaves it.
              onPriorityChanged(newPriority)
            } catch (err) {
              console.error(err)
              toast('Could not move that item back.', { tone: 'error' })
            }
          },
        } : undefined,
      })
    } catch (err) {
      console.error(err)
      toast('Could not move that item.', { tone: 'error' })
    } finally {
      setActioningId(null)
    }
  }

  // Removal used to fire instantly with no prompt and no way back. Drop the
  // card now, defer the write, and let Undo cancel it.
  const handleRemove = async (itemId: string) => {
    const removed = items.find(i => i.id === itemId)
    if (!removed) return

    const restore = () => {
      setItems(prev => (prev.some(i => i.id === itemId) ? prev : [...prev, removed]))
      setTotal(prev => prev + 1)
    }

    setItems(prev => prev.filter(i => i.id !== itemId))
    setTotal(prev => prev - 1)
    if (selectedItem?.id === itemId) setSelectedItem(null)

    schedule(itemId, async () => {
      try {
        const res = await fetch('/api/watchlist', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: itemId }),
        })
        if (!res.ok) throw new Error('Failed to remove item')
      } catch (err) {
        console.error(err)
        restore()
        toast('Could not remove that item.', { tone: 'error' })
      }
    })

    toast(`Removed ${removed.media?.title ?? 'item'} from your watchlist.`, {
      tone: 'success',
      action: {
        label: 'Undo',
        onClick: () => {
          if (!cancel(itemId)) {
            toast('Too late to undo — that item has already been removed.', { tone: 'info' })
            return
          }
          restore()
        },
      },
    })
  }

  const handleMarkAsWatched = async (item: WatchlistItem, opts?: { rewatch?: boolean }) => {
    if (!item.media) return
    try {
      setActioningId(item.id)
      await markWatched(item.media.tmdb_id, item.media.type, opts)
      await fetch('/api/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      })
      setItems(prev => prev.filter(i => i.id !== item.id))
      setTotal(prev => prev - 1)
      if (selectedItem?.id === item.id) setSelectedItem(null)
    } catch (err) {
      // Rethrow rather than reporting here. This is only ever reached through
      // MediaInfoModal, which owns the messaging — including turning a 409 into
      // a "log a rewatch" offer. Swallowing here would make the modal believe
      // the write succeeded, so it would show a success toast on top of an
      // error one and never offer the rewatch.
      console.error(err)
      throw err
    } finally {
      setActioningId(null)
    }
  }

  const modalItem = selectedItem?.media ? mediaToResult(selectedItem.media) : null

  // Hide an empty section only when it's unfiltered and not the Must Watch bucket
  // (which is always kept visible so the "No matching items." empty state can show).
  if (!loading && items.length === 0 && priority !== 'must_watch' && typeFilter === 'all' && genreFilter === 'All') {
    return null
  }

  return (
    <div className="space-y-5">
      {/* Group Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--border-subtle)]">
        <div className={`p-1.5 rounded-lg border ${config.color.split(' ')[1]} ${config.color.split(' ')[2]}`}>
          <Icon className={`w-4 h-4 ${config.color.split(' ')[0]}`} />
        </div>
        <h2 className="text-lg font-bold tracking-tight text-white">
          {PRIORITY_LABELS[priority]}
        </h2>
        <span className="text-xs font-semibold text-zinc-500 bg-white/5 border border-[var(--border-subtle)] px-2 py-0.5 rounded-full">
          {loading ? '...' : total}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {[0, 1, 2, 3].map((j) => (
            <div key={j} className="bg-[var(--glass-card)] border border-[var(--border-subtle)] rounded-lg p-3.5 flex gap-4 animate-pulse">
              <div className="w-14 h-20 rounded-[var(--radius-xl)] bg-[var(--bg-void)] shrink-0" />
              <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5">
                <div className="space-y-2">
                  <div className="h-4 bg-[var(--bg-void)] rounded w-2/3" />
                  <div className="h-3 bg-[var(--bg-void)] rounded w-1/4" />
                </div>
                <div className="h-3.5 bg-[var(--bg-void)] rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-zinc-600 text-xs italic pl-1 py-2">No matching items.</p>
      ) : (
        <>
          <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            <AnimatePresence mode="popLayout">
              {items.map((item) => {
                const isActioning = actioningId === item.id
                const selectableItem = item.media ? mediaToResult(item.media) : null

                return (
                  <SelectableOverlay key={item.id} item={selectableItem}>
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    style={{ height: '100%' }}
                  >
                    <Card
                      onClick={() => setSelectedItem(item)}
                      style={{ padding: '14px', display: 'flex', gap: '16px', position: 'relative', height: '100%', userSelect: 'none' }}
                      className="group cursor-pointer"
                    >
                      {item.media?.poster_url ? (
                        <Image
                          src={item.media.poster_url}
                          alt={item.media?.title ?? ''}
                          width={56}
                          height={80}
                          className="w-14 h-20 rounded-[var(--radius-xl)] object-cover shadow-md shadow-black/20 border border-[var(--border-subtle)] shrink-0 bg-[var(--bg-void)]"
                        />
                      ) : (
                        <div className="w-14 h-20 rounded-[var(--radius-xl)] bg-[var(--bg-void)] border border-[var(--border-subtle)] flex items-center justify-center text-[10px] text-zinc-700 shrink-0">
                          No Poster
                        </div>
                      )}
                      <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5 pr-14">
                        <div>
                          <p className="font-bold text-white text-sm line-clamp-1 group-hover:text-[var(--accent)] transition-colors">
                            {item.media?.title}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {item.media?.release_year}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                          {item.media?.type === 'show' ? (
                            <><Tv className="w-3.5 h-3.5 text-[var(--live)]" /><span>TV Show</span></>
                          ) : (
                            <><Film className="w-3.5 h-3.5 text-[var(--accent)]" /><span>Movie</span></>
                          )}
                        </div>
                      </div>

                      {/* Actions row on hover */}
                      <div className="absolute top-3.5 right-3.5 flex flex-col gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity duration-200" onClick={e => e.stopPropagation()}>
                        {isActioning ? (
                          <div className="p-1"><Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" /></div>
                        ) : (
                          <div className="flex gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-sm border border-[var(--border-subtle)]">
                            {priority !== 'must_watch' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUpdatePriority(item.id, 'must_watch') }}
                                className="p-1.5 rounded-sm text-zinc-400 hover:text-[var(--rust-300)] hover:bg-[var(--rust-tint-bg)] transition-colors"
                                title="Move to Must Watch"
                                aria-label="Move to Must Watch"
                              ><Flame className="w-3.5 h-3.5" /></button>
                            )}
                            {priority !== 'want_to_watch' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUpdatePriority(item.id, 'want_to_watch') }}
                                className="p-1.5 rounded-sm text-zinc-400 hover:text-[var(--amber-300)] hover:bg-[var(--amber-tint-bg)] transition-colors"
                                title="Move to Want to Watch"
                                aria-label="Move to Want to Watch"
                              ><Sparkles className="w-3.5 h-3.5" /></button>
                            )}
                            {priority !== 'someday' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUpdatePriority(item.id, 'someday') }}
                                className="p-1.5 rounded-sm text-zinc-400 hover:text-zinc-300 hover:bg-white/10 transition-colors"
                                title="Move to Someday"
                                aria-label="Move to Someday"
                              ><Inbox className="w-3.5 h-3.5" /></button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemove(item.id) }}
                              className="p-1.5 rounded-sm text-zinc-400 hover:text-[var(--live)] hover:bg-[var(--rust-tint-bg)] transition-colors"
                              title="Remove"
                              aria-label="Remove"
                            ><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                  </SelectableOverlay>
                )
              })}
            </AnimatePresence>
          </motion.div>
          
          {hasMore && (
            <div ref={sentinelRef} className="h-20 flex items-center justify-center">
              {loadingMore && <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />}
            </div>
          )}
        </>
      )}

      {/* Media Detail Modal */}
      <AnimatePresence>
        {selectedItem && modalItem && (
          <MediaInfoModal
            item={modalItem}
            onClose={() => setSelectedItem(null)}
            onAddToWatchlist={async () => {}}
            onMarkAsWatched={async (opts) => handleMarkAsWatched(selectedItem, opts)}
            currentPriority={selectedItem.priority}
            onUpdatePriority={async (newPriority) => handleUpdatePriority(selectedItem.id, newPriority)}
            onRemoveFromWatchlist={async () => handleRemove(selectedItem.id)}
          />
        )}
      </AnimatePresence>

    </div>
  )
}

// useSearchParams inside WatchlistContent (via useUrlFilters) needs a Suspense
// boundary; without one the route opts out of static rendering during prerender.
export default function WatchlistPage() {
  return (
    <Suspense>
      <WatchlistContent />
    </Suspense>
  )
}
