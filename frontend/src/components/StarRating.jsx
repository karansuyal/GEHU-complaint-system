// Read-only display or tappable input (44px touch targets on phones).
export default function StarRating({ value = 0, onChange, size = 'md' }) {
  const dim = size === 'sm' ? 'h-4 w-4' : 'h-8 w-8'
  return (
    <div className="inline-flex items-center" role={onChange ? 'radiogroup' : 'img'} aria-label={onChange ? 'Rating' : `${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= value
        const star = (
          <svg viewBox="0 0 24 24" className={`${dim} ${on ? 'text-brass-500' : 'text-stone-400'}`} fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8-4.3-4.1 5.9-.9L12 3.5Z" strokeLinejoin="round" />
          </svg>
        )
        return onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => onChange(n)}
            className="h-11 w-10 flex items-center justify-center rounded-md hover:bg-brass-50"
          >
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        )
      })}
    </div>
  )
}
