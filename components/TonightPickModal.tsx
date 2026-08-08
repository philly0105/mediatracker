'use client'
import { useState, useEffect, useCallback, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Dices, Info, X } from 'lucide-react'
import type { WatchlistItem } from '@/types'
import { mediaToResult } from '@/lib/mediaToResult'
import { useMediaActions } from '@/lib/useMediaActions'
import { useModal } from '@/lib/useModal'
import { pickTonight } from '@/lib/tonightPick'
import { PRIORITY_CONFIG } from '@/lib/priorityConfig'
import MediaInfoModal from '@/components/MediaInfoModal'
import { FilterPills } from '@/components/FilterPills'
import { Button } from '@/components/ui/Button'

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
  const [showDetails, setShowDetails] = useState(false)
  const { containerRef } = useModal(onClose)
  const { markWatched } = useMediaActions()

  // Fetch every priority in parallel so the picker can weigh across all three
  // buckets, respecting the filters the page had on screen when it was opened.
  // The budget is applied client-side against the merged pool (see pickTonight).
  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const results = await Promise.all(
          (['must_watch', 'want_to_watch', 'someday'] as const).map((priority) => {
            const params = new URLSearchParams()
            params.set('priority', priority)
            params.set('page', '1')
            params.set('limit', '100')
            if (typeFilter !== 'all') params.set('type', typeFilter)
            if (genreFilter !== 'All') params.set('genre', genreFilter)
            return fetch(`/api/watchlist?${params.toString()}`).then((r) => r.json())
          })
        )
        if (!active) return
        const merged: WatchlistItem[] = results.flatMap((d) => (Array.isArray(d.items) ? d.items : []))
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

  function handleBudgetSelect(id: string) {
    setBudget(id)
    setPick((prev) => pickTonight(pool, { budget: id, avoidId: prev?.id ?? null }))
  }

  function formatRuntime(mins: number | null) {
    if (!mins) return null
    const hrs = Math.floor(mins / 60)
    const remainingMins = mins % 60
    if (hrs === 0) return `${remainingMins}m`
    return `${hrs}h ${remainingMins}m`
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md" style={{ background: 'var(--scrim)' }}>
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tonight-pick-title"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        style={{ background: 'var(--surface-modal)' }}
        className="relative w-full max-w-md rounded-[var(--radius-2xl)] border border-white/15 p-6 shadow-2xl"
      >
        {/* Close Button — same treatment as MediaInfoModal's */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-10 p-2 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-300"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-4">
          <h2 id="tonight-pick-title" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Tonight&apos;s Pick
          </h2>

          <FilterPills options={BUDGET_OPTIONS} active={budget} onSelect={handleBudgetSelect} />
          {loading ? (
            <div className="flex gap-4 animate-pulse">
              <div className="w-28 h-42 rounded-[var(--radius-xl)] bg-[var(--bg-void)] shrink-0" />
              <div className="flex-1 min-w-0 space-y-2 pt-1">
                <div className="h-4 bg-[var(--bg-void)] rounded w-2/3" />
                <div className="h-3 bg-[var(--bg-void)] rounded w-1/4" />
                <div className="h-3 bg-[var(--bg-void)] rounded w-1/2" />
              </div>
            </div>
          ) : pick ? (
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={pick.id}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="flex gap-4"
              >
                {pick.media?.poster_url ? (
                  <Image
                    src={pick.media.poster_url}
                    alt={pick.media.title ?? ''}
                    width={112}
                    height={168}
                    className="rounded-[var(--radius-xl)] border border-white/5 shadow-lg object-cover shrink-0 bg-[var(--bg-void)]"
                  />
                ) : (
                  <div className="w-28 h-42 rounded-[var(--radius-xl)] bg-[var(--bg-void)] border border-white/5 flex items-center justify-center text-[10px] text-zinc-700 shrink-0">
                    No Poster
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-2">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${PRIORITY_CONFIG[pick.priority].color}`}>
                    {(() => {
                      const Icon = PRIORITY_CONFIG[pick.priority].icon
                      return <Icon className="w-3 h-3" />
                    })()}
                    {pick.priority === 'must_watch' ? 'Must Watch' : pick.priority === 'want_to_watch' ? 'Want to Watch' : 'Someday'}
                  </span>

                  <h3 className="text-xl font-black text-white leading-tight">
                    {pick.media?.title}
                  </h3>

                  <p className="text-xs text-zinc-400">
                    {[
                      pick.media?.release_year ? String(pick.media.release_year) : null,
                      pick.media?.type === 'show' ? 'TV Show' : 'Movie',
                      formatRuntime(pick.media?.runtime_mins ?? null),
                    ].filter(Boolean).join(' · ')}
                  </p>

                  {pick.media?.genres && pick.media.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {pick.media.genres.slice(0, 4).map((g) => (
                        <span
                          key={g}
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-zinc-400 bg-white/[0.02] border border-white/5"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}

                  {pick.media?.overview && (
                    <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">
                      {pick.media.overview}
                    </p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="py-10 text-center text-sm text-zinc-400">
              Nothing on your watchlist matches.
              {budget !== 'any' && (
                <div className="mt-1 text-xs text-zinc-600">Try a longer time budget.</div>
              )}
            </div>
          )}
          {pick && (
            <div className="flex gap-3 pt-5">
              <Button onClick={reroll} style={{ flex: 1 }}>
                <Dices className="w-4 h-4" />
                <span>Reroll</span>
              </Button>
              <Button onClick={() => setShowDetails(true)} style={{ flex: 1 }}>
                <Info className="w-4 h-4" />
                <span>Details</span>
              </Button>
            </div>
          )}
        </div>

        {showDetails && pick?.media && (
          <MediaInfoModal
            item={mediaToResult(pick.media)}
            onClose={() => setShowDetails(false)}
            onAddToWatchlist={async () => {}}
            onMarkAsWatched={async (opts) => { await markWatched(pick.media!.tmdb_id, pick.media!.type, opts) }}
          />
        )}
      </motion.div>
    </div>,
    document.body
  )
}