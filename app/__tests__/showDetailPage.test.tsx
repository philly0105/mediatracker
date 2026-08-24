import type { HTMLAttributes, ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import ShowDetailPage from '@/app/(app)/show/[id]/page'
import ShowDetailClient from '@/components/ShowDetailClient'
import { ToastProvider } from '@/components/ToastProvider'
import { MediaModalProvider } from '@/components/MediaModalProvider'
import * as serverAuth from '@/lib/supabase/server'
import * as showDetailsModule from '@/lib/showDetails'
import * as navigation from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ShowDetails } from '@/lib/showDetails'
import type { ReactElement } from 'react'

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

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/showDetails', () => ({
  loadShowDetails: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT: ${url}`)
  }),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), back: vi.fn() }),
}))

describe('ShowDetailPage server page & cross-show navigation', () => {
  const sampleUser = { id: 'u1', email: 'test@example.com' }

  const show1Details: ShowDetails = {
    media: {
      id: 'show-1',
      tmdb_id: 1396,
      type: 'show',
      title: 'Breaking Bad',
      overview: 'Chemistry teacher',
      poster_url: '/bb.jpg',
      genres: ['Drama', 'Crime'],
      release_year: 2008,
      runtime_mins: 47,
      director: null,
      cast_members: ['Bryan Cranston'],
      collection_id: null,
      collection_name: null,
    },
    seasons: [{ id: 's1', media_id: 'show-1', season_number: 1, episode_count: 5 }],
    entry: {
      id: 'w1',
      user_id: 'u1',
      media_id: 'show-1',
      rating: 5,
      review: 'Masterpiece',
      watched_at: '2026-08-20',
      rewatch: false,
      created_at: '2026-08-20T00:00:00Z',
    },
    progress: [1, 2, 3, 4, 5].map((n) => ({
      id: `p1-${n}`,
      user_id: 'u1',
      season_id: 's1',
      episode_number: n,
      watched_at: '2026-08-20',
    })),
  }

  const show2Details: ShowDetails = {
    media: {
      id: 'show-2',
      tmdb_id: 60059,
      type: 'show',
      title: 'Better Call Saul',
      overview: 'Lawyer Jimmy McGill',
      poster_url: '/bcs.jpg',
      genres: ['Drama', 'Crime'],
      release_year: 2015,
      runtime_mins: 50,
      director: null,
      cast_members: ['Bob Odenkirk'],
      collection_id: null,
      collection_name: null,
    },
    seasons: [{ id: 's2', media_id: 'show-2', season_number: 1, episode_count: 10 }],
    entry: null,
    progress: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(serverAuth.createClient).mockResolvedValue({} as SupabaseClient)
    global.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url)
      if (urlStr.includes('/api/episodes/meta')) {
        return { ok: true, json: async () => ({ episodes: [] }) }
      }
      return { ok: true, json: async () => ({}) }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('redirects unauthenticated users to /login', async () => {
    vi.mocked(serverAuth.getAuthenticatedUser).mockResolvedValue(null)

    await expect(
      ShowDetailPage({ params: Promise.resolve({ id: 'show-1' }) })
    ).rejects.toThrow('NEXT_REDIRECT: /login')

    expect(navigation.redirect).toHaveBeenCalledWith('/login')
  })

  it('invokes notFound() when show is confirmed absent (details === null)', async () => {
    vi.mocked(serverAuth.getAuthenticatedUser).mockResolvedValue(sampleUser as never)
    vi.mocked(showDetailsModule.loadShowDetails).mockResolvedValue(null)

    await expect(
      ShowDetailPage({ params: Promise.resolve({ id: 'missing-show' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(navigation.notFound).toHaveBeenCalled()
  })

  it('propagates loader errors without invoking notFound()', async () => {
    vi.mocked(serverAuth.getAuthenticatedUser).mockResolvedValue(sampleUser as never)
    const dbError = new Error('Database connection failed')
    vi.mocked(showDetailsModule.loadShowDetails).mockRejectedValue(dbError)

    await expect(
      ShowDetailPage({ params: Promise.resolve({ id: 'show-1' }) })
    ).rejects.toThrow('Database connection failed')

    expect(navigation.notFound).not.toHaveBeenCalled()
  })

  it('renders ShowDetailClient keyed by media id', async () => {
    vi.mocked(serverAuth.getAuthenticatedUser).mockResolvedValue(sampleUser as never)
    vi.mocked(showDetailsModule.loadShowDetails).mockResolvedValue(show1Details)

    const result = (await ShowDetailPage({
      params: Promise.resolve({ id: 'show-1' }),
    })) as ReactElement<{ key?: string; mediaId: string; initialDetails: ShowDetails }>

    expect(result.type).toBe(ShowDetailClient)
    expect(result.key).toBe('show-1')
    expect(result.props.mediaId).toBe('show-1')
    expect(result.props.initialDetails).toEqual(show1Details)
  })

  it('proves cross-show navigation cleanly remounts state without inheriting prior show state', async () => {
    vi.mocked(serverAuth.getAuthenticatedUser).mockResolvedValue(sampleUser as never)

    // Render Show 1 (Breaking Bad - 5/5 watched, rating 5 stars)
    vi.mocked(showDetailsModule.loadShowDetails).mockResolvedValue(show1Details)
    const show1El = (await ShowDetailPage({
      params: Promise.resolve({ id: 'show-1' }),
    })) as ReactElement

    const { rerender } = render(
      <ToastProvider>
        <MediaModalProvider>{show1El}</MediaModalProvider>
      </ToastProvider>
    )

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Breaking Bad')
    expect(screen.getByText(/5\/5 episodes/)).toBeInTheDocument()
    expect(screen.getByLabelText('Rated 5 out of 5')).toBeInTheDocument()
    expect(screen.queryByText('Mark show as watched')).not.toBeInTheDocument()

    // Navigate to Show 2 (Better Call Saul - 0/10 watched, no rating / entry)
    vi.mocked(showDetailsModule.loadShowDetails).mockResolvedValue(show2Details)
    const show2El = (await ShowDetailPage({
      params: Promise.resolve({ id: 'show-2' }),
    })) as ReactElement

    await act(async () => {
      rerender(
        <ToastProvider>
          <MediaModalProvider>{show2El}</MediaModalProvider>
        </ToastProvider>
      )
    })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Better Call Saul')
    expect(screen.getByText(/0\/10 episodes/)).toBeInTheDocument()
    expect(screen.getByText('Mark show as watched')).toBeInTheDocument()
    expect(screen.queryByLabelText('Rated 5 out of 5')).not.toBeInTheDocument()
    expect(screen.queryByText('Breaking Bad')).not.toBeInTheDocument()
  })
})
