import StatusBadge from './StatusBadge'
import { formatDateTime } from '../utils/date'

const LABEL = {
  pending: 'Complaint filed',
  in_progress: 'Work started',
  resolved: 'Marked resolved',
  escalated: 'Escalated: SLA breached'
}

// Vertical timeline: the line and dots are structure (order in time), not decoration.
export default function Timeline({ items }) {
  return (
    <ol className="relative">
      {items.map((h, i) => {
        const last = i === items.length - 1
        return (
          <li key={i} className="relative pl-7 pb-5 last:pb-0">
            {!last && <span className="absolute left-[7px] top-4 bottom-0 w-px bg-stone-300" aria-hidden="true" />}
            <span
              aria-hidden="true"
              className={`absolute left-0 top-1 h-[15px] w-[15px] rounded-full border-2 ${
                last ? 'bg-accent border-accent' : 'bg-surface border-stone-400'
              }`}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-ink">{LABEL[h.status] || h.status}</p>
              <StatusBadge status={h.status} />
            </div>
            <p className="text-xs text-ink-faint mt-0.5">{formatDateTime(h.timestamp)}</p>
          </li>
        )
      })}
    </ol>
  )
}
