'use client'
import Link from 'next/link'
import RatingStars from './RatingStars'
import type { WatchEntry } from '@/types'

interface Props {
  entry: WatchEntry
}

const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
}

export default function MediaCard({ entry }: Props) {
  const media = entry.media!
  const href = media.type === 'show' ? `/show/${media.id}` : '#'

  return (
    <div className="rounded-2xl overflow-hidden flex gap-3 p-3 backdrop-blur-md" style={glassCard}>
      {media.poster_url ? (
        <img src={media.poster_url} alt={media.title} className="w-16 rounded-xl object-cover" />
      ) : (
        <div className="w-16 h-24 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
      )}
      <div className="flex-1 min-w-0">
        {media.type === 'show' ? (
          <Link href={href} className="font-medium text-white hover:text-zinc-300 line-clamp-1 transition-colors">{media.title}</Link>
        ) : (
          <p className="font-medium text-white line-clamp-1">{media.title}</p>
        )}
        <p className="text-xs text-zinc-500 mt-0.5">{media.release_year}</p>
        {entry.rating && (
          <div className="mt-1">
            <RatingStars value={entry.rating} onChange={() => {}} readOnly />
          </div>
        )}
        {entry.review && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{entry.review}</p>}
        <p className="text-xs text-zinc-700 mt-1">{entry.watched_at}</p>
      </div>
    </div>
  )
}
