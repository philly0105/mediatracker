import { Suspense } from 'react'
import LibraryView from '@/components/LibraryView'

export default function MoviesPage() {
  // LibraryView reads useSearchParams (via useUrlFilters), which needs a
  // Suspense boundary or the whole route opts out of static rendering.
  return (
    <Suspense>
      <LibraryView type="movie" title="Movies" noun="movies" />
    </Suspense>
  )
}
