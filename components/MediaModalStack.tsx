'use client'
import { AnimatePresence } from 'framer-motion'
import MediaInfoModal from './MediaInfoModal'
import type { StackEntry } from './MediaModalProvider'
import type { useMediaActions } from '@/lib/useMediaActions'

export interface MediaModalStackProps {
  entries: readonly StackEntry[]
  onClose: () => void
  onNavigateAway: () => void
  onExitComplete: () => void
  actions: ReturnType<typeof useMediaActions>
}

export default function MediaModalStack({
  entries,
  onClose,
  onNavigateAway,
  onExitComplete,
  actions,
}: MediaModalStackProps) {
  const { addToWatchlist, markWatched, removeFromWatchlist } = actions

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {entries.map((entry) => {
        const { item, options } = entry
        return (
          <MediaInfoModal
            key={entry.key}
            item={item}
            onClose={onClose}
            onNavigateAway={onNavigateAway}
            newTabLinks={options.newTabLinks}
            currentPriority={options.currentPriority}
            onUpdatePriority={options.onUpdatePriority}
            onAddToWatchlist={
              options.onAddToWatchlist ??
              (async () => {
                await addToWatchlist(item.tmdb_id, item.type, options.priority)
                options.onChanged?.('watchlisted', item)
              })
            }
            onMarkAsWatched={
              options.onMarkAsWatched ??
              (async (opts) => {
                await markWatched(item.tmdb_id, item.type, opts)
                options.onChanged?.('watched', item)
              })
            }
            onRemoveFromWatchlist={
              options.onRemoveFromWatchlist ??
              (options.enableRemove
                ? async () => {
                    await removeFromWatchlist(item.tmdb_id, item.type)
                    options.onChanged?.('removed', item)
                  }
                : undefined)
            }
          />
        )
      })}
    </AnimatePresence>
  )
}
