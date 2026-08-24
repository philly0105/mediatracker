import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/shows/[id]/route'
import * as serverAuth from '@/lib/supabase/server'
import * as showDetailsModule from '@/lib/showDetails'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { WatchEntry } from '@/types'
import type { ShowDetails } from '@/lib/showDetails'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/showDetails', () => ({
  loadShowDetails: vi.fn(),
}))

describe('GET /api/shows/[id] route handler', () => {
  const sampleUser = { id: 'user-123', email: 'test@example.com' }

  const sampleEntry: WatchEntry = {
    id: 'w1',
    user_id: 'user-123',
    media_id: 'show-1',
    rating: 5,
    review: 'Great show',
    watched_at: '2026-08-20',
    rewatch: false,
    created_at: '2026-08-20T00:00:00Z',
  }

  const sampleDetails: ShowDetails = {
    media: {
      id: 'show-1',
      tmdb_id: 1396,
      type: 'show',
      title: 'Breaking Bad',
      overview: 'Chemistry teacher',
      poster_url: '/bb.jpg',
      genres: ['Drama'],
      release_year: 2008,
      runtime_mins: 47,
      director: null,
      cast_members: ['Bryan Cranston'],
      collection_id: null,
      collection_name: null,
    },
    seasons: [{ id: 's1', media_id: 'show-1', season_number: 1, episode_count: 7 }],
    entry: sampleEntry,
    progress: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is unauthenticated', async () => {
    vi.mocked(serverAuth.getAuthenticatedUser).mockResolvedValue(null)

    const req = new NextRequest('http://localhost:3000/api/shows/show-1')
    const res = await GET(req, { params: Promise.resolve({ id: 'show-1' }) })

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toEqual({ error: 'Unauthorized' })
  })

  describe('only=entry fast path', () => {
    it('queries only watch_entries and returns { entry } on success', async () => {
      vi.mocked(serverAuth.getAuthenticatedUser).mockResolvedValue(sampleUser as never)

      const fromCalls: string[] = []
      const mockSupabase = {
        from: vi.fn((table: string) => {
          fromCalls.push(table)
          const builder = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: sampleEntry, error: null }),
          }
          return builder
        }),
      }
      vi.mocked(serverAuth.createClient).mockResolvedValue(mockSupabase as unknown as SupabaseClient)

      const req = new NextRequest('http://localhost:3000/api/shows/show-1?only=entry')
      const res = await GET(req, { params: Promise.resolve({ id: 'show-1' }) })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({ entry: sampleEntry })

      // Proves only=entry queries only watch_entries and does not call loadShowDetails
      expect(fromCalls).toEqual(['watch_entries'])
      expect(showDetailsModule.loadShowDetails).not.toHaveBeenCalled()
    })

    it('returns { entry: null } on success when no entry exists', async () => {
      vi.mocked(serverAuth.getAuthenticatedUser).mockResolvedValue(sampleUser as never)

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      }
      vi.mocked(serverAuth.createClient).mockResolvedValue(mockSupabase as unknown as SupabaseClient)

      const req = new NextRequest('http://localhost:3000/api/shows/show-1?only=entry')
      const res = await GET(req, { params: Promise.resolve({ id: 'show-1' }) })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({ entry: null })
    })

    it('returns 500 when watch_entries query fails', async () => {
      vi.mocked(serverAuth.getAuthenticatedUser).mockResolvedValue(sampleUser as never)

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          }),
        })),
      }
      vi.mocked(serverAuth.createClient).mockResolvedValue(mockSupabase as unknown as SupabaseClient)

      const req = new NextRequest('http://localhost:3000/api/shows/show-1?only=entry')
      const res = await GET(req, { params: Promise.resolve({ id: 'show-1' }) })

      expect(res.status).toBe(500)
      const json = await res.json()
      expect(json).toEqual({ error: 'Database connection failed' })
    })
  })

  describe('full show load', () => {
    it('returns 200 with full show details on success', async () => {
      vi.mocked(serverAuth.getAuthenticatedUser).mockResolvedValue(sampleUser as never)
      vi.mocked(serverAuth.createClient).mockResolvedValue({} as SupabaseClient)
      vi.mocked(showDetailsModule.loadShowDetails).mockResolvedValue(sampleDetails)

      const req = new NextRequest('http://localhost:3000/api/shows/show-1')
      const res = await GET(req, { params: Promise.resolve({ id: 'show-1' }) })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual(sampleDetails)
      expect(showDetailsModule.loadShowDetails).toHaveBeenCalledWith({
        supabase: expect.anything(),
        userId: 'user-123',
        mediaId: 'show-1',
      })
    })

    it('returns 404 when show details are null (confirmed absent)', async () => {
      vi.mocked(serverAuth.getAuthenticatedUser).mockResolvedValue(sampleUser as never)
      vi.mocked(serverAuth.createClient).mockResolvedValue({} as SupabaseClient)
      vi.mocked(showDetailsModule.loadShowDetails).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/shows/missing-show')
      const res = await GET(req, { params: Promise.resolve({ id: 'missing-show' }) })

      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json).toEqual({ error: 'Show not found' })
    })

    it('returns 500 when loadShowDetails throws an error', async () => {
      vi.mocked(serverAuth.getAuthenticatedUser).mockResolvedValue(sampleUser as never)
      vi.mocked(serverAuth.createClient).mockResolvedValue({} as SupabaseClient)
      vi.mocked(showDetailsModule.loadShowDetails).mockRejectedValue(new Error('Supabase query failed'))

      const req = new NextRequest('http://localhost:3000/api/shows/show-1')
      const res = await GET(req, { params: Promise.resolve({ id: 'show-1' }) })

      expect(res.status).toBe(500)
      const json = await res.json()
      expect(json).toEqual({ error: 'Supabase query failed' })
    })
  })
})
