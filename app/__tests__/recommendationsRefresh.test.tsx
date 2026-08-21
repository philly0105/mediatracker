import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RecommendationsPage from '../(app)/recommendations/page'
import { ToastProvider } from '@/components/ToastProvider'
import { MultiSelectProvider } from '@/components/MultiSelectProvider'
import { MediaModalProvider } from '@/components/MediaModalProvider'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/recommendations',
}))

// The modal is irrelevant here and drags in framer-motion plus a TMDB details
// fetch that would pollute the request assertions below.
vi.mock('@/components/MediaInfoModal', () => ({ default: () => null }))

const mockFetch = vi.fn()

function rec(id: number, title: string) {
  return {
    tmdb_id: id,
    type: 'movie' as const,
    title,
    overview: '',
    poster_url: null,
    release_year: 2020,
    genres: ['Drama'],
  }
}

function recUrls() {
  return mockFetch.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.startsWith('/api/recommendations'))
}

function renderPage() {
  return render(
    <ToastProvider>
      <MediaModalProvider>
        <MultiSelectProvider>
          <RecommendationsPage />
        </MultiSelectProvider>
      </MediaModalProvider>
    </ToastProvider>
  )
}

describe('RecommendationsPage refresh', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    })
  })

  it('fetches once on mount', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ results: [rec(1, 'Heat')] }) })

    renderPage()
    await screen.findByText('Heat')

    expect(recUrls()).toEqual(['/api/recommendations'])
  })

  it('sends exactly one request per Refresh, with an incrementing cycle', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ results: [rec(1, 'Heat')] }) })

    renderPage()
    await screen.findByText('Heat')
    mockFetch.mockClear()

    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ results: [rec(2, 'Sicario')] }) })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Refresh/ }))
    })

    // One request, not three. The second of those three used to carry no
    // cycle at all and overwrote the rotated set with the original one.
    expect(recUrls()).toEqual(['/api/recommendations?refresh=1&cycle=1'])
    expect(screen.getByText('Sicario')).toBeInTheDocument()
    expect(screen.queryByText('Heat')).not.toBeInTheDocument()

    mockFetch.mockClear()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ results: [rec(3, 'Arrival')] }) })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Refresh/ }))
    })

    expect(recUrls()).toEqual(['/api/recommendations?refresh=1&cycle=2'])
    expect(screen.getByText('Arrival')).toBeInTheDocument()
  })

  it('keeps advancing the cycle after a failed refresh recovers', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ results: [rec(1, 'Heat')] }) })
    renderPage()
    await screen.findByText('Heat')
    mockFetch.mockClear()

    mockFetch.mockResolvedValue({ ok: false, json: async () => ({}) })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Refresh/ }))
    })
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // The failed press must not consume a cycle, or Refresh would skip a window.
    mockFetch.mockClear()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ results: [rec(2, 'Sicario')] }) })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))
    })
    expect(recUrls()).toEqual(['/api/recommendations'])
  })
})
