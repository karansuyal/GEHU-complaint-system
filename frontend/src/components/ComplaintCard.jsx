import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import StarRating from './StarRating'
import DueChip from './DueChip'
import Icon from './Icon'
import { CATEGORY_BY_VALUE } from '../utils/categories'
import { formatDate } from '../utils/date'

export default function ComplaintCard({ complaint, showWarden = false, showDue = false }) {
  const { id, title, category, status, created_at, is_anonymous, ticket_id, reopened_count, rating, assigned_warden_name, sla_deadline } = complaint
  const meta = CATEGORY_BY_VALUE[category]

  return (
    <Link to={`/complaints/${id}`} className="panel panel-hover w-full p-4 flex items-start gap-3.5 group">
      <span className="h-10 w-10 rounded-md bg-stone-100 text-ink-soft flex items-center justify-center shrink-0 group-hover:bg-pine-50 group-hover:text-pine-600 transition-colors">
        <Icon name={meta?.icon || 'clipboard'} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block font-medium text-ink line-clamp-2 sm:line-clamp-1 group-hover:text-accent transition-colors">{title}</span>
        <span className="block text-xs text-ink-faint mt-1 ticket-no">
          {ticket_id} · {formatDate(created_at)}
          {is_anonymous && ' · Anonymous'}
          {reopened_count > 0 && <span className="text-rust-600"> · Reopened{reopened_count > 1 ? ` ×${reopened_count}` : ''}</span>}
        </span>
        <span className="flex items-center flex-wrap gap-x-3 gap-y-1.5 mt-2.5">
          <StatusBadge status={status} />
          {showDue && <DueChip deadline={sla_deadline} />}
          {showWarden && (
            <span className="text-xs text-ink-soft">
              {assigned_warden_name ? (
                assigned_warden_name
              ) : category === 'ragging' ? (
                'Admin only'
              ) : status === 'resolved' ? null : (
                <span className="text-brass-600 font-medium">Unassigned</span>
              )}
            </span>
          )}
          {rating ? <StarRating value={rating} size="sm" /> : null}
        </span>
      </span>
      <Icon name="chevronRight" className="h-5 w-5 text-stone-400 shrink-0 self-center hidden sm:block group-hover:text-accent" />
    </Link>
  )
}
