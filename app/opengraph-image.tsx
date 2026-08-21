import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/ogCard'

// The app-wide default. Every route that does not supply its own card inherits
// this one, so /library, /stats and the dashboard stop previewing as a bare link.
export const alt = 'DorfMovies — track your movies, TV shows and watchlists'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOgCard({
    eyebrow: 'DorfMovies',
    title: 'Track what you watch',
    description: 'Movies, TV shows, watchlists and episode progress, in one place.',
  })
}
