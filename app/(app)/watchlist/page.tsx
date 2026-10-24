'use client'
import dynamic from 'next/dynamic'

import { useCallback, useState, useEffect, useRef, Suspense } from 'react'
import { Flame, Sparkles, Inbox, Loader2, Trash2, Dices, Search, SearchX, ChevronDown, CheckSquare, Bookmark } from 'lucide-react'
import type { WatchlistItem, WatchlistPriority } from '@/types'
import { mediaToResult } from '@/lib/mediaToResult'
import { useMediaActions, readCreatedEntry } from '@/lib/useMediaActions'
import { PRIORITY_LABELS } from '@/lib/priorityConfig'
import { openSearchOverlay } from '@/lib/searchOverlayBus'
import { useUrlFilters } from '@/lib/useUrlFilters'
import { useMediaModal } from '@/components/MediaModalProvider'
import SelectableOverlay from '@/components/SelectableOverlay'
import { useOptionalMultiSelect } from '@/components/MultiSelectProvider'
import { EmptyState } from '@/components/ui/EmptyState'
import { ClearFilters } from '@/components/ui/ClearFilters'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { PosterCard } from '@/components/ui/PosterCard'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Skeleton } from '@/components/ui/Skeleton'
import { GridToolbar } from '@/components/grid/GridToolbar'
import { PosterGrid } from '@/components/grid/PosterGrid'
import { useToast } from '@/components/ToastProvider'
import { useDeferredAction } from '@/lib/useDeferredAction'

const TonightPickModal = dynamic(() => import('@/components/TonightPickModal'))

const PRIORITY_ORDER: WatchlistPriority[] = ['must_watch', 'want_to_watch', 'someday']

// The segmented type filter, replacing the "All Types / Movies Only / TV Shows
// Only" dropdown (spec §5.6). Same three values, so the URL param is unchanged.
const TYPE_OPTIONS: { id: 'all' | 'movie' | 'show'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'movie', label: 'Movies' },
  { id: 'show', label: 'TV Shows' },
]

