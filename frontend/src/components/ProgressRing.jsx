// Circular progress (0-100). Used for "resolution rate" on dashboards.
export default function ProgressRing({ value = 0, size = 88, stroke = 9, label, className = '', track = 'rgba(255,255,255,.18)', color = '#fff', textClass = 'text-white' }) {
  const pct = Math.max(0, Math.min(100, value))
  const r = (size - stroke) / 2
  const len = 2 * Math.PI * r
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }} role="img" aria-label={`${label || 'Progress'} ${Math.round(pct)} percent`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          className="ring-fg"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={len - (len * pct) / 100}
        />
      </svg>
      <div className={`absolute inset-0 flex flex-col items-center justify-center leading-none ${textClass}`}>
        <span className="font-display text-xl font-semibold tabular-nums">{Math.round(pct)}%</span>
        {label && <span className="text-[10px] opacity-70 mt-1">{label}</span>}
      </div>
    </div>
  )
}
