import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/ogCard'

// A share link's whole job is to be pasted somewhere, so it is the one route
// where the preview card is the feature. It deliberately does not read the
// token: the page behind it is noindex precisely because the token is the only
// thing guarding it, and titles rendered into an og:image are cached and
// re-served by every link unfurler that touches the URL.
export const alt = 'A watch history shared from DorfMovies'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOgCard({
    eyebrow: 'Shared list',
    title: 'Watched',
    description: 'A watch history shared from DorfMovies.',
  })
}
