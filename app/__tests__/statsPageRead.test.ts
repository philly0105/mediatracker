import { describe, it, expect, vi, beforeEach } from 'vitest'
import StatsPage from '@/app/(app)/stats/page'
import * as serverAuth from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT: ${url}`) }),
}))

type Read = { rows?: unknown[]; error?: string }

// Answers the page's two paged reads, told apart by table.
function fakeSupabase(reads: { watch_entries?: Read; episode_progress?: Read }) {
  return {
    from: (table: keyof typeof reads) => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        range: () => builder,
        then: (resolve: (value: { data: unknown[] | null; error: { message: string } | null }) => void) => {
          const read = reads[table] ?? {}
          resolve(read.error
            ? { data: null, error: { message: read.error } }
            : { data: read.rows ?? [], error: null })
        },
      }
      return builder
    },
  } as unknown as Awaited<ReturnType<typeof serverAuth.createClient>>
}

function renderPage() {
  return StatsPage({ searchParams: Promise.resolve({}) })
}

describe('/stats when a read fails', () => {
  beforeEach(() => {
    vi.mocked(serverAuth.getAuthenticatedUser).mockResolvedValue(
      { id: 'u1' } as Awaited<ReturnType<typeof serverAuth.getAuthenticatedUser>>
    )
  })

  it('throws to the error boundary rather than claiming nothing is tracked', async () => {
    // fetchAllRows reports a failure instead of throwing, and the page used to
    // read only its rows — so a Supabase outage rendered "Nothing to measure
    // yet" to someone with hundreds of logged titles, and stats/error.tsx
    // could never fire.
    vi.mocked(serverAuth.createClient).mockResolvedValue(
      fakeSupabase({ watch_entries: { error: 'connection reset' } })
    )
    await expect(renderPage()).rejects.toThrow('connection reset')
  })

  it('throws when only the episode read fails, which is the silently wrong case', async () => {
    // Partial data is worse than none: totals, hours, streaks and genres all
    // still render, just wrong.
    vi.mocked(serverAuth.createClient).mockResolvedValue(
      fakeSupabase({
        watch_entries: { rows: [{ id: 'w1', rating: 5, watched_at: '2026-01-01', rewatch: false, media: { type: 'movie' } }] },
        episode_progress: { error: 'statement timeout' },
      })
    )
    await expect(renderPage()).rejects.toThrow('statement timeout')
  })

  it('renders as before when both reads come back', async () => {
    vi.mocked(serverAuth.createClient).mockResolvedValue(fakeSupabase({}))
    await expect(renderPage()).resolves.toBeTruthy()
  })
})
