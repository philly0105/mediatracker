import React, { Suspense } from 'react'
import type { ComponentType } from 'react'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import WatchlistPage from '../(app)/watchlist/page'
import { ToastProvider } from '@/components/ToastProvider'
import { MultiSelectProvider } from '@/components/MultiSelectProvider'
import { MediaModalProvider } from '@/components/MediaModalProvider'
import type { WatchlistItem, WatchlistPriority } from '@/types'




vi.mock('next/dynamic', () => ({
  default: <P extends object>(
    loader: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>,
    options?: { loading?: ComponentType<unknown>; ssr?: boolean }
  ) => {
    const LazyComponent = React.lazy(async () => {
      const mod = await loader()
      if (mod && typeof mod === 'object' && 'default' in mod) {
        return mod as { default: ComponentType<P> }
      }
      return { default: mod as ComponentType<P> }
    })

    return function DynamicComponent(props: P) {
      const Loading = options?.loading
      return (
        <Suspense fallback={Loading ? <Loading /> : null}>
          <LazyComponent {...props} />
        </Suspense>
      )
    }
  },
}))

// One object, not a fresh one per call: useUrlFilters derives setFilter's
// identity from the router's, and a page effect that depends on setFilter would
// otherwise re-run on every render.
const router = { refresh: vi.fn(), push: vi.fn(), back: vi.fn(), replace: vi.fn() }
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/watchlist',
}))

function item(id: string, title: string, priority: WatchlistPriority): WatchlistItem {
  return {
    id,
    user_id: 'u1',
    media_id: `m-${id}`,
    priority,
    added_at: '2026-01-01T00:00:00Z',
    media: {
      id: `m-${id}`,
      tmdb_id: Number(id.replace(/\D/g, '')) || 1,
      type: 'movie',
      title,
      overview: null,
      poster_url: null,
      genres: ['Drama'],
      release_year: 2020,
      runtime_mins: 100,
      director: null,
      vote_average: 7.5,
      cast_members: [],
      collection_id: null,
      collection_name: null,
    },
  } as WatchlistItem
}

const mockFetch = vi.fn()

/** Rows the fake API holds per bucket. The route pages over these. */
let store: Record<WatchlistPriority, WatchlistItem[]>

function url(input: unknown) {
  return String(input)
}

function respondGrouped(u: string) {
  const params = new URLSearchParams(u.split('?')[1] ?? '')
  const limit = Number(params.get('limit') ?? 12)
  const groups = Object.fromEntries(
    (['must_watch', 'want_to_watch', 'someday'] as const).map((p) => [
      p,
      { items: store[p].slice(0, limit), total: store[p].length },
    ])
  )
  return { ok: true, json: async () => ({ groups, genres: ['Drama'], page: 1, limit }) }
}

function respondPaged(u: string) {
  const params = new URLSearchParams(u.split('?')[1] ?? '')
  const priority = params.get('priority') as WatchlistPriority
  const page = Number(params.get('page') ?? 1)
  const limit = Number(params.get('limit') ?? 12)
  const offset = (page - 1) * limit
  return {
    ok: true,
    json: async () => ({
      items: store[priority].slice(offset, offset + limit),
      total: store[priority].length,
      page,
      limit,
    }),
  }
}

function renderPage() {
  return render(
    <ToastProvider>
      <MediaModalProvider>
        <MultiSelectProvider>
          <WatchlistPage />
        </MultiSelectProvider>
      </MediaModalProvider>
    </ToastProvider>,
  )
}

/** A fixture row has no poster, so the PosterCard paints its title in the
 *  empty frame as well as the caption; text queries read the caption. */
const CAPTION = { selector: '.poster-card-title' }

/** The cards inside one priority section, in DOM order. Each card is a
 *  PosterCard, whose caption carries the title. */
function sectionTitles(heading: string): string[] {
  const h2 = screen.getByRole('heading', { name: heading, level: 2 })
  const section = h2.closest('section')!
  return Array.from(section.querySelectorAll('.poster-card-title'))
    .map((el) => el.textContent ?? '')
    .filter((title) => store.must_watch.concat(store.want_to_watch, store.someday).some((i) => i.media?.title === title))
}

/** One bucket is on screen at a time; the priority segments switch it. */
async function showBucket(label: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(`^${label}`) }))
  })
}

async function loadPage() {
  renderPage()
  await act(async () => { await Promise.resolve() })
  await screen.findByRole('heading', { name: 'Must watch', level: 2 })
}

