'use client'
import { useState } from 'react'

interface Props {
  value: number | null
  onChange?: (rating: number) => void
  readOnly?: boolean
}

export default function RatingStars({ value, onChange, readOnly = false }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const display = hover ?? value ?? 0

  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map(star => {
        const full = display >= star
        const half = !full && display >= star - 0.5
        return (
          <div key={star} className="relative w-6 h-6">
            <span className="text-gray-600 text-2xl leading-none">★</span>
            {(full || half) && (
              <span
                className="absolute inset-0 text-yellow-400 text-2xl leading-none overflow-hidden"
                style={{ width: full ? '100%' : '50%' }}
              >★</span>
            )}
            <div
              data-half={`${star - 0.5}`}
              className="absolute left-0 top-0 w-1/2 h-full cursor-pointer"
              onMouseEnter={() => !readOnly && setHover(star - 0.5)}
              onClick={() => !readOnly && onChange?.(star - 0.5)}
            />
            <div
              data-half={`${star}.0`}
              className="absolute right-0 top-0 w-1/2 h-full cursor-pointer"
              onMouseEnter={() => !readOnly && setHover(star)}
              onClick={() => !readOnly && onChange?.(star)}
            />
          </div>
        )
      })}
      {value && <span className="ml-2 text-sm text-gray-400">{value}/5</span>}
    </div>
  )
}
