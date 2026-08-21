import { createClient } from '@/lib/supabase/server'
import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/ogCard'

// This is the route people actually paste — Continue Watching, bookmarks and
// share links all land here. It used to hand out the raw 2:3 TMDB poster as
// og:image, which every consumer crops to 1.91:1.
export const alt = 'A title on DorfMovies'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Mirrors the layout's generateMetadata: a lookup failure must produce a card,
  // not a 500 that leaves the link with no preview at all.
  let media: { title: string; overview: string | null; poster_url: string | null; release_year: number | null } | null = null
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('media')
      .select('title, overview, poster_url, release_year')
      .eq('id', id)
      .maybeSingle()
    media = data
  } catch {
    media = null
  }

  if (!media) {
    return renderOgCard({ eyebrow: 'DorfMovies', title: 'Track what you watch' })
  }

  return renderOgCard({
    eyebrow: 'On DorfMovies',
    title: media.title,
    meta: media.release_year ? String(media.release_year) : undefined,
    description: media.overview,
    poster: media.poster_url,
  })
}
