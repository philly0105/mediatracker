import { createClient } from '@/lib/supabase/server'
import { MustWatchList, type MustWatchItem, type MustWatchMedia } from '@/components/Sidebar'

type Row = { id: string; media: MustWatchMedia | MustWatchMedia[] | null }

/**
 * The sidebar's "Must watch" mini-list: the five most recently added
 * must-watch titles and the bucket's total, in the order the watchlist page
 * shows them. One query, rendered inside Suspense by the (app) layout so it
 * streams in behind the shell rather than delaying it.
 *
 * Like RecentAmbient it must never take the page down with it: an error or an
 * empty bucket both resolve to no section.
 */
export default async function SidebarMustWatch({ userId }: { userId: string }) {
  let items: MustWatchItem[] = []
  let total = 0
  try {
    const supabase = await createClient()
    const { data, count, error } = await supabase
      .from('watchlist_items')
      .select('id, media!inner(tmdb_id, type, title, overview, poster_url, release_year, genres, vote_average)', { count: 'exact' })
      .eq('user_id', userId)
      .eq('priority', 'must_watch')
      .order('added_at', { ascending: false })
      .limit(5)
    if (!error && data) {
      items = (data as Row[]).flatMap((row) => {
        const media = Array.isArray(row.media) ? row.media[0] : row.media
        return media ? [{ id: row.id, media }] : []
      })
      total = count ?? items.length
    }
  } catch {
    items = []
  }

  return <MustWatchList items={items} total={total} />
}
