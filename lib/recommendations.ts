import type { createClient } from '@/lib/supabase/server'
import { fetchAllRowsConcurrent } from '@/lib/fetchAllRows'
import { discoverByGenre, fetchTmdbRecommendations, fetchTmdbTrending } from '@/lib/tmdb'
import type { MediaType, TmdbSearchResult } from '@/types'

// The scoring behind /api/recommendations, here so a server component (Home's
// "Because you watched" card) can use it without an HTTP hop to its own API.

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

export type TypeFilter = MediaType | 'all'
export type RecommendationWithSeed = TmdbSearchResult & { seed_title?: string }
type ScoredRecommendation = { item: RecommendationWithSeed; score: number; seedWeight?: number }

export type RecommendationsResponse = {
  results: RecommendationWithSeed[]
  fallback: boolean
  hasMore: boolean
}

const RESULT_LIMIT = 100
const GENRE_TARGET_COUNT = 12
/** Titles used to seed TMDB's recommendation lists. */
const SEED_LIMIT = 15
/** Rows pulled per seed tier so Refresh has somewhere new to rotate to. */
const SEED_POOL = 60

export type SeedRow = { rating: number | null; media: { tmdb_id: number; type: MediaType; title: string } }

/**
 * Seeds cascade instead of falling off a cliff.
 *
 * Previously this was one query — `rating >= 4`, limit 15 — and anything else
 * meant global trending plus "to get you started" copy. Someone with 250 logged
 * titles who rates sparingly (or never) got the same page as a brand-new
 * account. Each tier is tried in turn and the first non-empty one wins, so
 * trending is reached only by a genuinely empty history.
 *
 * `offset` rotates the window within whichever tier matched, which is what
 * makes Refresh return different titles rather than the same set reshuffled.
 */
export async function fetchSeeds(
  supabase: ServerSupabase,
  userId: string,
  offset: number
): Promise<SeedRow[]> {
  const base = () => supabase
    .from('watch_entries')
    .select('rating, media!inner(tmdb_id, type, title)')
    .eq('user_id', userId)
    .limit(SEED_POOL)

  const tiers = [
    // Loved it, most recent first.
    () => base().gte('rating', 4).order('created_at', { ascending: false }),
    // Rated anything at all — best-rated first.
    () => base().not('rating', 'is', null).order('rating', { ascending: false }),
    // Never rates. Recency is still signal.
    () => base().order('created_at', { ascending: false }),
  ]

  for (const tier of tiers) {
    const { data } = await tier()
    const pool = (data ?? []) as unknown as SeedRow[]
    if (pool.length === 0) continue
    // Rotate rather than slice from `offset`, so a cycle past the end of a
    // small pool wraps around instead of returning nothing.
    const start = offset % pool.length
    return [...pool.slice(start), ...pool.slice(0, start)].slice(0, SEED_LIMIT)
  }

  return []
}

// PostgREST returns an embedded resource as an object or a single-element
// array depending on the relationship, so accept both, as every other join in
// the app does.
type JoinedTmdbId = { media: { tmdb_id: number } | { tmdb_id: number }[] | null }

function tmdbIds(rows: JoinedTmdbId[]): number[] {
  return rows.flatMap((row) => {
    const media = Array.isArray(row.media) ? row.media[0] : row.media
    return typeof media?.tmdb_id === 'number' ? [media.tmdb_id] : []
  })
}

/**
 * Everything already watched or watchlisted, which a recommendation must not
 * repeat.
 *
 * Both reads are paged. This is an exclusion set, so PostgREST's silent
 * 1000-row cap does not shorten the answer here, it makes it wrong: past a
 * thousand entries the user was recommended films they had already seen, while
 * /api/library/ids — which is paged — painted a ✓ on the very same cards. The
 * `.order('id')` is the unique tiebreak fetchAllRows requires; without one the
 * windows duplicate and skip.
 *
 * A failed read throws for the same reason. An incomplete exclusion set and a
 * truncated one are the same wrong answer, and /api/recommendations reports a
 * 500 to a page that has an error card for it, while Home's card already
 * catches to null.
 *
 * This runs on every dashboard render and every recommendations load, so it
 * pages concurrently: walking the windows in sequence cost one round trip per
 * thousand rows, fifteen for a library of fifteen thousand entries. The first
 * window carries the count, so a library under a thousand is still one
 * request each.
 */
