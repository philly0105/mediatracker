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
  const interactive = !readOnly && !!onChange

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHover(null)}
      role={interactive ? 'group' : 'img'}
      aria-label={value ? `Rated ${value} out of 5` : 'Not rated'}
    >
      {[1, 2, 3, 4, 5].map(star => {
        const full = display >= star
        const half = !full && display >= star - 0.5
        return (
          <div key={star} className="relative w-6 h-6">
            <span className="text-2xl leading-none" style={{ color: 'var(--zinc-700)' }}>★</span>
            {(full || half) && (
              <span
                className="absolute inset-0 text-2xl leading-none overflow-hidden"
                style={{ width: full ? '100%' : '50%', color: 'var(--amber-400)' }}
              >★</span>
            )}
            {interactive && (
              <>
                <button
                  type="button"
                  data-half={`${star - 0.5}`}
                  aria-label={`Rate ${star - 0.5} stars`}
                  className="absolute left-0 top-0 w-1/2 h-full cursor-pointer"
                  onMouseEnter={() => setHover(star - 0.5)}
                  onClick={() => onChange?.(star - 0.5)}
                />
                <button
                  type="button"
                  data-half={`${star}.0`}
                  aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
                  className="absolute right-0 top-0 w-1/2 h-full cursor-pointer"
                  onMouseEnter={() => setHover(star)}
                  onClick={() => onChange?.(star)}
                />
              </>
            )}
          </div>
        )
      })}
      {value && <span className="ml-2 text-sm text-gray-400">{value}/5</span>}
    </div>
  )
}
