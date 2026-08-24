'use client'
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useMediaActions } from '@/lib/useMediaActions'
import type { TmdbSearchResult, WatchlistPriority } from '@/types'

const MediaModalStack = dynamic(() => import('./MediaModalStack'))

/** What just succeeded, so a caller keeping its own list or badge state can react. */
export type MediaChange = 'watchlisted' | 'watched' | 'removed'

export interface OpenMediaOptions {
  /**
   * Fired after one of the default actions succeeds. This is the hook for pages
   * that keep local state the server does not push back — the ⌘K overlay's id
   * sets, the streaming grid's badges, the recommendations list it removes the
   * card from.
   */
  onChanged?: (change: MediaChange, item: TmdbSearchResult) => void
  /**
   * Fired once the modal has finished animating out. Later than `onClose` would
   * be — the ⌘K overlay uses it to take focus back, which has to happen after
   * the modal is really gone or focus lands on a dying element.
   */
  onClosed?: () => void
  /** Show "Remove from Watchlist" wired to the default remove + `onChanged`. */
  enableRemove?: boolean
  /** Which bucket the default "Add to Watchlist" writes to. The calendar,
   *  /person and /recommendations all add as `must_watch`; the default is
   *  `want_to_watch`, matching every other surface. */
  priority?: WatchlistPriority
  currentPriority?: WatchlistPriority
  onUpdatePriority?: (priority: WatchlistPriority) => Promise<void>
  /** Each of these replaces the default handler outright. */
  onAddToWatchlist?: () => Promise<void>
  onMarkAsWatched?: (opts?: { rewatch?: boolean }) => Promise<void>
  onRemoveFromWatchlist?: () => Promise<void>
  /** Tear down whatever host opened this when a link navigates the tab away. */
  onNavigateAway?: () => void
  newTabLinks?: boolean
}

interface MediaModalApi {
  openMedia: (item: TmdbSearchResult, options?: OpenMediaOptions) => void
  /** Close the topmost modal. */
  closeMedia: () => void
}

export interface StackEntry {
  key: number
  item: TmdbSearchResult
  options: OpenMediaOptions
}

const MediaModalContext = createContext<MediaModalApi | null>(null)

export function useMediaModal(): MediaModalApi {
  const ctx = useContext(MediaModalContext)
  if (!ctx) throw new Error('useMediaModal must be used inside <MediaModalProvider>')
  return ctx
}

/**
 * One owner for `MediaInfoModal`, which used to be wired up by hand at thirteen
 * call sites. Each of those built its own `onAddToWatchlist` / `onMarkAsWatched`
 * with slightly different optimistic updates and refresh behaviour, and twelve
 * of the thirteen forgot the `<AnimatePresence>` that `MediaInfoModal`'s own
 * `exit` prop needs — so the modal sprang in and then vanished on a hard cut.
 *
 * It holds a *stack*, not a single modal: `MediaInfoModal` renders `SimilarModal`,
 * which opens another `MediaInfoModal` on top. A single slot would replace the
 * modal underneath, and closing the inner one would drop you back to nothing.
 * Every entry stays mounted, which is what the hand-wired nesting did too.
 */
export function MediaModalProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<StackEntry[]>([])
  const [hostLoaded, setHostLoaded] = useState(false)
  const actions = useMediaActions()

  // The ref is the source of truth and the state is its mirror for rendering.
  // Reading the live stack inside a functional updater would mean firing the
  // `onClosed` side effect from inside it, which has to stay pure.
  const stackRef = useRef<StackEntry[]>([])
  const keyRef = useRef(0)
  // Entries whose exit animation is still running. Drained on exit-complete.
  const closingRef = useRef<StackEntry[]>([])

  const openMedia = useCallback((item: TmdbSearchResult, options: OpenMediaOptions = {}) => {
    setHostLoaded(true)
    keyRef.current += 1
    stackRef.current = [...stackRef.current, { key: keyRef.current, item, options }]
    setStack(stackRef.current)
  }, [])

  const closeMedia = useCallback(() => {
    const top = stackRef.current[stackRef.current.length - 1]
    if (!top) return
    closingRef.current.push(top)
    stackRef.current = stackRef.current.slice(0, -1)
    setStack(stackRef.current)
  }, [])

  // A link inside the modal navigated this tab. Tear the whole stack down and
  // let each host clean itself up — the ⌘K overlay closes rather than being
  // left behind under a modal that is no longer there.
  const closeAllForNavigation = useCallback(() => {
    const closing = stackRef.current
    closingRef.current.push(...closing)
    stackRef.current = []
    setStack([])
    for (let i = closing.length - 1; i >= 0; i--) closing[i].options.onNavigateAway?.()
  }, [])

  const handleExitComplete = useCallback(() => {
    const drained = closingRef.current
    closingRef.current = []
    for (const entry of drained) entry.options.onClosed?.()
  }, [])

  const api = useMemo<MediaModalApi>(() => ({ openMedia, closeMedia }), [openMedia, closeMedia])

  return (
    <MediaModalContext.Provider value={api}>
      {children}
      {hostLoaded && (
        <MediaModalStack
          entries={stack}
          onClose={closeMedia}
          onNavigateAway={closeAllForNavigation}
          onExitComplete={handleExitComplete}
          actions={actions}
        />
      )}
    </MediaModalContext.Provider>
  )
}
