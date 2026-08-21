import type { HTMLAttributes, ReactNode } from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SearchOverlay from '../SearchOverlay'
import { ToastProvider } from '../ToastProvider'
import { QUICK_NAV } from '@/lib/quickNav'
import type { TmdbSearchResult, TmdbPersonResult } from '@/types'

// The palette stacks three option groups into one arrow-key index space —
// recents, matched pages, and TMDB results — and `aria-activedescendant` has to
// point at whichever row that index lands on. The offset arithmetic is spread
// across the Enter handler and three separate render loops, which is exactly
// where an off-by-one hides. These tests pin the mapping from both ends: the
// index the keyboard is on, and the row the screen reader is told about.

type MotionDivProps = HTMLAttributes<HTMLDivElement> & {
  initial?: unknown; animate?: unknown; exit?: unknown; transition?: unknown
}
function strip({ ...p }: MotionDivProps): HTMLAttributes<HTMLDivElement> {
  delete p.initial; delete p.animate; delete p.exit; delete p.transition
  return p
}
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  motion: { div: (props: MotionDivProps) => <div {...strip(props)} /> },
}))

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh, replace: vi.fn() }),
}))

vi.mock('@/lib/useLibraryIds', () => ({
  useLibraryIds: () => ({
    watchedIds: new Set<number>(),
    watchlistIds: new Set<number>(),
    setWatchedIds: vi.fn(),
    setWatchlistIds: vi.fn(),
  }),
}))

const openMedia = vi.fn()
vi.mock('@/components/MediaModalProvider', () => ({
  useMediaModal: () => ({ openMedia, closeMedia: vi.fn() }),
}))

const markWatched = vi.fn(async () => new Response(null, { status: 200 }))
const addToWatchlist = vi.fn(async () => new Response(null, { status: 200 }))
vi.mock('@/lib/useMediaActions', () => ({
  useMediaActions: () => ({ markWatched, addToWatchlist }),
  isAlreadyWatchedError: () => false,
}))

function installStorage() {
  const map = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    writable: true,
    value: {
      get length() { return map.size },
      clear: () => map.clear(),
      getItem: (k: string) => map.get(k) ?? null,
      key: (i: number) => Array.from(map.keys())[i] ?? null,
      removeItem: (k: string) => { map.delete(k) },
      setItem: (k: string, v: string) => { map.set(k, v) },
    },
  })
}

function title(id: number, name: string): TmdbSearchResult {
  return { tmdb_id: id, type: 'movie', title: name, overview: '', poster_url: null, release_year: 2020 }
}
function person(id: number, name: string): TmdbPersonResult {
  return { id, name, profile_url: null, known_for: 'Acting' } as TmdbPersonResult
}

let titleResults: TmdbSearchResult[] = []
let personResults: TmdbPersonResult[] = []

function open() {
  return render(
    <ToastProvider>
      <SearchOverlay onClose={vi.fn()} />
    </ToastProvider>
  )
}

function input() {
  return screen.getByRole('combobox')
}

/** The row `aria-activedescendant` currently points at. */
function activeRow(): HTMLElement | null {
  const id = input().getAttribute('aria-activedescendant')
  return id ? document.getElementById(id) : null
}

/** Types a query and lets the 350 ms debounce and its fetch settle. */
async function search(text: string) {
  fireEvent.change(input(), { target: { value: text } })
  await act(async () => { vi.advanceTimersByTime(400) })
  await act(async () => { await Promise.resolve() })
}

function press(key: string, init: Partial<KeyboardEvent> = {}) {
  fireEvent.keyDown(input(), { key, ...init })
}

