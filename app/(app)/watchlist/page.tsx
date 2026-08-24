'use client'
import Image from 'next/image'
import dynamic from 'next/dynamic'

import { useCallback, useState, useEffect, useRef, Suspense } from 'react'
import { Flame, Sparkles, Inbox, Film, Tv, Loader2, Trash2, Dices, Search, SearchX, ChevronDown } from 'lucide-react'
import type { WatchlistItem, WatchlistPriority } from '@/types'
import { mediaToResult } from '@/lib/mediaToResult'
import { useMediaActions } from '@/lib/useMediaActions'
import { useUrlFilters } from '@/lib/useUrlFilters'
import { useMediaModal } from '@/components/MediaModalProvider'
import SelectableOverlay from '@/components/SelectableOverlay'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ClearFilters } from '@/components/ui/ClearFilters'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ToastProvider'
import { useDeferredAction } from '@/lib/useDeferredAction'
import { PRIORITY_CONFIG } from '@/lib/priorityConfig'

const TonightPickModal = dynamic(() => import('@/components/TonightPickModal'))

const PRIORITY_LABELS = {
  must_watch: 'Must Watch',
  want_to_watch: 'Want to Watch',
  someday: 'Someday',
}
const PRIORITY_ORDER: WatchlistPriority[] = ['must_watch', 'want_to_watch', 'someday']

// How many rows a bucket shows before you ask for more. Small on purpose: three
// buckets are on screen at once, and the point of the restructure is that a
// long Must Watch list no longer buries the two under it.
const PAGE_SIZE = 12

// Filter state mirrored into the URL so a filtered view is bookmarkable and
// survives reloads; params are omitted from the URL while at their default.
const WATCHLIST_DEFAULTS = { type: 'all', genre: 'All', sort: 'added', q: '' }

interface GroupState {
  items: WatchlistItem[]
  /** Rows matching the current filters, not rows loaded. */
  total: number
  /** Highest page fetched. Reset to 1 whenever the bucket is refetched. */
  page: number
  expanded: boolean
  loadingMore: boolean
}

const EMPTY_GROUP: GroupState = { items: [], total: 0, page: 1, expanded: false, loadingMore: false }

type Groups = Record<WatchlistPriority, GroupState>

const EMPTY_GROUPS: Groups = {
  must_watch: EMPTY_GROUP,
  want_to_watch: EMPTY_GROUP,
  someday: EMPTY_GROUP,
}

