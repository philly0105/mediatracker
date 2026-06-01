'use client'
import Link from 'next/link'
import RatingStars from './RatingStars'
import type { WatchEntry } from '@/types'

interface Props {
  entry: WatchEntry
}

export default function MediaCard({ entry }: Props) {
  const media = entry.media!
  const href = media.type === 'show' ? `/show/${media.id}` : '#'

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden flex gap-3 p-3">
      {media.poster_url ? (
        <img src={media.poster_url} alt={media.title} className="w-16 rounded object-cover" />
      ) : (
        <div className="w-16 h-24 bg-gray-700 rounded" />
      )}
      <div className="flex-1 min-w-0">
        {media.type === 'show' ? (
          <Link href={href} className="font-medium text-white hover:text-blue-400 line-clamp-1">{media.title}</Link>
        ) : (
          <p className="font-medium text-white line-clamp-1">{media.title}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">{media.release_year}</p>
        {entry.rating && (
          <div className="mt-1">
            <RatingStars value={entry.rating} onChange={() => {}} readOnly />
          </div>
        )}
        {entry.review && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{entry.review}</p>}
        <p className="text-xs text-gray-600 mt-1">{entry.watched_at}</p>
      </div>
    </div>
  )
}
