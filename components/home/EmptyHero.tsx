import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { Compass, Bookmark } from 'lucide-react'

const semibold = 'var(--weight-semibold)' as CSSProperties['fontWeight']

type Props = {
  /** The most recent watch, whose art fills the stage; null for a fresh library. */
  recent: { title: string; backdrop_url: string | null } | null
  /**
   * Preload the art as the page's LCP image. Off by default: the page gives
   * its one preload to the recent rail when this art is a late TMDB fallback.
   */
  preload?: boolean
}

/**
 * The hero when nothing is in progress: the same frame and slab, with the
 * most recent watch's art behind a "Pick something to watch" prompt and the
 * two places to find one. No episode state, so this is a server component.
 */
export default function EmptyHero({ recent, preload = false }: Props) {
  return (
    <section
      aria-labelledby="hero-title"
      // The hero tier through the panel's custom property, not an inline
      // background, so the reduced-transparency and @supports fallbacks
      // still reach it.
      className="glass-panel glass-rim [--glass-panel:var(--glass-hero)]"
      style={{ padding: 8, borderRadius: 32, boxShadow: 'var(--shadow-xl)' }}
    >
      <div
        className="@container relative flex flex-col overflow-hidden lg:min-h-[360px] lg:flex-row"
        style={{ borderRadius: 24, background: 'var(--bg-deep)' }}
      >
        <div className="relative h-[220px] w-full md:h-[320px] lg:absolute lg:inset-0 lg:h-auto">
          {recent?.backdrop_url && (
            <Image
              src={recent.backdrop_url}
              alt=""
              aria-hidden="true"
              fill
              preload={preload}
              fetchPriority={preload ? 'high' : undefined}
              sizes="(max-width: 1023px) 100vw, 1200px"
              className="object-cover object-[50%_18%]"
            />
          )}
        </div>
        <div
          className="glass-slab glass-rim flex flex-col rounded-none p-5 md:p-7 lg:m-4 lg:w-[min(480px,60cqw-32px)] lg:rounded-[var(--radius-slab)]"
          style={{ flex: 'none', maxWidth: '100%' }}
        >
          <span style={{ fontSize: 'var(--text-sm)', lineHeight: '18px', fontWeight: semibold, color: 'var(--text-muted)' }}>
            {recent ? `Last watched · ${recent.title}` : 'Nothing in progress'}
          </span>
          <h2
            id="hero-title"
            style={{
              margin: '16px 0 0', fontSize: 'var(--text-4xl)', lineHeight: '42px',
              fontWeight: 'var(--weight-heading)' as CSSProperties['fontWeight'],
              letterSpacing: 'var(--tracking-tight)', color: 'var(--text-primary)',
            }}
          >
            Pick something to watch
          </h2>
          <p style={{ margin: '12px 0 0', fontSize: 'var(--text-body)', lineHeight: '22px', color: 'var(--text-secondary)' }}>
            Start a show and it takes this spot, with the next episode a tap away.
          </p>
          <div className="flex flex-wrap items-center" style={{ marginTop: 'auto', paddingTop: 24, gap: 8 }}>
            <Link
              href="/recommendations"
              className="btn btn-primary inline-flex basis-full items-center justify-center gap-2 md:basis-auto"
              style={{ minHeight: 48, padding: '0 20px 0 16px', fontSize: 'var(--text-body)', fontWeight: semibold, textDecoration: 'none' }}
            >
              <Compass size={18} strokeWidth={1.8} aria-hidden="true" />
              Recommendations
            </Link>
            <Link
              href="/watchlist"
              className="btn btn-ghost inline-flex flex-auto items-center justify-center gap-2 md:flex-none"
              style={{ minHeight: 48, padding: '0 18px', fontSize: 'var(--text-body)', fontWeight: semibold, textDecoration: 'none' }}
            >
              <Bookmark size={18} strokeWidth={1.8} aria-hidden="true" />
              Watchlist
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
