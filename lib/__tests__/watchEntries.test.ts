import { describe, it, expect } from 'vitest'
import { fetchWatchEntries, WATCH_SELECT, WATCH_SELECT_LEFT } from '../watchEntries'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryCall = {
  table: string
  select: string
  eqs: [string, unknown][]
  orders: [string, { ascending?: boolean }][]
  range: [number, number]
}

type QueryResult = {
  data: unknown[] | null
  error: { message: string } | null
}

type MockBuilder = {
  select: (s: string) => MockBuilder
  eq: (col: string, val: unknown) => MockBuilder
  order: (col: string, opts: { ascending?: boolean }) => MockBuilder
  range: (from: number, to: number) => MockBuilder
  then: <TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) => Promise<TResult1 | TResult2>
}

describe('fetchWatchEntries', () => {
  function createMockSupabase(handler: (calls: QueryCall) => QueryResult) {
    return {
      from: (table: string) => {
        let selectStr = ''
        const eqs: [string, unknown][] = []
        const orders: [string, { ascending?: boolean }][] = []
        let rangeVal: [number, number] = [0, 0]

        const builder: MockBuilder = {
          select: (s: string) => {
            selectStr = s
            return builder
          },
          eq: (col: string, val: unknown) => {
            eqs.push([col, val])
            return builder
          },
          order: (col: string, opts: { ascending?: boolean }) => {
            orders.push([col, opts])
            return builder
          },
          range: (from: number, to: number) => {
            rangeVal = [from, to]
            return builder
          },
          then: (onfulfilled, onrejected) => {
            return Promise.resolve(
              handler({
                table,
                select: selectStr,
                eqs,
                orders,
                range: rangeVal,
              })
            ).then(onfulfilled, onrejected)
          },
        }
        return builder
      },
    } as unknown as SupabaseClient
  }

  it('filters by user_id and applies deterministic watched_at then id ordering for all types', async () => {
    let capturedQuery: QueryCall | null = null
    const mockClient = createMockSupabase((query) => {
      capturedQuery = query
      return {
        data: [
          {
            id: 'e1',
            user_id: 'u-123',
            media_id: 'm1',
            rating: 5,
            review: 'Great',
            watched_at: '2026-08-20',
            rewatch: false,
            created_at: '2026-08-20T00:00:00Z',
            media: { id: 'm1', title: 'Film 1', type: 'movie' },
          },
        ],
        error: null,
      }
    })

    const result = await fetchWatchEntries({
      supabase: mockClient,
      userId: 'u-123',
      type: 'all',
    })

    expect(result.error).toBeNull()
    expect(result.truncated).toBe(false)
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].id).toBe('e1')

    if (!capturedQuery) throw new Error('Expected query to be captured')
    const query: QueryCall = capturedQuery
    expect(query.table).toBe('watch_entries')
    expect(query.select).toBe(WATCH_SELECT_LEFT)
    expect(query.eqs).toEqual([['user_id', 'u-123']])
    expect(query.orders).toEqual([
      ['watched_at', { ascending: false }],
      ['id', { ascending: false }],
    ])
  })

  it('applies inner-join select and media.type eq filter when type is movie', async () => {
    let capturedQuery: QueryCall | null = null
    const mockClient = createMockSupabase((query) => {
      capturedQuery = query
      return { data: [], error: null }
    })

    await fetchWatchEntries({
      supabase: mockClient,
      userId: 'u-456',
      type: 'movie',
    })

    if (!capturedQuery) throw new Error('Expected query to be captured')
    const query: QueryCall = capturedQuery
    expect(query.select).toBe(WATCH_SELECT)
    expect(query.eqs).toEqual([
      ['user_id', 'u-456'],
      ['media.type', 'movie'],
    ])
  })

  it('applies inner-join select and media.type eq filter when type is show', async () => {
    let capturedQuery: QueryCall | null = null
    const mockClient = createMockSupabase((query) => {
      capturedQuery = query
      return { data: [], error: null }
    })

    await fetchWatchEntries({
      supabase: mockClient,
      userId: 'u-456',
      type: 'show',
    })

    if (!capturedQuery) throw new Error('Expected query to be captured')
    const query: QueryCall = capturedQuery
    expect(query.select).toBe(WATCH_SELECT)
    expect(query.eqs).toEqual([
      ['user_id', 'u-456'],
      ['media.type', 'show'],
    ])
  })

  it('falls back to left-join and no media.type filter for unrecognized type or null', async () => {
    let capturedQuery: QueryCall | null = null
    const mockClient = createMockSupabase((query) => {
      capturedQuery = query
      return { data: [], error: null }
    })

    await fetchWatchEntries({
      supabase: mockClient,
      userId: 'u-456',
      type: 'invalid-type',
    })

    if (!capturedQuery) throw new Error('Expected query to be captured')
    const query: QueryCall = capturedQuery
    expect(query.select).toBe(WATCH_SELECT_LEFT)
    expect(query.eqs).toEqual([['user_id', 'u-456']])
  })

  it('handles pagination and propagates truncated flag from fetchAllRows', async () => {
    // Generate 20,000 items (20 pages of 1,000)
    let callCount = 0
    const mockClient = createMockSupabase((query) => {
      callCount++
      const pageSize = query.range[1] - query.range[0] + 1
      const pageRows = Array.from({ length: pageSize }, (_, i) => ({
        id: `e-${query.range[0] + i}`,
        user_id: 'u-123',
        media_id: `m-${query.range[0] + i}`,
        rating: null,
        review: null,
        watched_at: '2026-01-01',
        rewatch: false,
        created_at: '2026-01-01T00:00:00Z',
      }))
      return { data: pageRows, error: null }
    })

    const result = await fetchWatchEntries({
      supabase: mockClient,
      userId: 'u-123',
    })

    expect(result.error).toBeNull()
    expect(result.truncated).toBe(true)
    expect(result.entries).toHaveLength(20000)
    expect(callCount).toBe(20)
  })

  it('returns error when query fails', async () => {
    const mockClient = createMockSupabase(() => ({
      data: null,
      error: { message: 'Database connection failed' },
    }))

    const result = await fetchWatchEntries({
      supabase: mockClient,
      userId: 'u-123',
    })

    expect(result.error).toBe('Database connection failed')
    expect(result.truncated).toBe(false)
    expect(result.entries).toEqual([])
  })
})
