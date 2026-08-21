import type { Metadata } from 'next'
import { Suspense } from 'react'
import LibraryView from '@/components/LibraryView'
import { PosterGridSkeleton } from '@/components/ui/Skeleton'

export const metadata: Metadata = {
  title: 'Library',
  description: 'Everything you have watched.',
}

export default function LibraryPage() {
  // LibraryView reads useSearchParams (via useUrlFilters), which needs a
  // Suspense boundary or the whole route opts out of static rendering.
  return (
    <Suspense fallback={<PosterGridSkeleton count={10} />}>
      <LibraryView />
    </Suspense>
  )
}