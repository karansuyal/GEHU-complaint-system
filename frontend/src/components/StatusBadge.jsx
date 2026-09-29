const STYLES = {
  pending: 'bg-brass-50 text-brass-600 border-brass-100',
  in_progress: 'bg-slate-50 text-slate-600 border-slate-100',
  resolved: 'bg-pine-50 text-pine-600 border-pine-100',
  escalated: 'bg-rust-50 text-rust-600 border-rust-100'
}
const DOTS = { pending: 'bg-brass-500', in_progress: 'bg-slate-500', resolved: 'bg-pine-400', escalated: 'bg-rust-500' }
export const STATUS_LABELS = { pending: 'Pending', in_progress: 'In progress', resolved: 'Resolved', escalated: 'Escalated' }

export default function StatusBadge({ status }) {
  return (
    <span className={`status-tag ${STYLES[status] || STYLES.pending}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${DOTS[status] || DOTS.pending}`} aria-hidden="true" />
      {STATUS_LABELS[status] || status}
    </span>
  )
}
