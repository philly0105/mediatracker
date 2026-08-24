import type { Metadata } from 'next'
import { Suspense } from 'react'
import LibraryView from '@/components/LibraryView'
import LibraryLoading from './loading'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { fetchWatchEntries } from '@/lib/watchEntries'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Library',
  description: 'Everything you have watched.',
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] | undefined }>
}) {
  const user = await getAuthenticatedUser()
  if (!user) redirect('/login')

  const resolvedParams = await searchParams
  const rawType = Array.isArray(resolvedParams?.type) ? resolvedParams.type[0] : resolvedParams?.type
  const typeFilter = rawType === 'movie' || rawType === 'show' ? rawType : 'all'

  const supabase = await createClient()
  const { entries, error } = await fetchWatchEntries({
    supabase,
    userId: user.id,
    type: typeFilter,
  })

  if (error) {
    throw new Error(error)
  }

  // eslint-disable-next-line react-hooks/purity
  const initialFetchedAt = Date.now()

  // LibraryView reads useSearchParams (via useUrlFilters), which needs a
  // Suspense boundary or the whole route opts out of static rendering.
  //
  // Same component as loading.tsx so the route-level skeleton does not flash
  // into a differently-shaped one the moment the page segment resolves. It used
  // to be PosterGridSkeleton, which is the grid view — the default is the list.
  return (
    <Suspense fallback={<LibraryLoading />}>
      <LibraryView
        initialEntries={entries}
        initialType={typeFilter}
        initialFetchedAt={initialFetchedAt}
      />
    </Suspense>
  )
}