function WatchlistContent() {
  const [filters, setFilter, resetFilters] = useUrlFilters(WATCHLIST_DEFAULTS)
  // Re-validate the URL-supplied type so a malformed param in a shared link
  // falls back to the default instead of flowing into the API query. Genre is
  // free-vocabulary: the facets returned with each load correct unknown values.
  const typeFilter = (['all', 'movie', 'show'] as const).find((t) => t === filters.type) ?? 'all'
  const genreFilter = filters.genre
  // Free-text `q` and enumerated `sort` are read straight off the URL mirror;
  // the former is debounced by useUrlFilters, the latter is validated inside
  // the API route (anything unknown falls back to 'added').
  const searchQuery = filters.q
  const sortOrder = filters.sort
  // Sort is a view preference, not a filter — it never narrows the list to
  // nothing, so it neither lights the chip nor gets cleared by it.
  const hasActiveFilters =
    typeFilter !== 'all' || genreFilter !== 'All' || searchQuery.trim() !== ''

  const [groups, setGroups] = useState<Groups>(EMPTY_GROUPS)
  const [availableGenres, setAvailableGenres] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [showPick, setShowPick] = useState(false)

  const { markWatched } = useMediaActions()
  const { openMedia, closeMedia } = useMediaModal()
  const { toast } = useToast()
  const { schedule, cancel } = useDeferredAction()

  // The modal itself lives in MediaModalProvider; all this page needs to know is
  // which row is currently showing, so the handlers below can dismiss it when
  // that row leaves the list. A ref, not state — nothing renders from it.
  const openItemIdRef = useRef<string | null>(null)

  // The load effect corrects a stale genre, but must not *re-run* because of
  // one: `setFilter`'s identity is tied to the router's, so depending on it
  // directly turns every fetch into another render into another fetch. Both are
  // read through refs, updated outside the render pass.
  const genreFilterRef = useRef(genreFilter)
  const setFilterRef = useRef(setFilter)
  useEffect(() => {
    genreFilterRef.current = genreFilter
    setFilterRef.current = setFilter
  }, [genreFilter, setFilter])

  // Every filter is a query param, so one builder covers the grouped load, the
  // per-bucket "load more" and the post-move refresh.
  const listParams = useCallback(
    (priority: WatchlistPriority | null, page: number, limit: number) => {
      const params = new URLSearchParams()
      if (priority) params.set('priority', priority)
      else params.set('group', 'priority')
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (genreFilter !== 'All') params.set('genre', genreFilter)
      if (searchQuery.trim() !== '') params.set('q', searchQuery)
      if (sortOrder !== 'added') params.set('sort', sortOrder)
      return params.toString()
    },
    [typeFilter, genreFilter, searchQuery, sortOrder]
  )

  // One request for the whole page. This used to be four — three independent
  // section fetches plus a separate facets call — each with its own pagination
  // state and its own infinite-scroll sentinel, which is what made a 200-item
  // Must Watch bucket hide the other two behind it (F-32).
  useEffect(() => {
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)

    fetch(`/api/watchlist?${listParams(null, 1, PAGE_SIZE)}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load')
        return r.json()
      })
      .then((data) => {
        if (!active) return
        setGroups(
          Object.fromEntries(
            PRIORITY_ORDER.map((p) => [
              p,
              { ...EMPTY_GROUP, items: data?.groups?.[p]?.items ?? [], total: data?.groups?.[p]?.total ?? 0 },
            ])
          ) as Groups
        )

        // The genre dropdown is built from the genres actually in the user's
        // watchlist rather than a fixed TMDB list (which mixed movie and TV
        // vocabularies and offered dozens of empty options). Reset the
        // selection when the active genre no longer exists — otherwise the user
        // is stuck on a filter that matches nothing with no obvious cause — and
        // mirror the correction into the URL so the shared link matches what is
        // actually shown.
        const genres = (Array.isArray(data?.genres) ? data.genres : []) as string[]
        setAvailableGenres(genres)
        if (genreFilterRef.current !== 'All' && !genres.includes(genreFilterRef.current)) {
          setFilterRef.current('genre', 'All')
        }
      })
      .catch(() => {
        if (!active) return
        setGroups(EMPTY_GROUPS)
        setAvailableGenres([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [listParams])

  function patchGroup(priority: WatchlistPriority, patch: Partial<GroupState>) {
    setGroups((prev) => ({ ...prev, [priority]: { ...prev[priority], ...patch } }))
  }

  async function loadMore(priority: WatchlistPriority) {
    const group = groups[priority]
    if (group.loadingMore || group.items.length >= group.total) return

    patchGroup(priority, { expanded: true, loadingMore: true })
    try {
      const res = await fetch(`/api/watchlist?${listParams(priority, group.page + 1, PAGE_SIZE)}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setGroups((prev) => {
        const current = prev[priority]
        // Rows can leave the bucket between pages (a move, a removal), so dedupe
        // rather than trusting the offset to line up.
        const seen = new Set(current.items.map((i) => i.id))
        const merged = [...current.items, ...((data.items ?? []) as WatchlistItem[]).filter((i) => !seen.has(i.id))]
        return { ...prev, [priority]: { ...current, items: merged, total: data.total ?? current.total, page: current.page + 1 } }
      })
    } catch (err) {
      console.error(err)
      toast('Could not load more items.', { tone: 'error' })
    } finally {
      patchGroup(priority, { loadingMore: false })
    }
  }

  // Used after a row moves into a bucket. Resetting to the first page rather
  // than re-fetching the whole loaded window keeps the page arithmetic honest;
  // it is also exactly what the old per-section refresh signal did.
  const refreshGroup = useCallback(
    async (priority: WatchlistPriority) => {
      try {
        const res = await fetch(`/api/watchlist?${listParams(priority, 1, PAGE_SIZE)}`)
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        setGroups((prev) => ({
          ...prev,
          [priority]: { ...prev[priority], items: data.items ?? [], total: data.total ?? 0, page: 1 },
        }))
      } catch (err) {
        console.error(err)
      }
    },
    [listParams]
  )

  function removeFromGroup(priority: WatchlistPriority, itemId: string) {
    setGroups((prev) => {
      const group = prev[priority]
      if (!group.items.some((i) => i.id === itemId)) return prev
      return {
        ...prev,
        [priority]: {
          ...group,
          items: group.items.filter((i) => i.id !== itemId),
          total: Math.max(0, group.total - 1),
        },
      }
    })
  }

  // Undo used to re-append the row to the end of the array, so undoing a move or
  // a removal dropped the card at the bottom of the bucket instead of back where
  // it had been (F-32).
  function restoreToGroup(priority: WatchlistPriority, item: WatchlistItem, index: number) {
    setGroups((prev) => {
      const group = prev[priority]
      if (group.items.some((i) => i.id === item.id)) return prev
      const items = [...group.items]
      items.splice(index < 0 || index > items.length ? items.length : index, 0, item)
      return { ...prev, [priority]: { ...group, items, total: group.total + 1 } }
    })
  }

  // The index matters as much as the row: Undo restores to it. Read from the
  // render snapshot rather than from inside a setGroups updater — those do not
  // run synchronously, so an index captured there is not available yet.
  function findItem(itemId: string): { item: WatchlistItem; priority: WatchlistPriority; index: number } | null {
    for (const priority of PRIORITY_ORDER) {
      const index = groups[priority].items.findIndex((i) => i.id === itemId)
      if (index !== -1) return { item: groups[priority].items[index], priority, index }
    }
    return null
  }

  // Actions
  //
  // From the card this used to be silent: the row vanished from the section you
  // were looking at with no statement of where it went, and the target section
  // is usually far enough down the page to be off-screen. The same action taken
  // inside MediaInfoModal has always toasted.
  const handleUpdatePriority = async (itemId: string, newPriority: WatchlistPriority) => {
    const found = findItem(itemId)
    if (!found) return
    const { item: moved, priority: fromPriority, index } = found

    try {
      setActioningId(itemId)
      const res = await fetch('/api/watchlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, priority: newPriority }),
      })
      if (!res.ok) throw new Error('Failed to update')

      removeFromGroup(fromPriority, itemId)
      closeIfOpen(itemId)
      refreshGroup(newPriority)

      toast(`Moved ${moved.media?.title ?? 'item'} to ${PRIORITY_LABELS[newPriority]}.`, {
        tone: 'success',
        // The reverse is one more PATCH, so offering it costs nothing. Unlike
        // removal this is a completed write, not a deferred one — Undo issues a
        // second request rather than cancelling the first.
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              const undo = await fetch('/api/watchlist', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: itemId, priority: fromPriority }),
              })
              if (!undo.ok) throw new Error('Failed to move back')
              restoreToGroup(fromPriority, moved, index)
              // Refresh the bucket it briefly landed in so the row leaves it.
              refreshGroup(newPriority)
            } catch (err) {
              console.error(err)
              toast('Could not move that item back.', { tone: 'error' })
            }
          },
        },
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
    const found = findItem(itemId)
    if (!found) return
    const { item: removed, priority, index } = found

    removeFromGroup(priority, itemId)
    closeIfOpen(itemId)

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
        restoreToGroup(priority, removed, index)
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
          restoreToGroup(priority, removed, index)
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
      removeFromGroup(item.priority, item.id)
      closeIfOpen(item.id)
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

  function closeIfOpen(itemId: string) {
    if (openItemIdRef.current === itemId) closeMedia()
  }

  // "Add to Watchlist" is a no-op here — it is already on one. Everything else
  // is bespoke: removal deletes by watchlist row id, and marking watched has to
  // delete the row as well as log the watch.
  function openDetails(item: WatchlistItem) {
    if (!item.media) return
    openItemIdRef.current = item.id
    openMedia(mediaToResult(item.media), {
      onClosed: () => { if (openItemIdRef.current === item.id) openItemIdRef.current = null },
      onAddToWatchlist: async () => {},
      onMarkAsWatched: async (opts) => handleMarkAsWatched(item, opts),
      currentPriority: item.priority,
      onUpdatePriority: async (newPriority) => handleUpdatePriority(item.id, newPriority),
      onRemoveFromWatchlist: async () => handleRemove(item.id),
    })
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
              aria-label="Search your watchlist"
              placeholder="Search your watchlist..."
              value={searchQuery}
              onChange={(e) => setFilter('q', e.target.value)}
            />
          </div>
          <Select
            label="Filter by type"
            value={typeFilter}
            onChange={(e) => setFilter('type', e.target.value)}
            className="min-w-[120px]"
          >
            <option value="all" className="bg-[var(--bg-void)]">All Types</option>
            <option value="movie" className="bg-[var(--bg-void)]">Movies Only</option>
            <option value="show" className="bg-[var(--bg-void)]">TV Shows Only</option>
          </Select>

          <Select
            label="Filter by genre"
            value={genreFilter}
            onChange={(e) => setFilter('genre', e.target.value)}
            className="min-w-[140px]"
          >
            <option value="All" className="bg-[var(--bg-void)]">All Genres</option>
            {availableGenres.map(g => <option key={g} value={g} className="bg-[var(--bg-void)]">{g}</option>)}
          </Select>

          <Select
            label="Sort order"
            value={sortOrder}
            onChange={(e) => setFilter('sort', e.target.value)}
            className="min-w-[140px]"
          >
            <option value="added" className="bg-[var(--bg-void)]">Recently Added</option>
            <option value="oldest" className="bg-[var(--bg-void)]">Oldest First</option>
            <option value="title" className="bg-[var(--bg-void)]">Title A–Z</option>
            <option value="year" className="bg-[var(--bg-void)]">Release Year</option>
          </Select>

          {hasActiveFilters && (
            <ClearFilters onClear={() => resetFilters(['q', 'type', 'genre'])} />
          )}

          <Button onClick={() => setShowPick(true)}>
            <Dices className="w-4 h-4" />
            <span>Pick for me</span>
          </Button>
        </div>
      </div>

      <div className="space-y-12 pb-12">
        {PRIORITY_ORDER.map((priority) => (
          <WatchlistSection
            key={priority}
            priority={priority}
            group={groups[priority]}
            loading={loading}
            typeFilter={typeFilter}
            genreFilter={genreFilter}
            actioningId={actioningId}
            onExpand={() => loadMore(priority)}
            onOpen={openDetails}
            onUpdatePriority={handleUpdatePriority}
            onRemove={handleRemove}
          />
        ))}
      </div>

      {/* "Pick for me" modal */}
      {showPick && (
        <TonightPickModal
          typeFilter={typeFilter}
          genreFilter={genreFilter}
          onClose={() => setShowPick(false)}
        />
      )}
    </div>
  )
}

