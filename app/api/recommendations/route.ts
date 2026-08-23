import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { discoverByGenre, fetchTmdbRecommendations, fetchTmdbTrending } from '@/lib/tmdb'
import type { MediaType, TmdbSearchResult } from '@/types'

type TypeFilter = MediaType | 'all'
type RecommendationWithSeed = TmdbSearchResult & { seed_title?: string }
type ScoredRecommendation = { item: RecommendationWithSeed; score: number; seedWeight?: number }

const RESULT_LIMIT = 100
const GENRE_TARGET_COUNT = 12
/** Titles used to seed TMDB's recommendation lists. */
const SEED_LIMIT = 15
/** Rows pulled per seed tier so Refresh has somewhere new to rotate to. */
const SEED_POOL = 60

function parseExcludeIds(value: string | null) {
  return new Set(
    (value ?? '')
      .split(',')
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id))
  )
}

function parseTypeFilter(value: string | null): TypeFilter {
  return value === 'movie' || value === 'show' ? value : 'all'
}

function parsePage(value: string | null) {
  const page = Number.parseInt(value ?? '1', 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

/** How many times Refresh has been pressed — rotates the seed window. */
function parseCycle(value: string | null) {
  const cycle = Number.parseInt(value ?? '0', 10)
  return Number.isFinite(cycle) && cycle > 0 ? cycle : 0
}

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
  supabase: Awaited<ReturnType<typeof createClient>>,
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const excludeIds = parseExcludeIds(searchParams.get('excludeIds'))
  const genre = searchParams.get('genre')?.trim() || null
  const type = parseTypeFilter(searchParams.get('type'))
  const page = parsePage(searchParams.get('page'))
  const refresh = Boolean(searchParams.get('refresh'))
  const cycle = parseCycle(searchParams.get('cycle'))

  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1. Fetch user's full history to exclude already watched/watchlisted items
  const [
    { data: watchedList },
    { data: watchlistList },
    recentWatched,
  ] = await Promise.all([
    supabase.from('watch_entries').select('media!inner(tmdb_id)').eq('user_id', user.id),
    supabase.from('watchlist_items').select('media!inner(tmdb_id)').eq('user_id', user.id),
    fetchSeeds(supabase, user.id, cycle * SEED_LIMIT),
  ])

  type JoinedMediaTmdbId = { media: { tmdb_id: number } }
  const watchedIds = new Set(((watchedList ?? []) as unknown as JoinedMediaTmdbId[]).map((w) => w.media.tmdb_id))
  const watchlistIds = new Set(((watchlistList ?? []) as unknown as JoinedMediaTmdbId[]).map((w) => w.media.tmdb_id))
  const excludedIds = new Set([...watchedIds, ...watchlistIds, ...excludeIds])

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
    return NextResponse.json({
      results,
      fallback: true,
      hasMore: filteredTrending.length > RESULT_LIMIT || hasMoreDiscover,
    })
  }

  // 2. Fetch TMDB recommendations in parallel for recently watched items
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

  // 3. Aggregate, score, and deduplicate recommendations
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

  // 4. Sort by score descending and return the top 100 results
  const scoredResults = Array.from(scoredItems.values())
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

  return NextResponse.json({
    results,
    fallback: false,
    hasMore: sortedResults.length > RESULT_LIMIT || hasMoreDiscover,
  })
}
