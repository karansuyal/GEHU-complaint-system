import AnimatedNumber from './AnimatedNumber'
import Icon from './Icon'
import Sparkline from './Sparkline'

const TONES = {
  default: { text: 'text-ink', icon: 'bg-stone-100 text-ink-soft', spark: 'text-ink-faint' },
  info: { text: 'text-slate-600', icon: 'bg-slate-50 text-slate-600', spark: 'text-slate-500' },
  brass: { text: 'text-brass-600', icon: 'bg-brass-50 text-brass-600', spark: 'text-brass-500' },
  warn: { text: 'text-rust-600', icon: 'bg-rust-50 text-rust-600', spark: 'text-rust-500' },
  good: { text: 'text-pine-600', icon: 'bg-pine-50 text-pine-600', spark: 'text-pine-500' }
}

// Dashboard metric. `icon` and `spark` (array of numbers) are optional, so the
// plain label/value usage still works everywhere.
export default function StatTile({ label, value, tone = 'default', onClick, active, icon, spark, hint, suffix }) {
  const t = TONES[tone] || TONES.default
  const alert = tone === 'warn' && Number(value) > 0
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        {icon ? (
          <span className={`stat-icon ${t.icon}`}>
            <Icon name={icon} className="h-[18px] w-[18px]" />
          </span>
        ) : (
          <span />
        )}
        {spark ? <Sparkline data={spark} className={t.spark} /> : null}
      </div>
      <p className={`font-display text-[1.9rem] leading-none tabular-nums mt-3 ${t.text}`}>
        <AnimatedNumber value={value} suffix={suffix} />
      </p>
      <p className="text-xs mt-1.5 text-ink-faint font-medium">{label}</p>
      {hint && <p className="text-[11px] mt-1 text-ink-faint/80">{hint}</p>}
    </>
  )
  const base = `panel p-4 text-left w-full ${alert ? '!border-rust-100 !bg-rust-50' : ''}`
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={!!active} className={`${base} panel-hover ${active ? '!border-pine-400 ring-2 ring-pine-400/25' : ''}`}>
      {body}
    </button>
  ) : (
    <div className={base}>{body}</div>
  )
}
