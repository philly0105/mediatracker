'use client'
import Image from 'next/image'
import type { CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { Bookmark } from 'lucide-react'
import type { TmdbSearchResult } from '@/types'
import { useMediaModal } from '@/components/MediaModalProvider'

// The reference's scrim under the card's text: clear at the top, near-solid
// at the foot, so the meta line reads on any backdrop.
const SCRIM = 'linear-gradient(180deg, rgba(5,12,16,0) 0%, rgba(5,12,16,.62) 38%, rgba(5,12,16,.86) 68%, rgba(5,12,16,.94) 100%)'
const semibold = 'var(--weight-semibold)' as CSSProperties['fontWeight']

// The title text: the heading when there is no logo, and the logo's stand-in
// under forced colours.
const TITLE: CSSProperties = {
  fontSize: 'var(--text-2xl)', lineHeight: '28px',
  fontWeight: 'var(--weight-heading)' as CSSProperties['fontWeight'],
  letterSpacing: 'var(--tracking-tight)', color: 'var(--text-primary)',
}

type Props = {
  item: TmdbSearchResult
  seedTitle: string
  backdropUrl: string | null
  logoUrl: string | null
  platform: string | null
  year: number | null
  genres: string[]
}

/**
 * One recommendation as a backdrop card: the seed title above the logo (or
 * the title, when TMDB has no logo), a meta line, and a "Must watch" pill that
 * opens the title the way /recommendations does, adding to that bucket. The
 * frame is the panel tint without blur: it holds a photo, and a blur under
 * one would be paid for nothing.
 */
export default function BecauseYouWatchedCard({ item, seedTitle, backdropUrl, logoUrl, platform, year, genres }: Props) {
  const router = useRouter()
  const { openMedia, closeMedia } = useMediaModal()
  const meta = [platform, year, ...genres.slice(0, 2)].filter(Boolean).join(' · ')

  return (
    <section
      aria-labelledby="byw-title"
      className="card-surface flex flex-col"
      style={{ flex: '1 1 340px', padding: 8, borderRadius: 'var(--radius-2xl)', minWidth: 0 }}
    >
      <div
        className="relative min-h-[320px] overflow-hidden md:min-h-[268px]"
        style={{ flex: '1 1 auto', borderRadius: 20, background: 'var(--bg-deep)' }}
      >
        {backdropUrl && (
          <Image
            src={backdropUrl}
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 767px) 100vw, 480px"
            className="object-cover object-[50%_22%]"
          />
        )}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[270px] md:h-[210px]" style={{ background: SCRIM, pointerEvents: 'none' }} />
        <div
          className="absolute flex flex-wrap items-end justify-between"
          style={{ left: 20, right: 20, bottom: 18, gap: '14px 16px' }}
        >
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 'var(--text-xs)', lineHeight: '16px', fontWeight: semibold, color: 'var(--text-secondary)' }}>
              Because you watched {seedTitle}
            </p>
            {/* The title is the section's heading, as the logo is in the hero.
                With a logo the text rides along screen-reader-only and takes
                the logo's place under forced colours. */}
            <h2 id="byw-title" style={logoUrl ? { margin: '10px 0 0', lineHeight: 0 } : { margin: '8px 0 0', ...TITLE }}>
              {logoUrl ? (
                <>
                  {/* Sized like the hero logo: CSS width, height from the art, 2x props. */}
                  <Image
                    src={logoUrl}
                    alt=""
                    aria-hidden="true"
                    width={336}
                    height={112}
                    sizes="168px"
                    className="forced-colors:hidden"
                    style={{ width: 168, maxWidth: '100%', height: 'auto' }}
                  />
                  <span className="sr-only forced-colors:not-sr-only" style={{ display: 'block', ...TITLE }}>{item.title}</span>
                </>
              ) : (
                item.title
              )}
            </h2>
            {meta && (
              <p style={{ margin: '8px 0 0', fontSize: 'var(--text-sm)', lineHeight: '18px', color: 'var(--text-strong)' }}>
                {meta}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => openMedia(item, {
              priority: 'must_watch',
              // Adding or logging it changes which title comes next.
              onChanged: () => { closeMedia(); router.refresh() },
            })}
            aria-label={`Add ${item.title} to Must watch`}
            className="glass-btn inline-flex items-center rounded-full text-[var(--text-primary)]"
            style={{ height: 44, padding: '0 16px 0 13px', gap: 6, fontSize: 'var(--text-sm)', lineHeight: '18px', fontWeight: semibold, whiteSpace: 'nowrap' }}
          >
            <Bookmark size={16} strokeWidth={1.8} aria-hidden="true" style={{ color: 'var(--accent)' }} />
            Must watch
          </button>
        </div>
      </div>
    </section>
  )
}
