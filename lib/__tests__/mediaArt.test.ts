import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchMediaArt } from '@/lib/mediaArt'

type Result = { data: unknown; error: { code?: string; message: string } | null }

function fakeSupabase(result: Result) {
  const inCalls: unknown[][] = []
  const client = {
    from: vi.fn(() => ({
      select: () => ({
        in: async (column: string, values: unknown[]) => {
          inCalls.push([column, values])
          return result
        },
      }),
    })),
  }
  return { client: client as unknown as SupabaseClient, inCalls }
}

describe('fetchMediaArt', () => {
  it('maps each media id to its backdrop and logo', async () => {
    const { client, inCalls } = fakeSupabase({
      data: [
        { id: 'm1', backdrop_url: 'https://image.tmdb.org/t/p/w1280/b.jpg', logo_url: 'https://image.tmdb.org/t/p/w500/l.png' },
        { id: 'm2', backdrop_url: null, logo_url: null },
      ],
      error: null,
    })

    const art = await fetchMediaArt(client, ['m1', 'm2', 'm1'])

    expect(inCalls).toEqual([['id', ['m1', 'm2']]])
    expect(art.get('m1')).toEqual({ backdrop_url: 'https://image.tmdb.org/t/p/w1280/b.jpg', logo_url: 'https://image.tmdb.org/t/p/w500/l.png' })
    expect(art.get('m2')).toEqual({ backdrop_url: null, logo_url: null })
  })

  it('comes back empty when the columns are missing (014 not applied)', async () => {
    const { client } = fakeSupabase({ data: null, error: { code: '42703', message: 'column media.backdrop_url does not exist' } })

    const art = await fetchMediaArt(client, ['m1'])

    expect(art.size).toBe(0)
  })

  it('skips the query when there are no ids', async () => {
    const { client } = fakeSupabase({ data: [], error: null })

    await fetchMediaArt(client, [])

    expect(client.from).not.toHaveBeenCalled()
  })
})