async function fetchLibraryTmdbIds(supabase: ServerSupabase, userId: string): Promise<Set<number>> {
  const [watched, watchlist] = await Promise.all([
    fetchAllRowsConcurrent<JoinedTmdbId>((from, to, withCount) =>
      supabase
        .from('watch_entries')
        .select('media!inner(tmdb_id)', withCount ? { count: 'exact' } : undefined)
        .eq('user_id', userId)
        .order('id')
        .range(from, to)
    ),
    fetchAllRowsConcurrent<JoinedTmdbId>((from, to, withCount) =>
      supabase
        .from('watchlist_items')
        .select('media!inner(tmdb_id)', withCount ? { count: 'exact' } : undefined)
        .eq('user_id', userId)
        .order('id')
        .range(from, to)
    ),
  ])

  const error = watched.error ?? watchlist.error
  if (error) throw new Error(`Could not read the library to exclude it: ${error}`)

  return new Set([...tmdbIds(watched.rows), ...tmdbIds(watchlist.rows)])
}

// TMDB's recommendations for each seed, merged: a title recommended by several
// seeds scores once per seed, weighted by how the user rated that seed, and is
// credited to the best-rated seed that recommended it.
async function scoreSeedRecommendations(
  recentWatched: SeedRow[],
  excludedIds: Set<number>
): Promise<ScoredRecommendation[]> {
  const recommendationLists = await Promise.all(
    recentWatched.map(async (entry) => {
      try {
        return await fetchTmdbRecommendations(entry.media.tmdb_id, entry.media.type)
      } catch (err) {
        console.error(`Failed to fetch recommendations for TMDB ID ${entry.media.tmdb_id}:`, err)
        return []
      }
    })
  )

  const scoredItems = new Map<number, ScoredRecommendation>()

  recommendationLists.forEach((list, index) => {
    // We can weight recommendations based on user rating if available (default weight 1.0)
    const rating = recentWatched[index]?.rating
    const weight = rating ? Number(rating) / 5.0 : 1.0
    const seedTitle = recentWatched[index]?.media?.title

    list.forEach((item) => {
      // Exclude already watched or watchlisted items
      if (excludedIds.has(item.tmdb_id)) return

      const existing = scoredItems.get(item.tmdb_id)
      if (existing) {
        existing.score += 1 * weight
        if (seedTitle && weight > (existing.seedWeight ?? 0)) {
          existing.item = { ...existing.item, seed_title: seedTitle }
          existing.seedWeight = weight
        }
      } else {
        scoredItems.set(item.tmdb_id, {
          item: seedTitle ? { ...item, seed_title: seedTitle } : item,
          score: 1 * weight,
          seedWeight: seedTitle ? weight : undefined,
        })
      }
    })
  })

  return Array.from(scoredItems.values())
}

function matchesGenreFilter(item: TmdbSearchResult, genre: string, type: TypeFilter) {
  return (type === 'all' || item.type === type) && (item.genres ?? []).includes(genre)
}

function shuffleWithinScoreBands(items: ScoredRecommendation[]) {
  const bands = new Map<number, ScoredRecommendation[]>()
  items.forEach((entry) => {
    const band = Math.round(entry.score * 10) / 10
    bands.set(band, [...(bands.get(band) ?? []), entry])
  })

  return Array.from(bands.entries())
    .sort(([a], [b]) => b - a)
    .flatMap(([, band]) => shuffleItems(band))
}

function shuffleItems<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5)
}

async function addGenreTopUp(
  baseResults: TmdbSearchResult[],
  genre: string | null,
  type: TypeFilter,
  page: number,
  excludedIds: Set<number>
) {
  if (!genre) return { results: baseResults, hasMoreDiscover: false }

  let matchingCount = baseResults.filter((item) => matchesGenreFilter(item, genre, type)).length
  if (matchingCount >= GENRE_TARGET_COUNT) return { results: baseResults, hasMoreDiscover: false }

  const seenIds = new Set([...excludedIds, ...baseResults.map((item) => item.tmdb_id)])
  const types: MediaType[] = type === 'all' ? ['movie', 'show'] : [type]
  const discovered = await Promise.all(types.map((mediaType) => discoverByGenre(genre, mediaType, page)))
  const hasMoreDiscover = discovered.some((batch) => page < batch.total_pages)
  const topUps: TmdbSearchResult[] = []

  for (const item of discovered.flatMap((batch) => batch.results)) {
    if (seenIds.has(item.tmdb_id) || !matchesGenreFilter(item, genre, type)) continue
    seenIds.add(item.tmdb_id)
    topUps.push(item)
    matchingCount += 1
    if (matchingCount >= GENRE_TARGET_COUNT) break
  }

  return { results: [...baseResults, ...topUps], hasMoreDiscover }
}

