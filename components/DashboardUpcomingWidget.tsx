'use client'
import Image from 'next/image'
import { useState, useSyncExternalStore, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { Bookmark, Film, Tv } from 'lucide-react'
import type { TmdbSearchResult } from '@/types'
import { useMediaModal } from '@/components/MediaModalProvider'
import { useMediaActions } from '@/lib/useMediaActions'
import { useToast } from '@/components/ToastProvider'
import { mediaKey } from '@/lib/mediaKey'
import type { UpcomingRelease } from '@/lib/tmdb'
import { DateStack } from '@/components/ui/DateStack'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { formatCountdown } from '@/components/home/format'
import { parseTimeKey, timeKey } from '@/components/home/greeting'

interface Props {
  releases: UpcomingRelease[]
  /** `type:tmdbId` keys of everything on the watchlist, for the bookmark state. */
  watchlistKeys?: string[]
  /**
   * The server's clock as a greeting timeKey, for the countdowns' first
   * render. Pass it from the server component that renders this; without it
   * the hydration snapshot is the client's clock.
   */
  today?: string
}

// Enough rows to stand as tall as the "Up next" panel beside this one.
const MAX_ROWS = 7
const semibold = 'var(--weight-semibold)' as CSSProperties['fontWeight']

// No subscription, just the server/client snapshot split (as HomeGreeting):
// the countdowns depend on the day, and the server, on UTC, can be a day
// ahead of or behind the reader around midnight. The server's key is the
// hydration snapshot and the client's clock takes over in the first commit,
// so the text is right for the reader without a hydration mismatch.
const noSubscribe = () => () => {}
const clientKey = () => timeKey(new Date())

/**
 * The reference's "Coming soon" list: date stack, poster, title and countdown,
 * with a bookmark that adds the title to (or removes it from) the watchlist
 * in place. The row itself still opens the media modal as it always has.
 */
export default function DashboardUpcomingWidget({ releases, watchlistKeys = [], today: serverToday }: Props) {
  const router = useRouter()
  const { openMedia, closeMedia } = useMediaModal()
  const { toast } = useToast()
  // Same bucket the calendar adds to.
  const { addToWatchlist, removeFromWatchlist } = useMediaActions({ priority: 'must_watch' })

  const [saved, setSaved] = useState(() => new Set(watchlistKeys))
  const [busy, setBusy] = useState<string | null>(null)

  const upcoming = releases.slice(0, MAX_ROWS)
  const savedCount = upcoming.filter((item) => saved.has(mediaKey(item.type, item.tmdb_id))).length
  const today = parseTimeKey(useSyncExternalStore(noSubscribe, clientKey, () => serverToday ?? clientKey())).date

  async function toggleBookmark(item: UpcomingRelease) {
    const key = mediaKey(item.type, item.tmdb_id)
    const wasSaved = saved.has(key)
    // Optimistic: the bookmark fills at once and reverts if the write fails.
    setSaved((prev) => {
      const next = new Set(prev)
      if (wasSaved) next.delete(key)
      else next.add(key)
      return next
    })
    setBusy(key)
    try {
      if (wasSaved) await removeFromWatchlist(item.tmdb_id, item.type)
      else await addToWatchlist(item.tmdb_id, item.type)
      router.refresh()
    } catch (err) {
      setSaved((prev) => {
        const next = new Set(prev)
        if (wasSaved) next.add(key)
        else next.delete(key)
        return next
      })
      toast(err instanceof Error ? err.message : 'Could not update your watchlist.', { tone: 'error' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <SectionHeader
        id="coming-soon-title"
        title="Coming soon"
        sub={
          // Wraps as whole phrases when the panel is narrow (one line at 390
          // is a near thing), never mid-phrase, and the dot stays with the
          // second phrase so no line ends on it.
          <span className="flex flex-wrap items-center gap-x-1">
            <span>In theaters</span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <span aria-hidden="true">·</span>
              <Bookmark size={12} strokeWidth={1.8} fill="currentColor" aria-hidden="true" style={{ color: 'var(--accent)' }} />
              <span>{savedCount} on your watchlist</span>
            </span>
          </span>
        }
        action={{ label: 'Calendar', href: '/calendar' }}
      />

      {upcoming.length === 0 ? (
        <p style={{ margin: 0, padding: '8px 4px', fontSize: 'var(--text-base)', lineHeight: '20px', color: 'var(--text-muted)' }}>
          No upcoming releases found.
        </p>
      ) : (
        <ul className="flex flex-col" style={{ gap: 14, margin: 0, padding: 0, listStyle: 'none' }}>
          {upcoming.map((item, index) => {
            const key = mediaKey(item.type, item.tmdb_id)
            const isSaved = saved.has(key)
            // A second title on the same day shares the first one's date
            // stack: a blank column and a tighter gap, as in the reference.
            const sameDay = index > 0 && upcoming[index - 1].full_release_date === item.full_release_date
            const resultItem: TmdbSearchResult = {
              tmdb_id: item.tmdb_id,
              type: item.type,
              title: item.title,
              overview: item.overview || '',
              poster_url: item.poster_url,
              release_year: item.release_year,
              genres: item.genres,
              vote_average: item.vote_average,
            }

            return (
              <li key={key} className="flex items-center" style={{ gap: 12, marginTop: sameDay ? -9 : 0 }}>
                {sameDay ? <span aria-hidden="true" style={{ flex: 'none', width: 40 }} /> : <DateStack date={item.full_release_date} />}
                <button
                  type="button"
                  onClick={() => openMedia(resultItem, {
                    // Matches the old onDone, which fired for both actions.
                    onChanged: () => { closeMedia(); router.refresh() },
                  })}
                  className="flex min-w-0 flex-1 items-center rounded-[var(--radius-sm)] text-left"
                  style={{ gap: 12, padding: 0, background: 'transparent', color: 'inherit' }}
                >
                  {item.poster_url ? (
                    <Image
                      src={item.poster_url}
                      alt=""
                      width={34}
                      height={51}
                      style={{ flex: 'none', width: 34, height: 51, objectFit: 'cover', borderRadius: 'var(--radius-xs)', boxShadow: 'var(--shadow-sm)' }}
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex items-center justify-center"
                      style={{ flex: 'none', width: 34, height: 51, borderRadius: 'var(--radius-xs)', background: 'var(--glass-card)', color: 'var(--text-faint)' }}
                    >
                      {item.type === 'show' ? <Tv size={14} strokeWidth={1.8} /> : <Film size={14} strokeWidth={1.8} />}
                    </span>
                  )}
                  <span style={{ minWidth: 0 }}>
                    <span
                      className="block truncate"
                      style={{ fontSize: 'var(--text-base)', lineHeight: '18px', fontWeight: semibold, color: 'var(--text-primary)' }}
                    >
                      {item.title}
                    </span>
                    <span
                      className="tabular block"
                      style={{ marginTop: 2, fontSize: 'var(--text-xs)', lineHeight: '16px', color: 'var(--text-muted)' }}
                    >
                      {[formatCountdown(item.full_release_date, today), item.episode_label].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleBookmark(item)}
                  disabled={busy === key}
                  aria-pressed={isSaved}
                  aria-label={isSaved ? `On your watchlist: ${item.title}` : `Add ${item.title} to watchlist`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--glass-fill-hover)] disabled:cursor-wait"
                  style={{ background: 'transparent', color: isSaved ? 'var(--accent)' : 'var(--text-secondary)' }}
                >
                  <Bookmark size={18} strokeWidth={1.8} aria-hidden="true" fill={isSaved ? 'currentColor' : 'none'} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
