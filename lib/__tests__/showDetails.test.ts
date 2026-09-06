import { describe, it, expect, vi } from 'vitest'
import { loadShowDetails } from '../showDetails'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Media, Season, EpisodeProgress, WatchEntry } from '@/types'

type QueryCall = {
  table: string
  select?: string
  eqs: [string, unknown][]
  ins: [string, unknown[]][]
  orders: [string, { ascending?: boolean } | undefined][]
  limitVal?: number
  maybeSingleCalled?: boolean
}

type QueryResult = {
  data: unknown | null
  error: { message: string } | null
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('loadShowDetails', () => {
  function createMockSupabase(
    handler: (call: QueryCall) => Promise<QueryResult> | QueryResult
  ) {
    const tableCalls: QueryCall[] = []

    const client = {
      from: vi.fn((table: string) => {
        const eqs: [string, unknown][] = []
        const ins: [string, unknown[]][] = []
        const orders: [string, { ascending?: boolean } | undefined][] = []

        const currentCall: QueryCall = {
          table,
          eqs,
          ins,
          orders,
        }
        tableCalls.push(currentCall)

        const builder = {
          select: vi.fn((s?: string) => {
            currentCall.select = s
            return builder
          }),
          eq: vi.fn((col: string, val: unknown) => {
            eqs.push([col, val])
            return builder
          }),
          in: vi.fn((col: string, vals: unknown[]) => {
            ins.push([col, vals])
            return builder
          }),
          order: vi.fn((col: string, opts?: { ascending?: boolean }) => {
            orders.push([col, opts])
            return builder
          }),
          limit: vi.fn((l: number) => {
            currentCall.limitVal = l
            return builder
          }),
          maybeSingle: vi.fn(() => {
            currentCall.maybeSingleCalled = true
            return builder
          }),
          then: (
            onfulfilled?: ((value: QueryResult) => unknown) | null,
            onrejected?: ((reason: unknown) => unknown) | null
          ) => {
            return Promise.resolve(handler(currentCall)).then(onfulfilled, onrejected)
          },
        }

        return builder
      }),
    }

    return {
      client: client as unknown as SupabaseClient,
      tableCalls,
      fromSpy: client.from,
    }
  }

  const sampleMedia: Media = {
    id: 'm1',
    tmdb_id: 1396,
    type: 'show',
    title: 'Breaking Bad',
    overview: 'A chemistry teacher diagnosed with cancer turns to manufacturing meth.',
    poster_url: '/bb.jpg',
    genres: ['Drama', 'Crime'],
    release_year: 2008,
    runtime_mins: 47,
    director: null,
    cast_members: ['Bryan Cranston', 'Aaron Paul'],
    collection_id: null,
    collection_name: null,
  }

  const sampleSeasons: Season[] = [
    { id: 's1', media_id: 'm1', season_number: 1, episode_count: 7 },
    { id: 's2', media_id: 'm1', season_number: 2, episode_count: 13 },
  ]

  const sampleEntry: WatchEntry = {
    id: 'w1',
    user_id: 'u1',
    media_id: 'm1',
    rating: 5,
    review: 'Masterpiece',
    watched_at: '2026-08-20',
    rewatch: false,
    created_at: '2026-08-20T00:00:00Z',
  }

  const sampleProgress: EpisodeProgress[] = [
    { id: 'p1', user_id: 'u1', season_id: 's1', episode_number: 1, watched_at: '2026-08-20' },
    { id: 'p2', user_id: 'u1', season_id: 's1', episode_number: 2, watched_at: '2026-08-21' },
  ]

  // What PostgREST actually returns for the `seasons!inner(media_id)` embed:
  // the progress row plus the joined column that did the filtering.
  const sampleProgressRows = sampleProgress.map((row) => ({
    ...row,
    seasons: { media_id: 'm1' },
  }))

  it('loads full show details when media, seasons, entry, and progress exist', async () => {
    const { client, tableCalls } = createMockSupabase((call) => {
      if (call.table === 'media') return { data: sampleMedia, error: null }
      if (call.table === 'seasons') return { data: sampleSeasons, error: null }
      if (call.table === 'watch_entries') return { data: sampleEntry, error: null }
      if (call.table === 'episode_progress') return { data: sampleProgressRows, error: null }
      return { data: null, error: null }
    })

    const result = await loadShowDetails({
      supabase: client,
      userId: 'u1',
      mediaId: 'm1',
    })

    expect(result).toEqual({
      media: sampleMedia,
      seasons: sampleSeasons,
      entry: sampleEntry,
      progress: sampleProgress,
    })

    const mediaCall = tableCalls.find((c) => c.table === 'media')
    expect(mediaCall).toBeDefined()
    expect(mediaCall?.select).toBe('*')
    expect(mediaCall?.eqs).toEqual([['id', 'm1']])
    expect(mediaCall?.maybeSingleCalled).toBe(true)

    const seasonsCall = tableCalls.find((c) => c.table === 'seasons')
    expect(seasonsCall).toBeDefined()
    expect(seasonsCall?.select).toBe('*')
    expect(seasonsCall?.eqs).toEqual([['media_id', 'm1']])
    expect(seasonsCall?.orders).toEqual([['season_number', undefined]])

    const entryCall = tableCalls.find((c) => c.table === 'watch_entries')
    expect(entryCall).toBeDefined()
    expect(entryCall?.select).toBe('*')
    expect(entryCall?.eqs).toEqual([
      ['user_id', 'u1'],
      ['media_id', 'm1'],
    ])
    expect(entryCall?.orders).toEqual([['watched_at', { ascending: false }]])
    expect(entryCall?.limitVal).toBe(1)
    expect(entryCall?.maybeSingleCalled).toBe(true)

    // Filtered through the seasons join rather than by the ids the seasons
    // query returns, which is what lets it run in the same round as the rest.
    const progressCall = tableCalls.find((c) => c.table === 'episode_progress')
    expect(progressCall).toBeDefined()
    expect(progressCall?.select).toBe('*, seasons!inner(media_id)')
    expect(progressCall?.eqs).toEqual([
      ['user_id', 'u1'],
      ['seasons.media_id', 'm1'],
    ])
    expect(progressCall?.ins).toEqual([])
  })

  it('starts all four reads concurrently', async () => {
    const mediaDeferred = createDeferred<QueryResult>()
    const seasonsDeferred = createDeferred<QueryResult>()
    const entryDeferred = createDeferred<QueryResult>()
    const progressDeferred = createDeferred<QueryResult>()

    const { client, fromSpy } = createMockSupabase((call) => {
      if (call.table === 'media') return mediaDeferred.promise
      if (call.table === 'seasons') return seasonsDeferred.promise
      if (call.table === 'watch_entries') return entryDeferred.promise
      if (call.table === 'episode_progress') return progressDeferred.promise
      return { data: null, error: null }
    })

    const loadPromise = loadShowDetails({
      supabase: client,
      userId: 'u1',
      mediaId: 'm1',
    })

    // Progress used to wait for the season ids, which cost the show page a
    // second serial round trip. Nothing here waits on anything else.
    expect(fromSpy).toHaveBeenCalledWith('media')
    expect(fromSpy).toHaveBeenCalledWith('seasons')
    expect(fromSpy).toHaveBeenCalledWith('watch_entries')
    expect(fromSpy).toHaveBeenCalledWith('episode_progress')

    mediaDeferred.resolve({ data: sampleMedia, error: null })
    seasonsDeferred.resolve({ data: sampleSeasons, error: null })
    entryDeferred.resolve({ data: sampleEntry, error: null })
    progressDeferred.resolve({ data: sampleProgressRows, error: null })

    const result = await loadPromise
    expect(result).toEqual({
      media: sampleMedia,
      seasons: sampleSeasons,
      entry: sampleEntry,
      progress: sampleProgress,
    })
  })

  it('returns null when media row is missing', async () => {
    const { client, fromSpy } = createMockSupabase((call) => {
      if (call.table === 'media') return { data: null, error: null }
      if (call.table === 'seasons') return { data: sampleSeasons, error: null }
      if (call.table === 'watch_entries') return { data: null, error: null }
      if (call.table === 'episode_progress') return { data: sampleProgressRows, error: null }
      return { data: null, error: null }
    })

    const result = await loadShowDetails({
      supabase: client,
      userId: 'u1',
      mediaId: 'missing-show',
    })

    expect(result).toBeNull()
    expect(fromSpy).toHaveBeenCalledWith('media')
  })

  it('returns an empty progress array when the show has no seasons', async () => {
    const { client, fromSpy } = createMockSupabase((call) => {
      if (call.table === 'media') return { data: sampleMedia, error: null }
      if (call.table === 'seasons') return { data: [], error: null }
      if (call.table === 'watch_entries') return { data: sampleEntry, error: null }
      // No seasons means the inner join matches nothing.
      if (call.table === 'episode_progress') return { data: [], error: null }
      return { data: null, error: null }
    })

    const result = await loadShowDetails({
      supabase: client,
      userId: 'u1',
      mediaId: 'm1',
    })

    expect(result).toEqual({
      media: sampleMedia,
      seasons: [],
      entry: sampleEntry,
      progress: [],
    })

    expect(fromSpy).toHaveBeenCalledWith('media')
    expect(fromSpy).toHaveBeenCalledWith('seasons')
    expect(fromSpy).toHaveBeenCalledWith('watch_entries')
  })

  it('handles a null seasons query result gracefully', async () => {
    const { client } = createMockSupabase((call) => {
      if (call.table === 'media') return { data: sampleMedia, error: null }
      if (call.table === 'seasons') return { data: null, error: null }
      if (call.table === 'watch_entries') return { data: null, error: null }
      return { data: null, error: null }
    })

    const result = await loadShowDetails({
      supabase: client,
      userId: 'u1',
      mediaId: 'm1',
    })

    expect(result).toEqual({
      media: sampleMedia,
      seasons: [],
      entry: null,
      progress: [],
    })
  })

  it.each([
    { table: 'media', errorMsg: 'Failed to load media' },
    { table: 'seasons', errorMsg: 'Failed to load seasons' },
    { table: 'watch_entries', errorMsg: 'Failed to load watch entries' },
    { table: 'episode_progress', errorMsg: 'Failed to load episode progress' },
  ])('throws when $table query fails', async ({ table, errorMsg }) => {
    const { client } = createMockSupabase((call) => {
      if (call.table === table) {
        return { data: null, error: { message: errorMsg } }
      }
      if (call.table === 'media') return { data: sampleMedia, error: null }
      if (call.table === 'seasons') return { data: sampleSeasons, error: null }
      if (call.table === 'watch_entries') return { data: sampleEntry, error: null }
      if (call.table === 'episode_progress') return { data: sampleProgressRows, error: null }
      return { data: null, error: null }
    })

    await expect(
      loadShowDetails({
        supabase: client,
        userId: 'u1',
        mediaId: 'm1',
      })
    ).rejects.toEqual({ message: errorMsg })
  })
})
