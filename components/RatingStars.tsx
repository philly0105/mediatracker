'use client'
import { useState } from 'react'

interface Props {
  value: number | null
  /** `null` means "clear this rating" — the API has always accepted it. */
  onChange?: (rating: number | null) => void
  readOnly?: boolean
}

export default function RatingStars({ value, onChange, readOnly = false }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const display = hover ?? value ?? 0
  const interactive = !readOnly && !!onChange

  // The glyph stays 24px either way; the interactive box is padded out to 32
  // so each half-star hit zone is 16x32 rather than 12x24. Read-only stars keep
  // the tighter box — there is nothing to hit.
  const boxClass = interactive ? 'relative w-8 h-8 flex items-center justify-center' : 'relative w-6 h-6'

  // Clicking the value you already have clears it. Without this there is no way
  // back to "unrated", which matters because half-star zones are easy to miss.
  function select(next: number) {
    onChange?.(value === next ? null : next)
  }

  function hitLabel(target: number) {
    const stars = `${target} star${target === 1 ? '' : 's'}`
    return value === target ? `Clear rating (currently ${stars})` : `Rate ${stars}`
  }

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
          <div key={star} className={boxClass}>
            <span className="relative w-6 h-6">
              <span className="text-2xl leading-none" style={{ color: 'var(--zinc-700)' }}>★</span>
              {(full || half) && (
                <span
                  className="absolute inset-0 text-2xl leading-none overflow-hidden"
                  style={{ width: full ? '100%' : '50%', color: 'var(--amber-400)' }}
                >★</span>
              )}
            </span>
            {interactive && (
              <>
                <button
                  type="button"
                  data-half={`${star - 0.5}`}
                  aria-label={hitLabel(star - 0.5)}
                  className="absolute left-0 top-0 w-1/2 h-full cursor-pointer"
                  onMouseEnter={() => setHover(star - 0.5)}
                  onClick={() => select(star - 0.5)}
                />
                <button
                  type="button"
                  data-half={`${star}.0`}
                  aria-label={hitLabel(star)}
                  className="absolute right-0 top-0 w-1/2 h-full cursor-pointer"
                  onMouseEnter={() => setHover(star)}
                  onClick={() => select(star)}
                />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
