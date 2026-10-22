import { fetchTmdbDetails } from '@/lib/tmdb'
import type { RecommendationWithSeed } from '@/lib/recommendations'
import { Skeleton } from '@/components/ui/Skeleton'
import BecauseYouWatchedCard from './BecauseYouWatchedCard'

export type TopRecommendation = RecommendationWithSeed & { seed_title: string }

/**
 * The reference's "Because you watched" card, fed by the same scoring as
 * /recommendations. The recommendation promise was started with the page's
 * first reads and is only awaited here, inside its own Suspense boundary. The
 * detail fetch is for the logo and platform the search result does not carry;
 * TMDB being down costs the card those, not the card.
 */
export default async function BecauseYouWatched({ rec }: { rec: Promise<TopRecommendation | null> }) {
  const item = await rec
  if (!item) return null

  let details: Awaited<ReturnType<typeof fetchTmdbDetails>> | null = null
  try {
    details = await fetchTmdbDetails(item.tmdb_id, item.type)
  } catch {
    details = null
  }

  return (
    <BecauseYouWatchedCard
      item={item}
      seedTitle={item.seed_title}
      backdropUrl={item.backdrop_url ?? details?.backdrop_url ?? null}
      logoUrl={details?.logo_url ?? null}
      platform={details?.watch_providers?.flatrate?.[0]?.provider_name ?? null}
      year={item.release_year ?? details?.release_year ?? null}
      genres={item.genres?.length ? item.genres : details?.genres ?? []}
    />
  )
}

/** The card's footprint while the recommendation is scored. */
export function BecauseYouWatchedSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="card-surface flex-[1_1_340px]"
      style={{ padding: 8, borderRadius: 'var(--radius-2xl)', minWidth: 0 }}
    >
      <span className="sr-only">Loading a recommendation...</span>
      <Skeleton className="h-full min-h-[268px] w-full rounded-[20px]" />
    </div>
  )
}
