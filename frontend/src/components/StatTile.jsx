const TONES = {
  default: 'text-ink',
  warn: 'text-rust-600',
  good: 'text-pine-600'
}

export default function StatTile({ label, value, tone = 'default', onClick, active }) {
  const body = (
    <>
      <p className={`font-display text-[1.75rem] leading-none tabular-nums ${TONES[tone]}`}>{value}</p>
      <p className="text-xs mt-2 text-ink-faint">{label}</p>
    </>
  )
  const base = `panel p-4 text-left w-full ${tone === 'warn' && Number(value) > 0 ? '!border-rust-100 !bg-rust-50' : ''}`
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={!!active} className={`${base} panel-hover ${active ? '!border-pine-400 ring-2 ring-pine-400/20' : ''}`}>
      {body}
    </button>
  ) : (
    <div className={base}>{body}</div>
  )
}
