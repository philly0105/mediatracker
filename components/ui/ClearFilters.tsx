import { X } from 'lucide-react'

/**
 * The reset the filter banks never had. Both banks already computed whether
 * anything was narrowed — the library used it only to change a count string —
 * so a user filtered down to nothing had to undo every control by hand.
 *
 * Render it conditionally on that same flag: a permanently visible "clear"
 * that does nothing most of the time is worse than no control at all.
 */
export function ClearFilters({ onClear }: { onClear: () => void }) {
  return (
    <button type="button" onClick={onClear} className="clear-filters">
      <X className="w-3.5 h-3.5" />
      <span>Clear filters</span>
    </button>
  )
}
