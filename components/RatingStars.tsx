'use client'
import { useState, useRef, useEffect } from 'react'
import { Star, X } from 'lucide-react'

interface Props {
  value: number | null
  /** `null` means "clear this rating" — the API has always accepted it. */
  onChange?: (rating: number | null) => void
  readOnly?: boolean
}

function valueText(v: number): string {
  return v === 0 ? 'Not rated' : `${v} star${v === 1 ? '' : 's'}`
}

export default function RatingStars({ value, onChange, readOnly = false }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const display = hover ?? value ?? 0
  const interactive = !readOnly && !!onChange

  // The glyph stays 24px either way; the interactive box is padded out to 32 so
  // the slider laid over the row is 32 tall rather than 24. Read-only stars keep
  // the tighter box — there is nothing to hit.
  const boxClass = interactive ? 'relative w-8 h-8 flex items-center justify-center' : 'relative w-6 h-6'

  // pointerup and blur both fire for a single drag, and the parent may not have
  // pushed the new `value` back down in between — so the last committed number
  // is tracked here rather than inferred from the prop.
  const committedRef = useRef<number | null>(value)
  useEffect(() => {
    committedRef.current = value
  }, [value])

  function commit(candidate: number) {
    if (Number.isNaN(candidate)) return
    const next = candidate === 0 ? null : candidate
    if (next === value || next === committedRef.current) return
    committedRef.current = next
    onChange?.(next)
  }

  const painted = [1, 2, 3, 4, 5].map(star => {
    const full = display >= star
    const half = !full && display >= star - 0.5
    return (
      <div key={star} className={boxClass}>
        {/* Lucide, not the ★ character: the glyph renders differently on
            every platform and cannot be half-filled cleanly. The empty star
            was --zinc-700 on the card surface — 1.52:1, effectively
            invisible, so an unrated row gave no hint it was rateable. */}
        <span className="relative w-6 h-6 block">
          <Star className="w-6 h-6" style={{ color: 'var(--zinc-500)' }} />
          {(full || half) && (
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: full ? '100%' : '50%' }}
            >
              <Star
                className="w-6 h-6"
                style={{ color: 'var(--amber-400)', fill: 'var(--amber-400)' }}
              />
            </span>
          )}
        </span>
      </div>
    )
  })

  if (!interactive) {
    return (
      <div
        className="flex items-center gap-0.5"
        role="img"
        aria-label={value ? `Rated ${value} out of 5` : 'Not rated'}
      >
        {painted}
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="relative inline-flex items-center rounded-xs focus-within:ring-1 focus-within:ring-[var(--amber-400)]">
        {/* One slider instead of ten buttons: half-steps, arrow keys, Home/End
            and a single tab stop all come free, and the stars underneath are
            decorative once the input owns the value. */}
        <div className="flex items-center gap-0.5 pointer-events-none" aria-hidden="true">
          {painted}
        </div>
        <input
          type="range"
          min={0}
          max={5}
          step={0.5}
          value={display}
          aria-label="Rating"
          aria-valuetext={valueText(display)}
          // Dragging fires onChange on every step and each parent spends a PATCH
          // per call, so a drag across the row would cost ten requests. Preview
          // locally on change; commit only once the interaction ends.
          onChange={(e) => setHover(parseFloat(e.target.value))}
          onPointerUp={(e) => commit(parseFloat(e.currentTarget.value))}
          onKeyUp={(e) => commit(parseFloat(e.currentTarget.value))}
          onBlur={(e) => {
            commit(parseFloat(e.currentTarget.value))
            setHover(null)
          }}
          className="absolute inset-0 w-full h-full m-0 p-0 opacity-0 cursor-pointer outline-none"
        />
      </div>

      {/* A slider cannot express "click the value you already have to clear it",
          which is how clearing used to work. Home still sets 0, but that is
          invisible — so a clear appears once there is something to clear, and
          never on the unrated cards filling a grid. */}
      {value != null && (
        <button
          type="button"
          aria-label="Clear rating"
          onClick={() => {
            setHover(null)
            committedRef.current = null
            onChange?.(null)
          }}
          className="p-1 text-zinc-500 hover:text-zinc-300 rounded-sm cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--amber-400)]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
