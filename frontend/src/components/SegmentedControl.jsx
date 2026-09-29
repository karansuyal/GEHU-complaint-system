// Tap-friendly replacement for a 3-option <select> (status picker).
export default function SegmentedControl({ options, value, onChange, disabled, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid bg-stone-100 rounded-md p-1 gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(([v, text]) => {
        const active = value === v
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => !active && onChange(v)}
            className={`min-h-[40px] px-2 rounded text-[13px] sm:text-sm font-medium transition-colors leading-tight disabled:opacity-60 ${
              active ? 'bg-surface text-ink shadow-card' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {text}
          </button>
        )
      })}
    </div>
  )
}
