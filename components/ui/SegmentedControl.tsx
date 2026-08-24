'use client'

export interface SegmentedControlOption<T extends string> {
  id: T
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  label?: string
  size?: 'sm' | 'md'
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-xs'
    : 'px-4 py-2 text-sm'

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex items-center p-1 rounded-sm border border-[var(--border-subtle)] bg-[var(--surface-input)] relative select-none ${className}`}
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
            onClick={() => onChange(option.id)}
            className={`relative flex items-center justify-center gap-1.5 rounded-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${sizeClasses} ${
              isSelected
                ? 'bg-[var(--accent)] text-[var(--btn-primary-fg)] font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {Icon && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