function WatchlistSection({
  priority,
  group,
  loading,
  typeFilter,
  genreFilter,
  actioningId,
  onExpand,
  onOpen,
  onUpdatePriority,
  onRemove,
}: {
  priority: WatchlistPriority
  group: GroupState
  loading: boolean
  typeFilter: 'all' | 'movie' | 'show'
  genreFilter: string
  actioningId: string | null
  onExpand: () => void
  onOpen: (item: WatchlistItem) => void
  onUpdatePriority: (itemId: string, priority: WatchlistPriority) => void
  onRemove: (itemId: string) => void
}) {
  const config = PRIORITY_CONFIG[priority]
  const Icon = config.icon
  const { items, total, expanded, loadingMore } = group
  const remaining = total - items.length

  // Hide an empty section only when it's unfiltered and not the Must Watch bucket
  // (which is always kept visible so the "No matching items." empty state can show).
  if (!loading && items.length === 0 && priority !== 'must_watch' && typeFilter === 'all' && genreFilter === 'All') {
    return null
  }

  return (
    <div className="space-y-5">
      {/* Group Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--border-subtle)]">
        <div className={`p-1.5 rounded-lg border ${config.borderClass} ${config.bgClass}`}>
          <Icon className={`w-4 h-4 ${config.textClass}`} />
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
        <EmptyState
          size="compact"
          icon={SearchX}
          title="No matching items"
          hint="Nothing in this group matches the active filters."
        />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {items.map((item) => {
              const isActioning = actioningId === item.id
              const selectableItem = item.media ? mediaToResult(item.media) : null

              return (
                <SelectableOverlay key={item.id} item={selectableItem}>
                  <div className="motion-item-in" style={{ height: '100%' }}>
                    <Card
                      onClick={() => onOpen(item)}
                      aria-label={item.media?.title}
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
                          <div className="flex gap-1.5 bg-black/60 p-1 rounded-sm border border-[var(--border-subtle)]">
                            {priority !== 'must_watch' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onUpdatePriority(item.id, 'must_watch') }}
                                className="p-1.5 rounded-sm text-zinc-400 hover:text-[var(--rust-300)] hover:bg-[var(--rust-tint-bg)] transition-colors"
                                title="Move to Must Watch"
                                aria-label="Move to Must Watch"
                              ><Flame className="w-3.5 h-3.5" /></button>
                            )}
                            {priority !== 'want_to_watch' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onUpdatePriority(item.id, 'want_to_watch') }}
                                className="p-1.5 rounded-sm text-zinc-400 hover:text-[var(--amber-300)] hover:bg-[var(--amber-tint-bg)] transition-colors"
                                title="Move to Want to Watch"
                                aria-label="Move to Want to Watch"
                              ><Sparkles className="w-3.5 h-3.5" /></button>
                            )}
                            {priority !== 'someday' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onUpdatePriority(item.id, 'someday') }}
                                className="p-1.5 rounded-sm text-zinc-400 hover:text-zinc-300 hover:bg-white/10 transition-colors"
                                title="Move to Someday"
                                aria-label="Move to Someday"
                              ><Inbox className="w-3.5 h-3.5" /></button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); onRemove(item.id) }}
                              className="p-1.5 rounded-sm text-zinc-400 hover:text-[var(--live)] hover:bg-[var(--rust-tint-bg)] transition-colors"
                              title="Remove"
                              aria-label="Remove"
                            ><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                </SelectableOverlay>
              )
            })}
          </div>

          {/* An explicit expander, not a sentinel. Three infinite scrolls stacked
              vertically meant scrolling through all of Must Watch before Want to
              Watch came into view. */}
          {remaining > 0 && (
            <div className="flex justify-center pt-1">
              <Button variant="ghost" size="sm" onClick={onExpand} disabled={loadingMore}>
                {loadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                <span>
                  {expanded ? `Load ${Math.min(remaining, PAGE_SIZE)} more` : `Show all ${total}`}
                </span>
              </Button>
            </div>
          )}
        </>
      )}

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