describe('watchlist grouped load (F-32)', () => {
  beforeEach(() => {
    store = {
      must_watch: Array.from({ length: 20 }, (_, i) => item(`mw${i}`, `Must ${i}`, 'must_watch')),
      want_to_watch: [item('w1', 'Wanted One', 'want_to_watch')],
      someday: [item('s1', 'Someday One', 'someday')],
    }
    mockFetch.mockReset()
    mockFetch.mockImplementation(async (input: unknown, init?: { method?: string }) => {
      const u = url(input)
      if (!init?.method || init.method === 'GET') {
        if (u.includes('group=priority')) return respondGrouped(u)
        return respondPaged(u)
      }
      return { ok: true, json: async () => ({}) }
    })
    global.fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // The old page fired four: one per section plus a separate facets call.
  it('loads every bucket and the genre facets in a single request', async () => {
    await loadPage()

    const gets = mockFetch.mock.calls.filter((c) => !c[1] || c[1].method === 'GET')
    expect(gets.length).toBe(1)
    expect(url(gets[0][0])).toContain('group=priority')
    // The facets call is gone; genres arrive with the same response.
    expect(gets.some((c) => url(c[0]).includes('facets=1'))).toBe(false)

    // Every bucket arrived with the one request: switching tabs fetches nothing.
    await showBucket('Want to watch')
    expect(screen.getByText('Wanted One', CAPTION)).toBeTruthy()
    await showBucket('Someday')
    expect(screen.getByText('Someday One', CAPTION)).toBeTruthy()
    expect(mockFetch.mock.calls.filter((c) => !c[1] || c[1].method === 'GET').length).toBe(1)
    // The counts ride on the segments.
    expect(screen.getByRole('radio', { name: 'Must watch · 20' })).toBeTruthy()
    // Genres came from the grouped payload, so the dropdown is populated.
    expect(screen.getByRole('option', { name: 'Drama' })).toBeTruthy()
  })

  it('previews a bucket and expands it on demand instead of infinite-scrolling', async () => {
    await loadPage()

    // 20 rows in Must watch, but only a page of them is on screen.
    expect(screen.getByText('Must 0', CAPTION)).toBeTruthy()
    expect(screen.queryByText('Must 12', CAPTION)).toBeNull()

    const expander = screen.getByRole('button', { name: /Show all 20/ })
    await act(async () => { fireEvent.click(expander) })

    expect(screen.getByText('Must 12', CAPTION)).toBeTruthy()
    // Everything is loaded, so the expander is gone.
    expect(screen.queryByRole('button', { name: /Show all|Load \d+ more/ })).toBeNull()
  })

  it('does not offer an expander for a bucket that fits in one page', async () => {
    await loadPage()
    await showBucket('Want to watch')

    const wantHeading = screen.getByRole('heading', { name: 'Want to watch', level: 2 })
    const section = wantHeading.closest('section')!
    expect(within(section).getByText('Wanted One', CAPTION)).toBeTruthy()
    expect(within(section).queryByRole('button', { name: /Show all/ })).toBeNull()
  })

  // Adding from a title's details defaults to Want to watch, so a fresh
  // watchlist often has nothing in Must watch; the page must not open on an
  // empty tab with everything behind the one beside it.
  it('opens on the first bucket with something in it', async () => {
    store = {
      must_watch: [],
      want_to_watch: [item('w1', 'Wanted One', 'want_to_watch')],
      someday: [item('s1', 'Someday One', 'someday')],
    }
    renderPage()
    await act(async () => { await Promise.resolve() })

    await screen.findByRole('heading', { name: 'Want to watch', level: 2 })
    expect(screen.getByRole('radio', { name: 'Want to watch · 1' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByText('Wanted One', CAPTION)).toBeTruthy()
    expect(screen.queryByText(/Nothing in Must watch yet/)).toBeNull()
  })

  // A brand-new account used to get the full seven-control toolbar over one
  // compact "set a title's priority from its details" — circular advice for
  // someone with no titles anywhere, and nothing to click.
  it('replaces the toolbar with one way out when every bucket is empty', async () => {
    store = { must_watch: [], want_to_watch: [], someday: [] }
    renderPage()
    await act(async () => { await Promise.resolve() })

    expect(await screen.findByText('Your watchlist is empty')).toBeTruthy()
    expect(
      screen.getByText(
        'Search for a film or show and add it here. Sort what you add into Must watch, Want to watch and Someday.'
      )
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: /Search to add one/ })).toBeTruthy()

    // None of the seven controls is on screen: every one of them acts on
    // titles, and there are none.
    expect(screen.queryByRole('radio', { name: /^Must watch/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Pick for me' })).toBeNull()
    expect(screen.queryByLabelText('Search your watchlist')).toBeNull()
    expect(screen.queryByText(/Nothing in Must watch yet/)).toBeNull()
  })

  // The per-bucket empty state still has a job: the other buckets have rows.
  it('keeps the compact per-bucket empty state when another bucket has rows', async () => {
    store = {
      must_watch: [],
      want_to_watch: [item('w1', 'Wanted One', 'want_to_watch')],
      someday: [],
    }
    renderPage()
    await act(async () => { await Promise.resolve() })

    await screen.findByRole('heading', { name: 'Want to watch', level: 2 })
    await showBucket('Must watch')
    expect(screen.getByText('Nothing in Must watch yet')).toBeTruthy()
    expect(screen.queryByText('Your watchlist is empty')).toBeNull()
  })

  // A failed load clears the groups too, and empty groups after a 500 used to
  // read exactly like a new account: "Your watchlist is empty", toolbar gone.
  it('says the load failed rather than that the watchlist is empty, and retries', async () => {
    let failNext = true
    const fallback = mockFetch.getMockImplementation()!
    mockFetch.mockImplementation(async (input: unknown, init?: { method?: string }) => {
      if (failNext && url(input).includes('group=priority')) {
        failNext = false
        return { ok: false, status: 500, json: async () => ({ error: 'boom' }) }
      }
      return fallback(input, init)
    })

    renderPage()
    await act(async () => { await Promise.resolve() })

    expect(await screen.findByText("Couldn't load your watchlist")).toBeTruthy()
    expect(screen.queryByText('Your watchlist is empty')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('Your watchlist did not load.')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Try again/ }))
    })
    await screen.findByRole('heading', { name: 'Must watch', level: 2 })
    expect(screen.queryByText("Couldn't load your watchlist")).toBeNull()
  })
})

describe('watchlist undo restores position (F-32)', () => {
  beforeEach(() => {
    store = {
      must_watch: ['Alpha', 'Bravo', 'Charlie'].map((t, i) => item(`mw${i}`, t, 'must_watch')),
      want_to_watch: [],
      someday: [],
    }
    mockFetch.mockReset()
    mockFetch.mockImplementation(async (input: unknown, init?: { method?: string }) => {
      const u = url(input)
      if (!init?.method || init.method === 'GET') {
        if (u.includes('group=priority')) return respondGrouped(u)
        return respondPaged(u)
      }
      return { ok: true, json: async () => ({}) }
    })
    global.fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Undo used to re-append, dropping the card at the bottom of the bucket.
  it('puts a removed row back where it was, not at the end', async () => {
    await loadPage()
    expect(sectionTitles('Must watch')).toEqual(['Alpha', 'Bravo', 'Charlie'])

    await act(async () => { fireEvent.click(screen.getAllByLabelText('Remove')[1]) })
    expect(sectionTitles('Must watch')).toEqual(['Alpha', 'Charlie'])

    await act(async () => { fireEvent.click(await screen.findByRole('button', { name: 'Undo' })) })
    expect(sectionTitles('Must watch')).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('puts a moved row back where it was, not at the end', async () => {
    await loadPage()

    await act(async () => { fireEvent.click(screen.getAllByLabelText('Move to Someday')[0]) })
    expect(sectionTitles('Must watch')).toEqual(['Bravo', 'Charlie'])

    await act(async () => { fireEvent.click(await screen.findByRole('button', { name: 'Undo' })) })
    expect(sectionTitles('Must watch')).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })
})

describe('watchlist on-demand tonight pick modal', () => {
  beforeEach(() => {
    store = {
      must_watch: [item('mw1', 'Inception', 'must_watch')],
      want_to_watch: [],
      someday: [],
    }
    mockFetch.mockReset()
    mockFetch.mockImplementation(async (input: unknown, init?: { method?: string }) => {
      const u = url(input)
      if (!init?.method || init.method === 'GET') {
        if (u.includes('group=priority')) return respondGrouped(u)
        return respondPaged(u)
      }
      return { ok: true, json: async () => ({}) }
    })
    global.fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mounts TonightPickModal on demand when Pick for me is clicked', async () => {
    await loadPage()
    expect(screen.queryByRole('dialog')).toBeNull()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Pick for me' }))
    })

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText("Tonight's Pick")).toBeInTheDocument()
  })
})