// How many posters a bucket shows before you ask for more. Small on purpose:
// the expander keeps a long bucket from running on under the toolbar.
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
  // Which bucket the grid shows (plan Task 10: priority SegmentedControl +
  // grid). Local rather than a URL param: the three buckets still arrive in
  // the one grouped request, so switching is instant and a shared link keeps
  // meaning "the watchlist", not one tab of it.
  const [activePriority, setActivePriority] = useState<WatchlistPriority>('must_watch')
  // Whether the first load has already chosen the opening tab (see the load
  // effect). A ref: nothing renders from it.
  const openingTabPicked = useRef(false)

  const { markWatched } = useMediaActions()
  const { openMedia, closeMedia } = useMediaModal()
  const { toast } = useToast()
  const { schedule, cancel } = useDeferredAction()
  // The Select/Done pill sits in the toolbar with the other grid controls
  // (spec §5.6); null outside the provider, in which case it is simply absent.
  const multiSelect = useOptionalMultiSelect()

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
  // Must watch bucket hide the other two behind it (F-32).
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

        // Open on the first bucket with something in it, once. Adding from a
        // title's details defaults to Want to watch, so a user with nothing in
        // Must watch would otherwise land on an empty tab with their whole
        // watchlist behind the one beside it.
        if (!openingTabPicked.current) {
          openingTabPicked.current = true
          const first = PRIORITY_ORDER.find((p) => (data?.groups?.[p]?.total ?? 0) > 0)
          if (first) setActivePriority(first)
        }

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
      const res = await markWatched(item.media.tmdb_id, item.media.type, opts)
      await fetch('/api/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      })
      removeFromGroup(item.priority, item.id)
      closeIfOpen(item.id)

      return readCreatedEntry(res)
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

  // "Add to watchlist" is a no-op here — it is already on one. Everything else
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

  // Nothing anywhere, as opposed to nothing in *this* bucket or nothing
  // matching a filter. A new account used to get the full seven-control
  // toolbar over one compact "set a title's priority from its details" —
  // advice that cannot be followed by someone with no titles to set.
  const watchlistEmpty =
    !loading && !hasActiveFilters && PRIORITY_ORDER.every((p) => groups[p].total === 0)

  // The grid swaps under the toolbar with nothing said: the skeletons and the
  // spinner are all aria-hidden, so a filter that matched nothing and one that
  // matched two hundred titles sound identical. This is the only announcement.
  const resultSummary = loading
    ? 'Loading your watchlist.'
    : watchlistEmpty
      ? 'Your watchlist is empty.'
      : `${groups[activePriority].total} ${groups[activePriority].total === 1 ? 'title' : 'titles'} in ${PRIORITY_LABELS[activePriority]}.`

  return (
    <div className="space-y-6 pb-12">
      <p role="status" aria-live="polite" className="sr-only">
        {resultSummary}
      </p>

      {/* Seven controls are too wide to sit beside the title, so they get a
          toolbar panel under it rather than the header's action slot. */}
      <div>
        <PageHeader
          eyebrow="Up next"
          title="Watchlist"
          sub="Prioritize movies and shows you want to watch next."
        />

        {!watchlistEmpty && (
          <GridToolbar>
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl
                label="Priority"
                options={PRIORITY_ORDER.map((p) => ({
                  id: p,
                  label: PRIORITY_LABELS[p],
                  // The count used to sit in a chip beside each heading; it rides
                  // on the segment now, and waits for the load so three zeros
                  // never flash first.
                  count: loading ? undefined : groups[p].total,
                }))}
                value={activePriority}
                onChange={setActivePriority}
                // A phone is a few pixels short of three counted labels at the
                // control's own size, and a wrapped segment is worse than a
                // tighter one, so under `sm` the segments drop to the small
                // recipe. Should that still fall short, the track scrolls, not
                // the page.
                className="max-w-full overflow-x-auto scrollbar-none [&>button]:whitespace-nowrap [&>button]:px-2 [&>button]:text-xs sm:[&>button]:px-4 sm:[&>button]:text-sm"
              />
              <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
                <Button onClick={() => setShowPick(true)}>
                  <Dices className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                  <span>Pick for me</span>
                </Button>
                {multiSelect && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={multiSelect.toggleSelectMode}
                    // Accent while selecting: the pill is a current-state control then.
                    style={multiSelect.isSelectMode ? { color: 'var(--accent)' } : undefined}
                  >
                    <CheckSquare className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                    <span>{multiSelect.isSelectMode ? 'Done' : 'Select'}</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[200px] flex-1">
                <Input
                  icon={<Search />}
                  aria-label="Search your watchlist"
                  placeholder="Search your watchlist…"
                  value={searchQuery}
                  onChange={(e) => setFilter('q', e.target.value)}
                />
              </div>
              <SegmentedControl
                label="Filter by type"
                options={TYPE_OPTIONS}
                value={typeFilter}
                onChange={(t) => setFilter('type', t)}
              />

              <Select
                label="Filter by genre"
                value={genreFilter}
                onChange={(e) => setFilter('genre', e.target.value)}
                className="min-w-[140px]"
              >
                <option value="All" className="bg-[var(--bg-void)]">All genres</option>
                {availableGenres.map(g => <option key={g} value={g} className="bg-[var(--bg-void)]">{g}</option>)}
              </Select>

              <Select
                label="Sort order"
                value={sortOrder}
                onChange={(e) => setFilter('sort', e.target.value)}
                className="min-w-[140px]"
              >
                <option value="added" className="bg-[var(--bg-void)]">Recently added</option>
                <option value="oldest" className="bg-[var(--bg-void)]">Oldest first</option>
                <option value="title" className="bg-[var(--bg-void)]">Title A–Z</option>
                <option value="year" className="bg-[var(--bg-void)]">Release year</option>
              </Select>

              {hasActiveFilters && (
                <ClearFilters onClear={() => resetFilters(['q', 'type', 'genre'])} />
              )}
            </div>
          </GridToolbar>
        )}
      </div>

      {watchlistEmpty ? (
        // No toolbar above this one: filtering, sorting and picking for me are
        // all actions on titles, and there are none. One way out instead.
        <EmptyState
          icon={Bookmark}
          title="Your watchlist is empty"
          hint="Search for a film or show and add it here. Sort what you add into Must watch, Want to watch and Someday."
          actionLabel="Search to add one"
          onAction={openSearchOverlay}
        />
      ) : (
        /* One bucket at a time. Every bucket is still loaded and kept, so a
           move lands in its new tab without a refetch and Undo puts it back. */
        <WatchlistSection
          priority={activePriority}
          group={groups[activePriority]}
          loading={loading}
          filtered={hasActiveFilters}
          actioningId={actioningId}
          onExpand={() => loadMore(activePriority)}
          onOpen={openDetails}
          onUpdatePriority={handleUpdatePriority}
          onRemove={handleRemove}
        />
      )}

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
  filtered,
  actioningId,
  onExpand,
  onOpen,
  onUpdatePriority,
  onRemove,
}: {
  priority: WatchlistPriority
  group: GroupState
  loading: boolean
  /** Whether any of search, type or genre is narrowing the bucket. */
  filtered: boolean
  actioningId: string | null
  onExpand: () => void
  onOpen: (item: WatchlistItem) => void
  onUpdatePriority: (itemId: string, priority: WatchlistPriority) => void
  onRemove: (itemId: string) => void
}) {
  const { items, total, expanded, loadingMore } = group
  const remaining = total - items.length
  const headingId = `watchlist-${priority}`

  return (
    <section aria-labelledby={headingId} className="space-y-5">
      {/* The segment above is the visible label; the heading keeps the bucket
          a landmark for screen readers. */}
      <h2 id={headingId} className="sr-only">
        {PRIORITY_LABELS[priority]}
      </h2>

      {loading ? (
        <PosterGrid>
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-[var(--radius-xl)]" />
          ))}
        </PosterGrid>
      ) : items.length === 0 ? (
        // With tabs an empty bucket is on screen whether or not a filter
        // emptied it, so say which.
        filtered ? (
          <EmptyState
            size="compact"
            icon={SearchX}
            title="No matching items"
            hint="Nothing in this group matches the active filters."
          />
        ) : (
          <EmptyState
            size="compact"
            icon={Inbox}
            title={`Nothing in ${PRIORITY_LABELS[priority]} yet`}
            hint="Set a title's priority from its details to move it here."
          />
        )
      ) : (
        <>
          <PosterGrid>
            {items.map((item) => {
              const isActioning = actioningId === item.id
              const selectableItem = item.media ? mediaToResult(item.media) : null
              // The old card showed the type beside its icon; the caption's
              // tabular line carries it now, after the year.
              const caption = [item.media?.release_year, item.media?.type === 'show' ? 'TV Show' : 'Movie']
                .filter(Boolean)
                .join(' · ')

              return (
                <SelectableOverlay key={item.id} item={selectableItem}>
                  <div className="motion-item-in group relative h-full">
                    <PosterCard
                      title={item.media?.title ?? ''}
                      year={caption}
                      posterUrl={item.media?.poster_url}
                      onClick={() => onOpen(item)}
                    />

                    {/* The actions sit beside the card, not inside it: the card
                        is one <button>, and a button cannot hold buttons. The
                        box matches the poster frame and lets clicks fall
                        through to it everywhere but on the controls. Hover-
                        revealed where the pointer can hover; always visible
                        where it cannot, so a touch tablet still finds them
                        and a tap on the art never lands on a hidden one. */}
                    <div
                      className={`absolute inset-x-0 top-0 z-[1] flex items-end justify-center p-1.5 transition-opacity duration-200 ${
                        isActioning ? 'opacity-100' : '[@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                      }`}
                      style={{ aspectRatio: '2 / 3', pointerEvents: 'none' }}
                    >
                      <div className="flex items-center" style={{ pointerEvents: 'auto' }}>
                        {isActioning ? (
                          <span className="flex h-11 w-11 items-center justify-center">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--glass-badge)] text-[var(--text-secondary)] shadow-[var(--glass-badge-edge)]">
                              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
                            </span>
                          </span>
                        ) : (
                          <>
                            {priority !== 'must_watch' && (
                              <PosterAction label="Move to Must watch" onClick={() => onUpdatePriority(item.id, 'must_watch')}>
                                <Flame className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                              </PosterAction>
                            )}
                            {priority !== 'want_to_watch' && (
                              <PosterAction label="Move to Want to watch" onClick={() => onUpdatePriority(item.id, 'want_to_watch')}>
                                <Sparkles className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                              </PosterAction>
                            )}
                            {priority !== 'someday' && (
                              <PosterAction label="Move to Someday" onClick={() => onUpdatePriority(item.id, 'someday')}>
                                <Inbox className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                              </PosterAction>
                            )}
                            <PosterAction label="Remove" destructive onClick={() => onRemove(item.id)}>
                              <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                            </PosterAction>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </SelectableOverlay>
              )
            })}
          </PosterGrid>

          {/* An explicit expander, not a sentinel: a long bucket should end
              where the user says, not keep scrolling under the toolbar. */}
          {remaining > 0 && (
            <div className="flex justify-center pt-1">
              <Button variant="ghost" size="sm" onClick={onExpand} disabled={loadingMore}>
                {loadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                )}
                <span>
                  {expanded ? `Load ${Math.min(remaining, PAGE_SIZE)} more` : `Show all ${total}`}
                </span>
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

// One icon action over a poster: a 44px target around a 32px dark-glass disc,
// the badge fill so it reads on bright art. Removal takes the danger colour
// on hover; a move only brightens.
function PosterAction({
  label,
  destructive = false,
  onClick,
  children,
}: {
  label: string
  destructive?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={label}
      aria-label={label}
      className={`flex h-11 w-11 items-center justify-center text-[var(--text-secondary)] transition-colors duration-200 ${
        destructive ? 'hover:text-[var(--danger)]' : 'hover:text-[var(--text-primary)]'
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--glass-badge)] shadow-[var(--glass-badge-edge)] forced-colors:border forced-colors:border-[color:CanvasText]">
        {children}
      </span>
    </button>
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
