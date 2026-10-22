type FilterPillOption<T extends string> = { id: T; label: string }

// Shared sort-pill row, extracted from LibraryView and the streaming page where
// the markup was copy-pasted verbatim. Each call site keeps its own onSelect
// handler so bespoke behaviour (e.g. streaming's results/page reset) is preserved.
//
// The pills are the toolbar chip recipe: a glass chip at rest, and the active
// one on the glass-button fill with an accent dot, the way the reference marks
// its pressed "Must watch" pill. 44px tall so each is a full touch target.
export function FilterPills<T extends string>({
  options,
  active,
  onSelect,
}: {
  options: FilterPillOption<T>[]
  active: T
  onSelect: (id: T) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((option) => {
        const isActive = active === option.id
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            aria-pressed={isActive}
            className={`inline-flex items-center gap-2 min-h-11 px-4 rounded-[var(--radius-pill)] text-[length:var(--text-sm)] font-semibold whitespace-nowrap transition-colors duration-200 ${
              isActive
                ? 'glass-btn text-[var(--text-primary)] forced-colors:bg-[color:Highlight] forced-colors:text-[color:HighlightText]'
                : 'bg-[var(--glass-chip)] shadow-[var(--glass-chip-edge)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-fill-selected)]'
            }`}
          >
            {isActive && (
              <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            )}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
