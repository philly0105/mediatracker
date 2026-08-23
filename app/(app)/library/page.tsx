import type { Metadata } from 'next'
import { Suspense } from 'react'
import LibraryView from '@/components/LibraryView'
import LibraryLoading from './loading'

export const metadata: Metadata = {
  title: 'Library',
  description: 'Everything you have watched.',
}

export default function LibraryPage() {
  // LibraryView reads useSearchParams (via useUrlFilters), which needs a
  // Suspense boundary or the whole route opts out of static rendering.
  //
  // Same component as loading.tsx so the route-level skeleton does not flash
  // into a differently-shaped one the moment the page segment resolves. It used
  // to be PosterGridSkeleton, which is the grid view — the default is the list.
  return (
    <Suspense fallback={<LibraryLoading />}>
      <LibraryView />
    </Suspense>
  )
}
