import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchTmdbDetails } from '@/lib/tmdb'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: watchlist, error } = await supabase
    .from('watchlist_items')
    .select('priority, media(tmdb_id, type)')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!watchlist || watchlist.length === 0) return NextResponse.json({ releases: [] })

  const todayStr = new Date().toISOString().split('T')[0]

  // Fetch full details for all watchlist items to get exact release dates
  // We process them all at once since TMDB limits are quite generous (40/sec), but a real app might batch this.
  const detailsPromises = watchlist.map(async (item: any) => {
    try {
      const details = await fetchTmdbDetails(item.media.tmdb_id, item.media.type)
      return {
        ...details,
        priority: item.priority
      }
    } catch (err) {
      console.error(`Failed to fetch details for ${item.media.tmdb_id}:`, err)
      return null
    }
  })

  const results = await Promise.all(detailsPromises)

  // Filter for upcoming releases
  const upcoming = results.filter((item) => {
    if (!item || !item.full_release_date) return false
    return item.full_release_date >= todayStr
  })

  // Sort ascending by release date
  upcoming.sort((a, b) => {
    if (a!.full_release_date! < b!.full_release_date!) return -1
    if (a!.full_release_date! > b!.full_release_date!) return 1
    return 0
  })

  return NextResponse.json({ releases: upcoming })
}
