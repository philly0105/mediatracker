import { Suspense } from 'react'
import LibraryView from '@/components/LibraryView'

export default function ShowsPage() {
  // LibraryView reads useSearchParams (via useUrlFilters), which needs a
  // Suspense boundary or the whole route opts out of static rendering.
  return (
    <Suspense>
      <LibraryView type="show" title="TV Shows" noun="shows" />
    </Suspense>
  )
}
