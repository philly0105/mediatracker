import { describe, it, expect } from 'vitest'
import { fetchSeeds, type SeedRow } from '@/app/api/recommendations/route'

function createMockSupabase(tierData: {
  tier1?: SeedRow[]
  tier2?: SeedRow[]
  tier3?: SeedRow[]
}) {
  return {
    from: () => {
      let isGteRating = false
      let isNotRatingNull = false

      const builder = {
        select: () => builder,
        eq: () => builder,
        limit: () => builder,
        gte: (col: string, val: number) => {
          if (col === 'rating' && val === 4) isGteRating = true
          return builder
        },
        not: (col: string, op: string) => {
          if (col === 'rating' && op === 'is') isNotRatingNull = true
          return builder
        },
        order: () => builder,
        then: (resolve: (val: { data: SeedRow[] }) => void) => {
          if (isGteRating) {
            resolve({ data: tierData.tier1 ?? [] })
          } else if (isNotRatingNull) {
            resolve({ data: tierData.tier2 ?? [] })
          } else {
            resolve({ data: tierData.tier3 ?? [] })
          }
        },
      }
      return builder
    },
  } as unknown as Parameters<typeof fetchSeeds>[0]
}

describe('fetchSeeds cascade', () => {
  const seedItem = (id: number, rating: number | null): SeedRow => ({
    rating,
    media: { tmdb_id: id, type: 'movie', title: `Movie ${id}` },
  })

  it('selects tier 1 (rating >= 4) when available', async () => {
    const tier1Data = [seedItem(101, 5), seedItem(102, 4.5), seedItem(103, 4)]
    const supabase = createMockSupabase({
      tier1: tier1Data,
      tier2: [seedItem(201, 3)],
      tier3: [seedItem(301, null)],
    })

    const seeds = await fetchSeeds(supabase, 'user-1', 0)
    expect(seeds).toHaveLength(3)
    expect(seeds[0].media.tmdb_id).toBe(101)
  })

  it('falls back to tier 2 (any rating) when no rating >= 4 exists', async () => {
    const tier2Data = [seedItem(201, 3.5), seedItem(202, 3.0)]
    const supabase = createMockSupabase({
      tier1: [],
      tier2: tier2Data,
      tier3: [seedItem(301, null)],
    })

    const seeds = await fetchSeeds(supabase, 'user-1', 0)
    expect(seeds).toHaveLength(2)
    expect(seeds[0].media.tmdb_id).toBe(201)
  })

  it('falls back to tier 3 (most recent unrated) when no ratings exist at all', async () => {
    const tier3Data = [seedItem(301, null), seedItem(302, null)]
    const supabase = createMockSupabase({
      tier1: [],
      tier2: [],
      tier3: tier3Data,
    })

    const seeds = await fetchSeeds(supabase, 'user-1', 0)
    expect(seeds).toHaveLength(2)
    expect(seeds[0].media.tmdb_id).toBe(301)
  })

  it('returns empty array when user history is completely empty', async () => {
    const supabase = createMockSupabase({
      tier1: [],
      tier2: [],
      tier3: [],
    })

    const seeds = await fetchSeeds(supabase, 'user-1', 0)
    expect(seeds).toEqual([])
  })

  it('rotates seed pool by cycle offset with wrap-around', async () => {
    const tier1Data = [
      seedItem(1, 5),
      seedItem(2, 5),
      seedItem(3, 5),
      seedItem(4, 5),
      seedItem(5, 5),
    ]
    const supabase = createMockSupabase({ tier1: tier1Data })

    // Offset 2 rotates starting point to seedItem(3)
    const seedsOffset2 = await fetchSeeds(supabase, 'user-1', 2)
    expect(seedsOffset2.map((s) => s.media.tmdb_id)).toEqual([3, 4, 5, 1, 2])

    // Offset 7 wraps around modulo 5 to offset 2
    const seedsOffset7 = await fetchSeeds(supabase, 'user-1', 7)
    expect(seedsOffset7.map((s) => s.media.tmdb_id)).toEqual([3, 4, 5, 1, 2])
  })
})
