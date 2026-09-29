import Icon from './Icon'
import { parseServerDate } from '../utils/date'

// SLA countdown: tells staff how long until a complaint auto-escalates.
export default function DueChip({ deadline, className = '' }) {
  const d = parseServerDate(deadline)
  if (!d) return null
  const ms = d.getTime() - Date.now()
  const hours = Math.floor(Math.abs(ms) / 3600000)
  const mins = Math.floor((Math.abs(ms) % 3600000) / 60000)
  const text = ms <= 0 ? 'Overdue' : hours >= 48 ? `${Math.floor(hours / 24)}d left` : hours >= 1 ? `${hours}h left` : `${mins}m left`
  const tone = ms <= 0 ? 'text-rust-600' : hours < 12 ? 'text-brass-600' : 'text-ink-faint'
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${tone} ${className}`} title={`Escalates ${d.toLocaleString('en-IN')}`}>
      <Icon name="clock" className="h-3.5 w-3.5" />
      {text}
    </span>
  )
}
