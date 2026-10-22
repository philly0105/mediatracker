'use client'
import Image from 'next/image'
import { Check, Loader2, Plus, Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'

export interface RecommendationCardItem {
  title: string
  type: 'movie' | 'show'
  overview: string
  poster_url: string | null
  release_year: number | null
  vote_average?: number
  seed_title?: string
}

interface RecommendationCardProps {
  item: RecommendationCardItem
  /** True while either action is in flight; both buttons disable and spin. */
  actioning: boolean
  onOpen: () => void
  onAddToWatchlist: () => void
  onMarkWatched: () => void
}

// A 2:3 thumb at the row's own height; the card never grows past the text.
const POSTER_W = 80
const POSTER_H = 120

/** The three-up row grid: one column on phones, two from the content
 *  breakpoint, three from 1280. Exported so the page, its load state and its
 *  loading.tsx lay the rows out identically and nothing moves when the real
 *  rows replace the placeholders. */
export const RECOMMENDATION_ROW_GRID = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'

// These rows stand on the ambient, not inside a panel, so they get a dark
// base: over a warm backdrop (Sinners) the overview's secondary text otherwise
// lands just under 4.5:1. The base is the background image only, leaving
// .glass-row's fill, and its hover fade, on the colour: a gradient cannot
// transition, so folding the fill into one would snap the hover.
const ROW_BASE = 'bg-[image:linear-gradient(rgba(9,20,27,.30),rgba(9,20,27,.30))]'

/**
 * One recommendation as a compact glass row (spec §5.6): poster thumb, title
 * with the type chip, year and TMDB rating, the seed line, two lines of
 * overview and the two secondary pills. A row rather than a PosterCard because
 * the "Because you watched" line and the overview are the point of the page.
 * Rows carry no blur, so a grid of them stays inside the glass budget.
 */
export function RecommendationCard({ item, actioning, onOpen, onAddToWatchlist, onMarkWatched }: RecommendationCardProps) {
  const rating = item.vote_average !== undefined && item.vote_average > 0 ? item.vote_average.toFixed(1) : null

  return (
    <Card
      variant="row"
      onClick={onOpen}
      aria-label={item.title}
      className={`motion-item-in group h-full select-none ${ROW_BASE}`}
      style={{ display: 'flex', gap: 14, padding: 12 }}
    >
      {item.poster_url ? (
        // The title beside it names the row, so the art is decorative.
        <Image
          src={item.poster_url}
          alt=""
          aria-hidden="true"
          width={POSTER_W}
          height={POSTER_H}
          className="shrink-0 rounded-[var(--radius-thumb)] bg-[var(--bg-void)] object-cover shadow-[var(--shadow-sm)]"
          style={{ width: POSTER_W, height: POSTER_H }}
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex shrink-0 items-center justify-center rounded-[var(--radius-thumb)] bg-[var(--bg-void)] text-[length:var(--text-2xs)] text-[var(--text-muted)] shadow-[var(--shadow-sm)]"
          style={{ width: POSTER_W, height: POSTER_H }}
        >
          No Poster
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 line-clamp-1 text-[length:var(--text-md)] font-semibold leading-5 text-[var(--text-primary)] transition-colors duration-200 group-hover:text-[var(--accent)]">
            {item.title}
          </h2>
          <Badge>{item.type === 'show' ? 'TV' : 'Movie'}</Badge>
        </div>

        {(item.release_year || rating) && (
          <p className="tabular mt-1 flex items-center gap-2 text-[length:var(--text-xs)] leading-4 text-[var(--text-muted)]">
            {item.release_year && <span>{item.release_year}</span>}
            {rating && (
              <span className="inline-flex items-center gap-1 font-semibold text-[var(--text-secondary)]">
                <Star className="h-3 w-3 fill-current text-[var(--rating)]" strokeWidth={1.8} aria-hidden="true" />
                {rating}
              </span>
            )}
          </p>
        )}

        {item.seed_title && (
          <p className="mt-1 line-clamp-1 text-[length:var(--text-xs)] leading-4 text-[var(--text-muted)]">
            Because you watched {item.seed_title}
          </p>
        )}

        <p className="mt-1.5 line-clamp-2 text-[length:var(--text-sm)] leading-[18px] text-[var(--text-secondary)]">
          {item.overview || 'No description available.'}
        </p>

        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={actioning}
            onClick={(e) => {
              e.stopPropagation()
              onAddToWatchlist()
            }}
            style={{ flex: '1 1 auto' }}
          >
            {actioning ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            )}
            <span>Watchlist</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={actioning}
            onClick={(e) => {
              e.stopPropagation()
              onMarkWatched()
            }}
            style={{ flex: '1 1 auto' }}
          >
            {actioning ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            )}
            <span>Watched</span>
          </Button>
        </div>
      </div>
    </Card>
  )
}

/** The same row, as placeholder blocks; shared by the page's load state and
 *  its loading.tsx so the two paint the same shape. The row's hover fill is
 *  for clickable rows, and a placeholder is not one. */
export function RecommendationCardSkeleton() {
  return (
    <div className={`glass-row flex gap-3.5 p-3 hover:bg-[var(--glass-card)] ${ROW_BASE}`}>
      <Skeleton className="h-30 w-20 shrink-0 rounded-[var(--radius-thumb)]" />
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-6 w-12 rounded-[var(--radius-pill)]" />
        </div>
        <Skeleton className="mt-2 h-3 w-1/4" />
        <Skeleton className="mt-2 h-3 w-full" />
        <Skeleton className="mt-1.5 h-3 w-5/6" />
        <div className="mt-auto flex gap-2 pt-3">
          <Skeleton className="h-11 flex-1 rounded-[var(--radius-pill)]" />
          <Skeleton className="h-11 flex-1 rounded-[var(--radius-pill)]" />
        </div>
      </div>
    </div>
  )
}
