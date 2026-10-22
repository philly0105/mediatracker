import { createClient } from '@/lib/supabase/server'
import AmbientBackdrop from '@/components/AmbientBackdrop'

type RecentRow = { media: { backdrop_url: string | null } | { backdrop_url: string | null }[] | null }

/**
 * The signed-in default for the ambient layer: the backdrop of the most
 * recently logged watch. One indexed row (idx_watch_entries_user_created_at),
 * joined to media for the URL. Rendered inside Suspense by the (app) layout so
 * it streams in after the page rather than delaying it.
 *
 * It must never take the page down with it. `media.backdrop_url` arrives with
 * migration 014, which is not applied everywhere yet, so an error, a missing
 * column or an empty library all resolve to "no fallback" and the host paints
 * the tint alone.
 */
export default async function RecentAmbient({ userId }: { userId: string }) {
  let backdrop: string | null = null
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('watch_entries')
      .select('media!inner(backdrop_url)')
      .eq('user_id', userId)
      .not('media.backdrop_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!error && data) {
      const media = (data as RecentRow).media
      backdrop = (Array.isArray(media) ? media[0] : media)?.backdrop_url ?? null
    }
  } catch {
    backdrop = null
  }

  return <AmbientBackdrop src={backdrop} fallback />
}
