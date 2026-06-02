import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchTmdbRecommendations, fetchTmdbTrending } from '@/lib/tmdb'
import type { TmdbSearchResult } from '@/types'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1. Fetch user's full history to exclude already watched/watchlisted items
  const [
    { data: watchedList },
    { data: watchlistList },
    { data: recentWatched },
  ] = await Promise.all([
    supabase.from('watch_entries').select('media!inner(tmdb_id)').eq('user_id', user.id),
    supabase.from('watchlist_items').select('media!inner(tmdb_id)').eq('user_id', user.id),
    supabase
      .from('watch_entries')
      .select('rating, media!inner(tmdb_id, type)')
      .eq('user_id', user.id)
      .not('rating', 'is', null)
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  const watchedIds = new Set((watchedList ?? []).map((w: any) => w.media.tmdb_id))
  const watchlistIds = new Set((watchlistList ?? []).map((w: any) => w.media.tmdb_id))

  // Fallback: If user has watched nothing, return weekly trending items
  if (!recentWatched || recentWatched.length === 0) {
    const [trending1, trending2, trending3, trending4, trending5] = await Promise.all([
      fetchTmdbTrending(1),
      fetchTmdbTrending(2),
      fetchTmdbTrending(3),
      fetchTmdbTrending(4),
      fetchTmdbTrending(5),
    ])
    const trending = [...trending1, ...trending2, ...trending3, ...trending4, ...trending5]
    const filteredTrending = trending.filter(
      (item) => !watchedIds.has(item.tmdb_id) && !watchlistIds.has(item.tmdb_id)
    )
    return NextResponse.json({ results: filteredTrending.slice(0, 100), fallback: true })
  }

  // 2. Fetch TMDB recommendations in parallel for recently watched items
  const recommendationLists = await Promise.all(
    recentWatched.map(async (entry: any) => {
      try {
        return await fetchTmdbRecommendations(entry.media.tmdb_id, entry.media.type)
      } catch (err) {
        console.error(`Failed to fetch recommendations for TMDB ID ${entry.media.tmdb_id}:`, err)
        return []
      }
    })
  )

  // 3. Aggregate, score, and deduplicate recommendations
  const scoredItems = new Map<number, { item: TmdbSearchResult; score: number }>()

  recommendationLists.forEach((list, index) => {
    // We can weight recommendations based on user rating if available (default weight 1.0)
    const rating = recentWatched[index]?.rating
    const weight = rating ? Number(rating) / 5.0 : 1.0

    list.forEach((item) => {
      // Exclude already watched or watchlisted items
      if (watchedIds.has(item.tmdb_id) || watchlistIds.has(item.tmdb_id)) return

      const existing = scoredItems.get(item.tmdb_id)
      if (existing) {
        existing.score += 1 * weight
      } else {
        scoredItems.set(item.tmdb_id, { item, score: 1 * weight })
      }
    })
  })

  // 4. Sort by score descending and return the top 100 results
  const sortedResults = Array.from(scoredItems.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item)
    .slice(0, 100)

  return NextResponse.json({ results: sortedResults, fallback: false })
}
