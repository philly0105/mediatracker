'use client'
import React, { useState, useEffect, useCallback, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { Dices, Info, X } from 'lucide-react'
import type { WatchlistItem } from '@/types'
import { mediaToResult } from '@/lib/mediaToResult'
import { useMediaModal } from '@/components/MediaModalProvider'
import { useModal } from '@/lib/useModal'
import { pickTonight } from '@/lib/tonightPick'
import { PRIORITY_CONFIG } from '@/lib/priorityConfig'
import { FilterPills } from '@/components/FilterPills'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatMinutes } from '@/components/title/format'

const BUDGET_OPTIONS = [
  { id: 'any', label: 'Any time' },
  { id: '90', label: '< 90m' },
  { id: '120', label: '< 2h' },
  { id: '180', label: '< 3h' },
]

interface Props {
  typeFilter: 'all' | 'movie' | 'show'
  genreFilter: string
  onClose: () => void
}

export default function TonightPickModal({ typeFilter, genreFilter, onClose }: Props) {
  // `mounted` flips true only on the client so the portal to document.body
  // never runs during SSR. useSyncExternalStore keeps this read-only (no state
  // mutation in an effect) — the server snapshot is false, the client one true.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const [pool, setPool] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [budget, setBudget] = useState<string>('any')
  const [pick, setPick] = useState<WatchlistItem | null>(null)
  const { containerRef } = useModal(onClose)
  const { openMedia } = useMediaModal()

  // Fetch every priority in parallel so the picker can weigh across all three
  // buckets, respecting the filters the page had on screen when it was opened.
  // The budget is applied client-side against the merged pool (see pickTonight).
  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('group', 'priority')
        params.set('limit', '100')
        if (typeFilter !== 'all') params.set('type', typeFilter)
        if (genreFilter !== 'All') params.set('genre', genreFilter)
        const res = await fetch(`/api/watchlist?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to load watchlist')
        const data = await res.json()
        if (!active) return
        const groups = data.groups ?? {}
        const merged: WatchlistItem[] = [
          ...(Array.isArray(groups.must_watch?.items) ? groups.must_watch.items : []),
          ...(Array.isArray(groups.want_to_watch?.items) ? groups.want_to_watch.items : []),
          ...(Array.isArray(groups.someday?.items) ? groups.someday.items : []),
        ]
        setPool(merged)
        setPick(pickTonight(merged, { budget }))
      } catch {
        if (active) setPool([])
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, genreFilter])

  const reroll = useCallback(() => {
    setPick((prev) => pickTonight(pool, { budget, avoidId: prev?.id ?? null }))
  }, [pool, budget])

  // Everything in the pool is already on the watchlist, so the modal's
  // "Add to Watchlist" is deliberately a no-op rather than the provider default.
  function showPickDetails() {
    if (!pick?.media) return
    openMedia(mediaToResult(pick.media), { onAddToWatchlist: async () => {} })
  }

  function handleBudgetSelect(id: string) {
    setBudget(id)
    setPick((prev) => pickTonight(pool, { budget: id, avoidId: prev?.id ?? null }))
  }

  if (!mounted) return null

  const PriorityIcon = pick ? PRIORITY_CONFIG[pick.priority].icon : null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--scrim)' }}>
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* No exit animation: the watchlist page unmounts this outright, so the
          `exit` variant it used to carry never played. */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tonight-pick-title"
        // The modal sheet; a short card, so centred on phones too. The modal
        // fill goes in through the token .glass-panel paints with, so the
        // reduced-transparency fallback still wins over it.
        className="dialog-in glass-panel glass-rim [--glass-panel:var(--glass-modal)] relative w-full max-w-md p-6 shadow-[var(--shadow-xl)]"
      >
        <Button variant="icon" aria-label="Close" onClick={onClose} className="absolute right-3 top-3 z-10">
          <X className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
        </Button>

        <div className="space-y-4">
          <SectionHeader id="tonight-pick-title" title="Tonight's Pick" style={{ paddingLeft: 0, paddingRight: 44, minHeight: 44 }} />

          <FilterPills options={BUDGET_OPTIONS} active={budget} onSelect={handleBudgetSelect} />
          {loading ? (
            <div className="flex gap-4">
              <Skeleton className="h-42 w-28 shrink-0 rounded-[var(--radius-md)]" />
              <div className="flex-1 min-w-0 space-y-3 pt-1">
                <Skeleton className="h-6 w-24 rounded-[var(--radius-pill)]" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
            </div>
          ) : pick ? (
            // Keyed on the pick, so a reroll remounts this and replays the
            // enter animation. The old card is not crossfaded out any more —
            // at 200ms under a swap that was a frame or two of overlap.
            <div key={pick.id} className="motion-item-in flex gap-4">
                {pick.media?.poster_url ? (
                  <Image
                    src={pick.media.poster_url}
                    alt={pick.media.title ?? ''}
                    width={112}
                    height={168}
                    className="shrink-0 rounded-[var(--radius-md)] object-cover shadow-[var(--shadow-poster)]"
                    style={{ background: 'var(--zinc-900)' }}
                  />
                ) : (
                  <div
                    className="flex h-42 w-28 shrink-0 items-center justify-center rounded-[var(--radius-md)] p-3 text-center"
                    style={{
                      background: 'linear-gradient(150deg, var(--zinc-800), var(--bg-void))',
                      color: 'var(--text-secondary)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'],
                    }}
                  >
                    {pick.media?.title}
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-2">
                  {/* Must Watch carries the accent; the other two are the
                      neutral chip. The retired rust and amber tints are gone. */}
                  <Badge tone={pick.priority === 'must_watch' ? 'accent' : 'neutral'}>
                    {PriorityIcon && <PriorityIcon className="h-3.5 w-3.5" />}
                    {pick.priority === 'must_watch' ? 'Must Watch' : pick.priority === 'want_to_watch' ? 'Want to Watch' : 'Someday'}
                  </Badge>

                  <h3
                    style={{
                      margin: 0,
                      fontSize: 'var(--text-xl)',
                      lineHeight: '26px',
                      fontWeight: 'var(--weight-heading)' as React.CSSProperties['fontWeight'],
                      letterSpacing: 'var(--tracking-snug)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {pick.media?.title}
                  </h3>

                  <p style={{ margin: 0, fontSize: 'var(--text-sm)', lineHeight: '18px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {[
                      pick.media?.release_year ? String(pick.media.release_year) : null,
                      pick.media?.type === 'show' ? 'TV Show' : 'Movie',
                      pick.media?.runtime_mins ? formatMinutes(pick.media.runtime_mins) : null,
                    ].filter(Boolean).join(' · ')}
                  </p>

                  {pick.media?.genres && pick.media.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {pick.media.genres.slice(0, 4).map((g) => (
                        <Badge key={g}>{g}</Badge>
                      ))}
                    </div>
                  )}

                  {pick.media?.overview && (
                    <p className="line-clamp-3" style={{ margin: 0, fontSize: 'var(--text-base)', lineHeight: '20px', color: 'var(--text-secondary)' }}>
                      {pick.media.overview}
                    </p>
                  )}
                </div>
            </div>
          ) : (
            <EmptyState
              size="compact"
              title="Nothing on your watchlist matches."
              hint={budget !== 'any' ? 'Try a longer time budget.' : undefined}
            />
          )}
          {pick && (
            // Details is the next step, so it is the one solid button.
            <div className="flex gap-3 pt-5">
              <Button variant="ghost" onClick={reroll} style={{ flex: 1 }}>
                <Dices className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                <span>Reroll</span>
              </Button>
              <Button onClick={() => showPickDetails()} style={{ flex: 1 }}>
                <Info className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                <span>Details</span>
              </Button>
            </div>
          )}
        </div>

      </div>
    </div>,
    document.body
  )
}
