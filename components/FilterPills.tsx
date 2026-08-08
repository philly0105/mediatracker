type FilterPillOption<T extends string> = { id: T; label: string }

// Shared sort-pill row, extracted from LibraryView and the streaming page where
// the markup was copy-pasted verbatim. Each call site keeps its own onSelect
// handler so bespoke behaviour (e.g. streaming's results/page reset) is preserved.
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
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onSelect(option.id)}
          aria-pressed={active === option.id}
          className={`relative px-3 py-2 rounded-sm font-semibold text-xs transition-all duration-300 whitespace-nowrap active:scale-95 ${
            active === option.id
              ? 'text-white bg-[var(--accent)] border border-transparent shadow-lg shadow-green-600/20'
              : 'text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
