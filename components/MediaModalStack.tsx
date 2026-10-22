'use client'
import { Presence, type PresenceChild } from './Presence'
import MediaInfoModal from './MediaInfoModal'
import type { StackEntry } from './MediaModalProvider'
import { readCreatedEntry } from '@/lib/useMediaActions'
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

  // Built as data rather than JSX children: <Presence> needs to hold on to a
  // closed modal's render function to play it out, and a detached React
  // element cannot be re-rendered with new props.
  const children: PresenceChild[] = entries.map((entry, index) => {
    const { item, options } = entry
    // Every entry but the last has another modal over it, and drops its blur
    // while it does. A departing entry renders from its old closure, where it
    // was still the last one, so it keeps its blur as it fades.
    const covered = index < entries.length - 1
    return {
      key: entry.key,
      render: (exiting) => (
        <MediaInfoModal
          item={item}
          exiting={exiting}
          covered={covered}
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
              const res = await markWatched(item.tmdb_id, item.type, opts)
              options.onChanged?.('watched', item)
              return readCreatedEntry(res)
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
      ),
    }
  })

  return <Presence onExitComplete={onExitComplete}>{children}</Presence>
}
