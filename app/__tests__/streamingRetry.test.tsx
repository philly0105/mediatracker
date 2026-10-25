import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import StreamingPage from '../(app)/streaming/page'
import { ToastProvider } from '@/components/ToastProvider'
import { MediaModalProvider } from '@/components/MediaModalProvider'
import { MultiSelectProvider } from '@/components/MultiSelectProvider'

// Hide watched on, which is what arms auto-fill: it keeps pulling pages while
// the filtered grid holds fewer than a screenful.
const router = { refresh: vi.fn(), push: vi.fn(), back: vi.fn(), replace: vi.fn() }
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams('watched=hide'),
  usePathname: () => '/streaming',
}))

function title(n: number) {
  return { tmdb_id: n, type: 'movie', title: `Title ${n}`, poster_url: null, release_year: 2024, vote_average: 7 }
}

// Twenty unwatched titles fill the grid, so the first provider never needs
// auto-fill; its forty pages are what the second provider's failure used to
// inherit.
const FULL_PAGE = Array.from({ length: 20 }, (_, i) => title(i + 1))

const requests: string[] = []
let failProvider: string | null = null

beforeEach(() => {
  requests.length = 0
  failProvider = '15'
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    disconnect() {}
    unobserve() {}
  })
  vi.stubGlobal('fetch', vi.fn(async (input: unknown) => {
    const u = String(input)
    if (u.startsWith('/api/library/ids')) {
      return { ok: true, json: async () => ({ watched: [], watchlist: [] }) }
    }
    requests.push(u)
    const params = new URLSearchParams(u.split('?')[1] ?? '')
    if (params.get('provider') === failProvider) {
      return { ok: false, status: 500, json: async () => ({ error: 'boom' }) }
    }
    return { ok: true, json: async () => ({ results: FULL_PAGE, total_pages: 40 }) }
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function flush() {
  for (let i = 0; i < 5; i++) await act(async () => { await Promise.resolve() })
}

describe('streaming page after a failed first page', () => {
  it('does not auto-fill onto page 2, and retries from page 1', async () => {
    render(
      <ToastProvider>
        <MediaModalProvider>
          <MultiSelectProvider>
            <StreamingPage />
          </MultiSelectProvider>
        </MediaModalProvider>
      </ToastProvider>
    )
    await flush()
    expect(await screen.findAllByText('Title 1')).not.toHaveLength(0)

    // Switch to a provider whose first page fails. totalPages is still 40
    // from Netflix, and with nothing on screen auto-fill used to read the
    // empty grid as a page Hide watched had filtered bare and ask for page 2.
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Hulu' })) })
    await flush()

    expect(await screen.findByText("Couldn't load what's streaming")).toBeTruthy()
    const hulu = requests.filter((u) => u.includes('provider=15'))
    expect(hulu.every((u) => u.includes('page=1'))).toBe(true)

    // The retry goes back to page 1 and, now that it works, fills the grid.
    failProvider = null
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Try again/ })) })
    await flush()

    const retried = requests.filter((u) => u.includes('provider=15'))
    expect(retried.at(-1)).toContain('page=1')
    expect(screen.queryByText("Couldn't load what's streaming")).toBeNull()
    expect(screen.getAllByText('Title 1')).not.toHaveLength(0)
  })

  it('shows the new provider\'s first page after a switch, rather than skipping to page 2', async () => {
    failProvider = null
    render(
      <ToastProvider>
        <MediaModalProvider>
          <MultiSelectProvider>
            <StreamingPage />
          </MultiSelectProvider>
        </MediaModalProvider>
      </ToastProvider>
    )
    await flush()
    await screen.findAllByText('Title 1')

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Hulu' })) })
    await flush()

    // Hulu's page 1 is asked for and is the only Hulu page: the grid is full
    // from it, so auto-fill has no reason to go further.
    expect(requests.filter((u) => u.includes('provider=15'))).toEqual([
      '/api/streaming?provider=15&type=movie&page=1&sort=popular',
    ])
    expect(screen.getAllByText('Title 1')).not.toHaveLength(0)
  })
})