export type RecommendationOptions = {
  /** Ids the client already shows. */
  excludeIds?: Set<number>
  genre?: string | null
  type?: TypeFilter
  page?: number
  /** Shuffle within score bands instead of a strict score order. */
  refresh?: boolean
  /** How many times Refresh has been pressed — rotates the seed window. */
  cycle?: number
}

/** The /api/recommendations response for one user. */
export async function getRecommendations(
  supabase: ServerSupabase,
  userId: string,
  { excludeIds = new Set(), genre = null, type = 'all', page = 1, refresh = false, cycle = 0 }: RecommendationOptions = {}
): Promise<RecommendationsResponse> {
  // 1. Fetch user's full history to exclude already watched/watchlisted items
  const [libraryIds, recentWatched] = await Promise.all([
    fetchLibraryTmdbIds(supabase, userId),
    fetchSeeds(supabase, userId, cycle * SEED_LIMIT),
  ])
  const excludedIds = new Set([...libraryIds, ...excludeIds])

  // Fallback: only reached when the history is genuinely empty — every seed
  // tier above came back with nothing.
  if (recentWatched.length === 0) {
    const [trending1, trending2, trending3, trending4, trending5] = await Promise.all([
      fetchTmdbTrending(1),
      fetchTmdbTrending(2),
      fetchTmdbTrending(3),
      fetchTmdbTrending(4),
      fetchTmdbTrending(5),
    ])
    const trending = [...trending1, ...trending2, ...trending3, ...trending4, ...trending5]
    const filteredTrending = trending.filter(
      (item) => !excludedIds.has(item.tmdb_id)
    )
    const sortedTrending = refresh ? shuffleItems(filteredTrending) : filteredTrending
    const baseResults = sortedTrending.slice(0, RESULT_LIMIT)
    const { results, hasMoreDiscover } = await addGenreTopUp(
      baseResults,
      genre,
      type,
      page,
      excludedIds
    )
    return {
      results,
      fallback: true,
      hasMore: filteredTrending.length > RESULT_LIMIT || hasMoreDiscover,
    }
  }

  // 2-3. Fetch, score and deduplicate TMDB recommendations for the seeds
  const scoredResults = await scoreSeedRecommendations(recentWatched, excludedIds)

  // 4. Sort by score descending and return the top 100 results
  const sortedResults = (refresh
    ? shuffleWithinScoreBands(scoredResults)
    : scoredResults.sort((a, b) => b.score - a.score)
  ).map((entry) => entry.item)

  const baseResults = sortedResults.slice(0, RESULT_LIMIT)
  const { results, hasMoreDiscover } = await addGenreTopUp(
    baseResults,
    genre,
    type,
    page,
    excludedIds
  )

  return {
    results,
    fallback: false,
    hasMore: sortedResults.length > RESULT_LIMIT || hasMoreDiscover,
  }
}

/**
 * The first title the Recommendations page would open on, with the seed it is
 * credited to, for Home's "Because you watched <seed_title>" card. Null when
 * there is no history to seed from: the trending fallback has no seed to name,
 * so it is never fetched here.
 */
export async function getTopRecommendation(
  supabase: ServerSupabase,
  userId: string
): Promise<(RecommendationWithSeed & { seed_title: string }) | null> {
  const [excludedIds, seeds] = await Promise.all([
    fetchLibraryTmdbIds(supabase, userId),
    fetchSeeds(supabase, userId, 0),
  ])
  if (seeds.length === 0) return null

  const scored = await scoreSeedRecommendations(seeds, excludedIds)
  // The same stable score sort as getRecommendations, so ties keep seed order.
  const top = scored.sort((a, b) => b.score - a.score)[0]?.item
  return top?.seed_title ? { ...top, seed_title: top.seed_title } : null
}
