// Horizontally scrollable filter row (single-select). Used on every list screen.
export default function FilterChips({ options, value, onChange, counts, label = 'Filter' }) {
  return (
    <div role="group" aria-label={label} className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
      {options.map(([key, text]) => {
        const active = value === key
        return (
          <button
            key={key || 'all'}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(key)}
            className={`shrink-0 min-h-[40px] px-3.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
              active
                ? 'bg-pine-500 text-white border-pine-500 font-medium'
                : 'bg-surface text-ink-soft border-stone-300 hover:border-ink/30'
            }`}
          >
            {text}
            {counts && counts[key] != null && <span className={`ml-1.5 ${active ? 'opacity-80' : 'text-ink-faint'}`}>{counts[key]}</span>}
          </button>
        )
      })}
    </div>
  )
}
