import React, { Suspense } from 'react'
import type { ComponentType, HTMLAttributes, ReactNode } from 'react'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import WatchlistPage from '../(app)/watchlist/page'
import { ToastProvider } from '@/components/ToastProvider'
import { MultiSelectProvider } from '@/components/MultiSelectProvider'
import { MediaModalProvider } from '@/components/MediaModalProvider'
import type { WatchlistItem, WatchlistPriority } from '@/types'

type MotionDivProps = HTMLAttributes<HTMLDivElement> & {
  initial?: unknown
  animate?: unknown
  exit?: unknown
  transition?: unknown
}

function stripMotionProps({ ...props }: MotionDivProps): HTMLAttributes<HTMLDivElement> {
  delete props.initial
  delete props.animate
  delete props.exit
  delete props.transition
  return props
}

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  motion: { div: (props: MotionDivProps) => <div {...stripMotionProps(props)} /> },
}))

vi.mock('next/dynamic', () => ({
  default: (
    loader: () => Promise<{ default: ComponentType<any> } | ComponentType<any>>,
    options?: { loading?: ComponentType<any>; ssr?: boolean }
  ) => {
    const LazyComponent = React.lazy(async () => {
      const mod = await loader()
      if (mod && typeof mod === 'object' && 'default' in mod) {
        return mod as { default: ComponentType<any> }
      }
      return { default: mod as ComponentType<any> }
    })

    return function DynamicComponent(props: any) {
      return (
        <Suspense fallback={options?.loading ? <options.loading /> : null}>
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

/** The cards inside one priority section, in DOM order. */
function sectionTitles(heading: string): string[] {
  const h2 = screen.getByRole('heading', { name: heading, level: 2 })
  const section = h2.closest('div')!.parentElement!
  return within(section)
    .queryAllByRole('button')
    .map((b) => b.getAttribute('aria-label'))
    .filter((label): label is string => !!label && store.must_watch.concat(store.want_to_watch, store.someday).some((i) => i.media?.title === label))
}

async function loadPage() {
  renderPage()
  await act(async () => { await Promise.resolve() })
  await screen.findByRole('heading', { name: 'Must Watch', level: 2 })
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

    expect(screen.getByText('Wanted One')).toBeTruthy()
    expect(screen.getByText('Someday One')).toBeTruthy()
    // Genres came from the grouped payload, so the dropdown is populated.
    expect(screen.getByRole('option', { name: 'Drama' })).toBeTruthy()
  })

  it('previews a bucket and expands it on demand instead of infinite-scrolling', async () => {
    await loadPage()

    // 20 rows in Must Watch, but only a page of them is on screen.
    expect(screen.getByText('Must 0')).toBeTruthy()
    expect(screen.queryByText('Must 12')).toBeNull()

    const expander = screen.getByRole('button', { name: /Show all 20/ })
    await act(async () => { fireEvent.click(expander) })

    expect(screen.getByText('Must 12')).toBeTruthy()
    // Everything is loaded, so the expander is gone.
    expect(screen.queryByRole('button', { name: /Show all|Load \d+ more/ })).toBeNull()
  })

  it('does not offer an expander for a bucket that fits in one page', async () => {
    await loadPage()

    const wantHeading = screen.getByRole('heading', { name: 'Want to Watch', level: 2 })
    const section = wantHeading.closest('div')!.parentElement!
    expect(within(section).queryByRole('button', { name: /Show all/ })).toBeNull()
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
    expect(sectionTitles('Must Watch')).toEqual(['Alpha', 'Bravo', 'Charlie'])

    await act(async () => { fireEvent.click(screen.getAllByLabelText('Remove')[1]) })
    expect(sectionTitles('Must Watch')).toEqual(['Alpha', 'Charlie'])

    await act(async () => { fireEvent.click(await screen.findByRole('button', { name: 'Undo' })) })
    expect(sectionTitles('Must Watch')).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('puts a moved row back where it was, not at the end', async () => {
    await loadPage()

    await act(async () => { fireEvent.click(screen.getAllByLabelText('Move to Someday')[0]) })
    expect(sectionTitles('Must Watch')).toEqual(['Bravo', 'Charlie'])

    await act(async () => { fireEvent.click(await screen.findByRole('button', { name: 'Undo' })) })
    expect(sectionTitles('Must Watch')).toEqual(['Alpha', 'Bravo', 'Charlie'])
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
