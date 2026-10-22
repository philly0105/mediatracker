'use client'

export interface SegmentedControlOption<T extends string> {
  id: T
  label: string
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>
  /** A muted tally after the label, e.g. the items in a bucket. */
  count?: number
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  label?: string
  size?: 'sm' | 'md'
  className?: string
}

// The track is the inset well (`.glass-inset`, radius 14) and the segments sit
// 4px inside it, 36px tall, so the whole control still clears the 44px target.
// The selected segment is the glass-button fill with its top highlight; the
// rest are text only until hovered. Keyboard focus is the global outline.
// Forced colours drop the shadow and repaint the fill, which would leave the
// selected segment looking like the others, so there it takes the system
// Highlight pair, as the nav's current item does.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  const sizeClasses = size === 'sm'
    ? 'px-3 text-xs'
    : 'px-4 text-sm'

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`glass-inset inline-flex items-center gap-0.5 p-1 relative select-none ${className}`}
    >
      {options.map((option) => {
        const isSelected = value === option.id
        const Icon = option.icon

        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            // The visible tally is decoration; the name carries it instead.
            aria-label={option.count != null ? `${option.label} · ${option.count}` : undefined}
            onClick={() => onChange(option.id)}
            className={`relative flex items-center justify-center gap-1.5 h-9 rounded-[var(--radius-thumb)] transition-colors duration-200 ${sizeClasses} ${
              isSelected
                ? 'font-semibold text-[var(--text-primary)] bg-[var(--btn-ghost-bg)] shadow-[var(--glass-btn-edge)] forced-colors:bg-[color:Highlight] forced-colors:text-[color:HighlightText]'
                : 'font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-fill-hover)]'
            }`}
          >
            {Icon && <Icon className="w-4 h-4" strokeWidth={1.8} />}
            <span>{option.label}</span>
            {option.count != null && (
              <span aria-hidden="true" className="tabular font-medium text-[var(--text-muted)]">
                {option.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
