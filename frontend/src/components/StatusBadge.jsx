const STYLES = {
  pending: 'bg-brass-50 text-brass-600 border-brass-100',
  in_progress: 'bg-slate-50 text-slate-600 border-slate-100',
  resolved: 'bg-pine-50 text-pine-600 border-pine-100',
  escalated: 'bg-rust-50 text-rust-600 border-rust-100'
}

const DOTS = {
  pending: 'bg-brass-500',
  in_progress: 'bg-slate-500',
  resolved: 'bg-pine-500',
  escalated: 'bg-rust-500'
}

const LABELS = {
  pending: 'Pending',
  in_progress: 'In progress',
  resolved: 'Resolved',
  escalated: 'Escalated'
}

export default function StatusBadge({ status }) {
  const style = STYLES[status] || STYLES.pending
  const dot = DOTS[status] || DOTS.pending
  return (
    <span className={`status-tag ${style}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
      {LABELS[status] || status}
    </span>
  )
}
