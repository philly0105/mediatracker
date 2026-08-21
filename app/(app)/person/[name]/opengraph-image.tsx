import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/ogCard'

// The name is already in the URL, so this needs no fetch — same reasoning as
// the sibling layout's generateMetadata.
export const alt = 'A person on DorfMovies'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const person = decodeURIComponent(name)

  return renderOgCard({
    eyebrow: 'Cast & crew',
    title: person,
    description: `Movies and shows featuring ${person}.`,
  })
}
