import { getCollectionDetails } from '@/lib/tmdb'
import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/ogCard'

// getCollectionDetails is fetch-cached for 7 days, so this shares the cache
// entry the page and its generateMetadata already populate.
export const alt = 'A franchise on DorfMovies'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const collectionId = parseInt(id)

  if (!isNaN(collectionId)) {
    try {
      const collection = await getCollectionDetails(collectionId)
      return renderOgCard({
        eyebrow: 'Franchise',
        title: collection.name,
        meta: collection.parts.length === 1 ? '1 film' : `${collection.parts.length} films`,
        description: collection.overview,
        poster: collection.poster_url,
      })
    } catch {
      // Falls through to the generic card below.
    }
  }

  return renderOgCard({ eyebrow: 'Franchise', title: 'A collection on DorfMovies' })
}