describe('SearchOverlay option indexing', () => {
  beforeEach(() => {
    installStorage()
    titleResults = []
    personResults = []
    push.mockReset()
    openMedia.mockReset()
    markWatched.mockReset()
    addToWatchlist.mockReset()
    HTMLElement.prototype.scrollIntoView = vi.fn()
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      ok: true,
      json: async () => ({ results: url.includes('type=person') ? personResults : titleResults }),
    })))
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts on the first quick-nav destination', () => {
    open()
    expect(activeRow()).toHaveTextContent(QUICK_NAV[0].name)
  })

  it('moves the highlight and the activedescendant together', () => {
    open()
    press('ArrowDown')
    expect(activeRow()).toHaveTextContent(QUICK_NAV[1].name)
    expect(activeRow()).toHaveAttribute('aria-selected', 'true')
    // Exactly one row is selected at a time.
    expect(screen.getAllByRole('option').filter(o => o.getAttribute('aria-selected') === 'true')).toHaveLength(1)
  })

  it('clamps at both ends of the quick-nav list', () => {
    open()
    press('ArrowUp')
    expect(activeRow()).toHaveTextContent(QUICK_NAV[0].name)

    for (let i = 0; i < QUICK_NAV.length + 5; i++) press('ArrowDown')
    expect(activeRow()).toHaveTextContent(QUICK_NAV[QUICK_NAV.length - 1].name)
  })

  it('offsets the quick-nav rows by the recents above them', () => {
    window.localStorage.setItem('dorfmovies:recent-searches', JSON.stringify(['heat', 'sicario']))
    open()

    // [heat, sicario, Dashboard, Library, …]
    expect(activeRow()).toHaveTextContent('heat')
    press('ArrowDown')
    expect(activeRow()).toHaveTextContent('sicario')
    press('ArrowDown')
    expect(activeRow()).toHaveTextContent(QUICK_NAV[0].name)
  })

  it('Enter on a recent refills the input rather than navigating', () => {
    window.localStorage.setItem('dorfmovies:recent-searches', JSON.stringify(['heat']))
    open()
    press('Enter')
    expect(input()).toHaveValue('heat')
    expect(push).not.toHaveBeenCalled()
  })

  it('Enter on a quick-nav row below the recents navigates to that row', () => {
    window.localStorage.setItem('dorfmovies:recent-searches', JSON.stringify(['heat']))
    open()
    press('ArrowDown')  // index 1 → QUICK_NAV[0]
    press('Enter')
    expect(push).toHaveBeenCalledWith(QUICK_NAV[0].href)
  })

  it('offsets title results by the matched pages above them', async () => {
    // "sta" prefix-matches the Stats destination and also returns two titles.
    titleResults = [title(1, 'Stalker'), title(2, 'Stand By Me')]
    open()
    await search('sta')

    expect(activeRow()).toHaveTextContent('Stats')
    press('ArrowDown')
    expect(activeRow()).toHaveTextContent('Stalker')
    press('ArrowDown')
    expect(activeRow()).toHaveTextContent('Stand By Me')
  })

  it('opens the title the offset index points at, not the one at the raw index', async () => {
    titleResults = [title(1, 'Stalker'), title(2, 'Stand By Me')]
    open()
    await search('sta')

    press('ArrowDown')  // index 1 → titleResults[0]
    press('Enter')
    expect(openMedia).toHaveBeenCalledTimes(1)
    expect(openMedia.mock.calls[0][0]).toMatchObject({ title: 'Stalker' })
  })

  it('treats modified Enter over a matched page as plain Enter', async () => {
    titleResults = [title(1, 'Stalker')]
    open()
    await search('sta')

    // Index 0 is the Stats page. `titleResults[0 - 1]` is undefined, so Cmd+Enter
    // must fall through to navigation instead of logging the wrong title.
    press('Enter', { metaKey: true })
    expect(markWatched).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/stats')
  })

  it('logs the active title on modified Enter once the index is past the pages', async () => {
    titleResults = [title(1, 'Stalker')]
    open()
    await search('sta')

    press('ArrowDown')
    press('Enter', { metaKey: true })
    await waitFor(() => expect(markWatched).toHaveBeenCalledWith(1, 'movie'))
    expect(push).not.toHaveBeenCalled()
  })

  it('Shift+Enter over a title adds it to the watchlist', async () => {
    titleResults = [title(1, 'Stalker')]
    open()
    await search('sta')

    press('ArrowDown')
    press('Enter', { shiftKey: true })
    await waitFor(() => expect(addToWatchlist).toHaveBeenCalledWith(1, 'movie'))
    expect(openMedia).not.toHaveBeenCalled()
  })
})

describe('SearchOverlay mode switching', () => {
  beforeEach(() => {
    installStorage()
    titleResults = []
    personResults = []
    push.mockReset()
    HTMLElement.prototype.scrollIntoView = vi.fn()
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      ok: true,
      json: async () => ({ results: url.includes('type=person') ? personResults : titleResults }),
    })))
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('relabels the input and the listbox', () => {
    open()
    expect(screen.getByRole('listbox')).toHaveAccessibleName('Titles and pages')

    fireEvent.click(screen.getByRole('button', { name: 'People' }))
    expect(screen.getByRole('listbox')).toHaveAccessibleName('People')
    expect(screen.getByRole('combobox')).toHaveAccessibleName('Search actors and directors')
  })

  it('reports the pressed state on exactly one mode button', () => {
    open()
    expect(screen.getByRole('button', { name: 'Titles' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'People' })).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(screen.getByRole('button', { name: 'People' }))
    expect(screen.getByRole('button', { name: 'Titles' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'People' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('drops quick nav in people mode, so there is nothing to point at', () => {
    open()
    fireEvent.click(screen.getByRole('button', { name: 'People' }))

    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    expect(input()).not.toHaveAttribute('aria-activedescendant')
  })

  it('indexes person results from zero, with no page offset', async () => {
    personResults = [person(10, 'Ridley Scott'), person(11, 'Ridley Bent')]
    open()
    fireEvent.click(screen.getByRole('button', { name: 'People' }))
    await search('ridley')

    expect(activeRow()).toHaveTextContent('Ridley Scott')
    press('ArrowDown')
    expect(activeRow()).toHaveTextContent('Ridley Bent')
    press('Enter')
    expect(push).toHaveBeenCalledWith('/person/Ridley%20Bent')
  })

  it('resets the highlight to the top when the mode flips', async () => {
    titleResults = [title(1, 'Stalker'), title(2, 'Stand By Me')]
    personResults = [person(10, 'Stan Lee')]
    open()
    await search('sta')
    press('ArrowDown')
    press('ArrowDown')
    expect(activeRow()).toHaveTextContent('Stand By Me')

    fireEvent.click(screen.getByRole('button', { name: 'People' }))
    await act(async () => { await Promise.resolve() })
    expect(activeRow()).toHaveTextContent('Stan Lee')
  })

  it('offers the other index instead of dead-ending on no matches', async () => {
    titleResults = []
    open()
    await search('zzzzzz')

    const nudge = screen.getByRole('button', { name: /Search people for/ })
    fireEvent.click(nudge)
    expect(screen.getByRole('listbox')).toHaveAccessibleName('People')
  })
})
