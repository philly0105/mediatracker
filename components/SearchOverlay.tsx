'use client'
import Image from 'next/image'
import { useState, useRef, useEffect, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { Search, CheckCircle2, Bookmark, Check, Plus, Loader2, User, Clock } from 'lucide-react'
import type { TmdbSearchResult, TmdbPersonResult } from '@/types'
import { useModal } from '@/lib/useModal'
import { Kbd } from '@/components/ui/Kbd'
import { useTmdbSearch, type SearchMode } from '@/lib/useTmdbSearch'
import { useLibraryIds } from '@/lib/useLibraryIds'
import { mediaKey } from '@/lib/mediaKey'
import { readRecentSearches, recordRecentSearch, clearRecentSearches } from '@/lib/recentSearches'
// Shared with the g-prefixed shortcuts and the help sheet — see lib/quickNav.
import { QUICK_NAV } from '@/lib/quickNav'
import { useMediaActions, isAlreadyWatchedError } from '@/lib/useMediaActions'
import { useMediaModal, type MediaChange } from '@/components/MediaModalProvider'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ToastProvider'

interface Props {
  onClose: () => void
}

// Every option is a tier-2 row at the control radius (no blur: the list can
// be long). The keyboard highlight is the selected fill plus the accent ring,
// inline so it beats the row's own hover fill; the pointer moves the highlight
// anyway, so hover and selection never disagree. Forced colours drops both the
// fill and the ring, so the selected row takes the system Highlight there;
// `!` is what lets the class beat the inline fill, as in Sidebar's tabs.
const ROW_CLASS = 'glass-row rounded-[var(--radius-md)] flex items-center gap-3 w-full text-left cursor-pointer aria-selected:forced-colors:bg-[color:Highlight]! aria-selected:forced-colors:text-[color:HighlightText]!'
const SELECTED_STYLE: CSSProperties = {
  background: 'var(--glass-fill-selected)',
  boxShadow: 'var(--glass-row-edge), var(--accent-ring)',
}
function rowStyle(selected: boolean, padding: string): CSSProperties {
  return { minHeight: 44, padding, ...(selected ? SELECTED_STYLE : undefined) }
}

const SEMIBOLD = 'var(--weight-semibold)' as CSSProperties['fontWeight']
const MEDIUM = 'var(--weight-medium)' as CSSProperties['fontWeight']

// Group labels: 12/16/600 muted in plain case, as the sidebar's "Must watch".
const GROUP_LABEL: CSSProperties = {
  padding: '8px 12px 4px',
  fontSize: 'var(--text-xs)',
  lineHeight: '16px',
  fontWeight: SEMIBOLD,
  color: 'var(--text-muted)',
}
const ROW_LABEL: CSSProperties = {
  fontSize: 'var(--text-base)',
  lineHeight: '20px',
  fontWeight: MEDIUM,
  letterSpacing: 'var(--tracking-text)',
  color: 'var(--text-primary)',
}
const ROW_TITLE: CSSProperties = { ...ROW_LABEL, margin: 0, fontWeight: SEMIBOLD }
const ROW_META: CSSProperties = {
  margin: 0,
  fontSize: 'var(--text-sm)',
  lineHeight: '18px',
  color: 'var(--text-muted)',
  fontVariantNumeric: 'tabular-nums',
}
const HINT: CSSProperties = {
  margin: 0,
  padding: '32px 16px',
  textAlign: 'center',
  fontSize: 'var(--text-base)',
  lineHeight: '20px',
  color: 'var(--text-muted)',
}
// Thumbs: a 44x66 poster at the thumb radius, or a 40px headshot circle.
const THUMB: CSSProperties = { flexShrink: 0, objectFit: 'cover', boxShadow: 'var(--shadow-sm)' }
const THUMB_EMPTY: CSSProperties = {
  ...THUMB,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(150deg, var(--zinc-800), var(--bg-void))',
  color: 'var(--text-muted)',
}
const ACTION_BTN = 'glass-btn inline-flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-40'

export default function SearchOverlay({ onClose }: Props) {
  const [mode, setMode] = useState<SearchMode>('title')
  const { query, setQuery, results, loading, clear } = useTmdbSearch(mode)
  const { watchedIds, watchlistIds, setWatchedIds, setWatchlistIds } = useLibraryIds()
  // The old dashboard dropdown refreshed the route after an action so Recently
  // Watched updated; the overlay now owns that responsibility.
  const router = useRouter()
  const { addToWatchlist, markWatched } = useMediaActions({
    priority: 'want_to_watch',
    onDone: () => router.refresh(),
  })
  const { openMedia } = useMediaModal()

  // KeyboardShortcuts renders this component only after a keypress, so it never
  // exists during SSR — a lazy localStorage read here cannot mismatch hydration.
  const [recents, setRecents] = useState<string[]>(() => readRecentSearches())

  const [activeIndex, setActiveIndex] = useState(0)
  const [actioningId, setActioningId] = useState<number | null>(null)
  const { toast } = useToast()

  const { containerRef } = useModal(handleClose)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Closing resets the query + results. The overlay stays mounted underneath a
  // layered MediaInfoModal, so the reset happens here rather than on unmount.
  function handleClose() {
    clear()
    onClose()
  }

  // The overlay stays mounted under the details modal so the search survives.
  // `onNavigateAway` is the exception: following a link out of the modal should
  // take the whole palette with it, same as picking a person result directly.
  // Remembered when a search is acted on rather than as it is typed — see
  // lib/recentSearches.
  function rememberQuery() {
    setRecents(recordRecentSearch(query))
  }

  function openPerson(name: string) {
    rememberQuery()
    navigateTo(`/person/${encodeURIComponent(name)}`)
  }

  function applyRecent(recent: string) {
    setQuery(recent)
    setActiveIndex(0)
    inputRef.current?.focus()
  }

  function openDetails(result: TmdbSearchResult) {
    rememberQuery()
    openMedia(result, {
      onNavigateAway: handleClose,
      // Focus goes back to the input once the modal is really gone, so the user
      // can keep typing without reaching for the mouse.
      onClosed: () => inputRef.current?.focus(),
      onChanged: (change: MediaChange, changedItem: TmdbSearchResult) => {
        const key = mediaKey(changedItem.type, changedItem.tmdb_id)
        if (change === 'watched') setWatchedIds((prev) => new Set(prev).add(key))
        if (change === 'watchlisted') setWatchlistIds((prev) => new Set(prev).add(key))
        // Recently Watched on the dashboard reads from the route.
        router.refresh()
      },
    })
  }

  // Under two characters there is nothing to search — in title mode the list
  // slot shows destinations instead, so the palette doubles as quick navigation.
  // People mode has no quick-nav; it shows a hint until there's a query.
  const showQuickNav = mode === 'title' && query.trim().length < 2
  // Recents sit above the destinations in the same slot, so they share the
  // arrow-key index space: [recents…, QUICK_NAV…].
  const shownRecents = showQuickNav ? recents : []

  // Typing filters destinations too — prefix match keeps it to what the user
  // is plausibly steering at ("sta" → Stats) without drowning TMDB results.
  // Only in title mode; a person query shouldn't surface page shortcuts.
  const matchedPages = mode === 'title' && query.trim().length >= 2
    ? QUICK_NAV.filter((page) => page.name.toLowerCase().startsWith(query.trim().toLowerCase()))
    : []

  // `results` is a union; the active mode determines which shape came back.
  const titleResults = mode === 'title' ? (results as TmdbSearchResult[]) : []
  const personResults = mode === 'person' ? (results as TmdbPersonResult[]) : []

  // Every row the arrow keys can reach, in render order. Also what
  // aria-activedescendant indexes into.
  const optionCount = showQuickNav
    ? shownRecents.length + QUICK_NAV.length
    : matchedPages.length + results.length
  const optionId = (index: number) => `search-overlay-option-${index}`

  function navigateTo(href: string) {
    router.push(href)
    handleClose()
  }

  // Logging used to cost a modal and a network round-trip: click a row, wait on
  // /api/tmdb/details, find the footer button, click, Escape twice. Everything
  // these need is already in scope, so the palette can just do it.
  async function logWatched(r: TmdbSearchResult) {
    const key = mediaKey(r.type, r.tmdb_id)
    if (watchedIds.has(key) || actioningId !== null) return
    try {
      setActioningId(r.tmdb_id)
      await markWatched(r.tmdb_id, r.type)
      setWatchedIds((prev) => new Set(prev).add(key))
      toast(`Logged ${r.title}.`, { tone: 'success' })
    } catch (err) {
      console.error(err)
      toast(
        isAlreadyWatchedError(err)
          ? `${r.title} is already in your watch history.`
          : err instanceof Error ? err.message : 'Could not log that.',
        { tone: 'error' }
      )
    } finally {
      setActioningId(null)
    }
  }

  async function listForLater(r: TmdbSearchResult) {
    const key = mediaKey(r.type, r.tmdb_id)
    if (watchlistIds.has(key) || actioningId !== null) return
    try {
      setActioningId(r.tmdb_id)
      await addToWatchlist(r.tmdb_id, r.type)
      setWatchlistIds((prev) => new Set(prev).add(key))
      toast(`Added ${r.title} to your watchlist.`, { tone: 'success' })
    } catch (err) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Could not add to your watchlist.', { tone: 'error' })
    } finally {
      setActioningId(null)
    }
  }

  function switchMode(next: SearchMode) {
    if (next === mode) return
    setMode(next)
    setActiveIndex(0)
    inputRef.current?.focus()
  }

  // useModal moves focus to the panel container, but the search input is the
  // element that should own focus — steer it back once the panel exists.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Keep the highlighted row in view as the arrow keys move it. The list's
  // scroll-padding matches its padding so a row at either edge keeps the
  // accent ring inside the scrollport instead of landing flush on it.
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
    const itemCount = optionCount
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (itemCount === 0) return
      setActiveIndex((i) => Math.min(i + 1, itemCount - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (itemCount === 0) return
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      // Modified Enter logs the active title without opening anything. Only
      // meaningful over a title result, so it falls through to plain Enter
      // everywhere else.
      const activeTitle = mode === 'title' && !showQuickNav
        ? titleResults[activeIndex - matchedPages.length]
        : undefined
      if (activeTitle && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        logWatched(activeTitle)
        return
      }
      if (activeTitle && e.shiftKey) {
        e.preventDefault()
        listForLater(activeTitle)
        return
      }
      if (mode === 'person') {
        const p = personResults[activeIndex]
        if (p) {
          e.preventDefault()
          openPerson(p.name)
        }
      } else if (showQuickNav) {
        if (activeIndex < shownRecents.length) {
          e.preventDefault()
          applyRecent(shownRecents[activeIndex])
          return
        }
        const active = QUICK_NAV[activeIndex - shownRecents.length]
        if (active) {
          e.preventDefault()
          navigateTo(active.href)
        }
      } else {
        if (activeIndex < matchedPages.length) {
          const page = matchedPages[activeIndex]
          if (page) {
            e.preventDefault()
            navigateTo(page.href)
          }
        } else {
          const active = titleResults[activeIndex - matchedPages.length]
          if (active) {
            e.preventDefault()
            openDetails(active)
          }
        }
      }
    }
  }

  return (
    <>
    <div
      className="fixed inset-0 z-[45] flex items-start justify-center"
      style={{ background: 'var(--scrim)', paddingTop: '12dvh' }}
      onClick={handleClose}
    >
      {/* The one blurred container of the palette; everything inside is a
          tier-2 fill. */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search movies and TV shows"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(720px, calc(100vw - 32px))' }}
        className="overlay-in glass-panel glass-rim flex flex-col overflow-hidden"
      >
        {/* Input row: the input is the inset well itself, so the global focus
            outline wraps the well rather than drawing inside it. */}
        <div className="relative px-4 pt-4">
          <Search
            size={18}
            strokeWidth={1.8}
            aria-hidden="true"
            className="pointer-events-none absolute left-8 top-1/2 mt-2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          />
          {/* The arrow-key highlight used to be purely visual, so a screen
              reader heard nothing as it moved. Focus stays on the input and
              aria-activedescendant points at the highlighted row instead. */}
          <input
            ref={inputRef}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder={mode === 'person' ? 'Search actors and directors…' : 'Search movies and TV shows…'}
            aria-label={mode === 'person' ? 'Search actors and directors' : 'Search movies and TV shows'}
            autoFocus
            role="combobox"
            aria-expanded={optionCount > 0}
            aria-controls="search-overlay-results"
            aria-autocomplete="list"
            aria-activedescendant={optionCount > 0 ? optionId(activeIndex) : undefined}
            className="glass-inset w-full border-0 placeholder:text-[var(--text-faint)]"
            style={{
              height: 52,
              padding: '0 16px 0 46px',
              fontFamily: 'inherit',
              fontSize: 'var(--text-body)',
              fontWeight: MEDIUM,
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Mode toggles — Titles and People are separate searches, not blended.
            Declared as pressed buttons rather than tabs: the results region is a
            listbox owned by the combobox above, not a tabpanel, so the tab
            pattern was half-implemented and announced a relationship that did
            not exist. */}
        <div className="flex gap-1.5 px-4 pt-3" role="group" aria-label="Search type">
          {([['title', 'Titles'], ['person', 'People']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => switchMode(value)}
              className={`inline-flex min-h-11 items-center rounded-full px-4 transition-colors ${
                mode === value
                  ? 'bg-[var(--glass-fill-active)] text-[var(--text-primary)] shadow-[var(--inset-hairline)] forced-colors:bg-[color:Highlight] forced-colors:text-[color:HighlightText]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--glass-fill-hover)] hover:text-[var(--text-primary)]'
              }`}
              style={{ fontSize: 'var(--text-sm)', lineHeight: '18px', fontWeight: SEMIBOLD, letterSpacing: 'var(--tracking-text)' }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          id="search-overlay-results"
          role="listbox"
          aria-label={mode === 'person' ? 'People' : 'Titles and pages'}
          className="flex max-h-[min(420px,60dvh)] flex-col gap-1 overflow-y-auto scroll-py-3 p-3"
        >
          {showQuickNav && shownRecents.length > 0 && (
            <>
              <div className="flex items-center justify-between" style={GROUP_LABEL}>
                <span>Recent</span>
                <button
                  type="button"
                  onClick={() => setRecents(clearRecentSearches())}
                  className="-my-3 -mr-2 inline-flex min-h-11 items-center rounded-full px-2 transition-colors hover:bg-[var(--glass-fill-hover)] hover:text-[var(--text-primary)]"
                  style={{ fontSize: 'var(--text-xs)', fontWeight: SEMIBOLD, color: 'var(--text-secondary)' }}
                >
                  Clear
                </button>
              </div>
              {shownRecents.map((recent, i) => (
                <div
                  key={recent}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === activeIndex}
                  data-index={i}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => applyRecent(recent)}
                  className={ROW_CLASS}
                  style={rowStyle(i === activeIndex, '0 12px')}
                >
                  <Clock size={18} strokeWidth={1.8} aria-hidden="true" className="shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <span className="truncate" style={ROW_LABEL}>{recent}</span>
                </div>
              ))}
            </>
          )}
          {showQuickNav && (
            <>
              <div style={GROUP_LABEL}>Go to</div>
              {QUICK_NAV.map((item, navIndex) => {
                const i = shownRecents.length + navIndex
                const Icon = item.icon
                return (
                  <div
                    key={item.href}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === activeIndex}
                    data-index={i}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => navigateTo(item.href)}
                    className={ROW_CLASS}
                    style={rowStyle(i === activeIndex, '0 12px')}
                  >
                    <span aria-hidden="true" className="inline-flex shrink-0" style={{ color: 'var(--text-muted)' }}>
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                    </span>
                    <span className="truncate" style={ROW_LABEL}>{item.name}</span>
                  </div>
                )
              })}
            </>
          )}
          {!showQuickNav && matchedPages.length > 0 && (
            <>
              <div style={GROUP_LABEL}>Pages</div>
              {matchedPages.map((page, i) => {
                const Icon = page.icon
                return (
                  <div
                    key={page.href}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === activeIndex}
                    data-index={i}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => navigateTo(page.href)}
                    className={ROW_CLASS}
                    style={rowStyle(i === activeIndex, '0 12px')}
                  >
                    <span aria-hidden="true" className="inline-flex shrink-0" style={{ color: 'var(--text-muted)' }}>
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                    </span>
                    <span className="truncate" style={ROW_LABEL}>{page.name}</span>
                  </div>
                )
              })}
            </>
          )}
          {mode === 'person' && query.trim().length < 2 && (
            <p style={HINT}>Search for an actor or director by name.</p>
          )}
          {query.trim().length >= 2 && loading && (
            <p style={HINT}>Searching…</p>
          )}
          {query.trim().length >= 2 && !loading && results.length === 0 && matchedPages.length === 0 && (
            <div className="py-6 text-center">
              <p style={{ ...HINT, padding: 0 }}>No matches for &ldquo;{query}&rdquo;.</p>
              {/* A dead end used to be the whole answer. The other index is one
                  keystroke away and usually has the thing they meant. */}
              <button
                type="button"
                onClick={() => switchMode(mode === 'title' ? 'person' : 'title')}
                className="btn btn-link mt-2"
                style={{ minHeight: 44, padding: '0 14px', fontSize: 'var(--text-sm)', fontWeight: SEMIBOLD, color: 'var(--accent)' }}
              >
                {mode === 'title'
                  ? `Search people for “${query.trim()}” instead`
                  : `Search titles for “${query.trim()}” instead`}
              </button>
            </div>
          )}
          {personResults.map((p, i) => (
            <div
              key={p.id}
              id={optionId(i)}
              role="option"
              aria-selected={i === activeIndex}
              data-index={i}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => openPerson(p.name)}
              className={ROW_CLASS}
              style={rowStyle(i === activeIndex, '6px 8px')}
            >
              {p.profile_url ? (
                <Image
                  src={p.profile_url}
                  alt=""
                  width={40}
                  height={40}
                  style={{ ...THUMB, width: 40, height: 40, borderRadius: '50%' }}
                />
              ) : (
                <div style={{ ...THUMB_EMPTY, width: 40, height: 40, borderRadius: '50%' }}>
                  <User size={18} strokeWidth={1.8} aria-hidden="true" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate" style={ROW_TITLE}>{p.name}</p>
                {p.known_for && <p className="truncate" style={{ ...ROW_META, marginTop: 2 }}>{p.known_for}</p>}
              </div>
            </div>
          ))}
          {titleResults.map((r, i) => {
            const listIndex = i + matchedPages.length
            const key = mediaKey(r.type, r.tmdb_id)
            const watched = watchedIds.has(key)
            const listed = watchlistIds.has(key)
            return (
              <div
                key={`${r.type}-${r.tmdb_id}`}
                id={optionId(listIndex)}
                role="option"
                aria-selected={listIndex === activeIndex}
                data-index={listIndex}
                onMouseEnter={() => setActiveIndex(listIndex)}
                onClick={() => openDetails(r)}
                className={`group ${ROW_CLASS}`}
                style={rowStyle(listIndex === activeIndex, '6px 8px')}
              >
                {r.poster_url ? (
                  <Image
                    src={r.poster_url}
                    alt=""
                    width={44}
                    height={66}
                    style={{ ...THUMB, width: 44, height: 66, borderRadius: 'var(--radius-thumb)' }}
                  />
                ) : (
                  <div style={{ ...THUMB_EMPTY, width: 44, height: 66, borderRadius: 'var(--radius-thumb)', fontSize: 'var(--text-2xs)', lineHeight: '12px', textAlign: 'center' }}>
                    No Poster
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate" style={ROW_TITLE}>{r.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <span style={ROW_META}>{r.release_year ?? '—'} · {r.type === 'show' ? 'TV Show' : 'Movie'}</span>
                    {watched && (
                      <Badge tone="success">
                        <CheckCircle2 size={12} strokeWidth={1.8} aria-hidden="true" /> Watched
                      </Badge>
                    )}
                    {!watched && listed && (
                      <Badge tone="neutral">
                        <Bookmark size={12} strokeWidth={1.8} aria-hidden="true" /> Watchlist
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Mouse-only shortcuts for the two things people come here to
                    do. Hidden from assistive tech on purpose: interactive
                    controls do not belong inside a listbox option, and keyboard
                    users get the same two actions from ⌘↵ / ⇧↵, which the
                    footer advertises. */}
                <div
                  aria-hidden="true"
                  className={`flex shrink-0 items-center gap-1 transition-opacity ${
                    listIndex === activeIndex ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled={watched || actioningId !== null}
                    title={watched ? 'Already watched' : 'Mark as watched'}
                    onClick={(e) => { e.stopPropagation(); logWatched(r) }}
                    className={`${ACTION_BTN} text-[var(--text-secondary)] hover:text-[var(--accent)]`}
                  >
                    {actioningId === r.tmdb_id
                      ? <Loader2 size={18} strokeWidth={1.8} className="animate-spin" />
                      : <Check size={18} strokeWidth={1.8} />}
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled={listed || watched || actioningId !== null}
                    title={listed ? 'Already on your watchlist' : 'Add to watchlist'}
                    onClick={(e) => { e.stopPropagation(); listForLater(r) }}
                    className={`${ACTION_BTN} text-[var(--text-secondary)] hover:text-[var(--text-primary)]`}
                  >
                    <Plus size={18} strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer. Kbd names the platform's modifier (⌘ or Ctrl); the handler
            has always taken either (KeyboardShortcuts.tsx). */}
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-5 py-3"
          style={{
            borderColor: 'var(--border-divider)',
            fontSize: 'var(--text-xs)',
            lineHeight: '16px',
            fontWeight: MEDIUM,
            color: 'var(--text-muted)',
          }}
        >
          <span className="inline-flex items-center gap-1.5"><Kbd keys="↑↓" mod={false} /> Navigate</span>
          <span className="inline-flex items-center gap-1.5"><Kbd keys="↵" mod={false} /> Open</span>
          {mode === 'title' && !showQuickNav && (
            <>
              <span className="inline-flex items-center gap-1.5"><Kbd keys="↵" /> Watched</span>
              <span className="inline-flex items-center gap-1.5"><Kbd keys="⇧↵" mod={false} /> Watchlist</span>
            </>
          )}
          <span className="inline-flex items-center gap-1.5"><Kbd keys="Esc" mod={false} /> Close</span>
        </div>
      </div>

    </div>

    </>
  )
}
