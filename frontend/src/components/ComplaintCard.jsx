import StatusBadge from './StatusBadge'
import StarRating from './StarRating'
import { formatDate } from '../utils/date'

const CATEGORY_ICONS = {
  maintenance: '🔧',
  mess: '🍽️',
  ragging: '🚨',
  wifi: '📶',
  cleanliness: '🧹',
  security: '🛡️'
}

export default function ComplaintCard({ complaint, onClick, showWarden = false }) {
  const {
    title,
    category,
    status,
    created_at,
    is_anonymous,
    ticket_id,
    reopened_count,
    rating,
    assigned_warden_name
  } = complaint

  return (
    <button
      onClick={onClick}
      className="panel w-full text-left p-4 flex items-start gap-4 hover:border-pine-400 transition-colors group"
    >
      <div className="h-10 w-10 rounded-sm bg-stone-100 flex items-center justify-center text-lg shrink-0">
        {CATEGORY_ICONS[category] || '📋'}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium text-ink truncate group-hover:text-pine-500 transition-colors">
            {title}
          </p>
          <StatusBadge status={status} />
        </div>
        <p className="text-xs text-ink-faint mt-1 ticket-no">
          No. {ticket_id}
          <span className="mx-1.5">·</span>
          {formatDate(created_at)}
          {is_anonymous && (
            <>
              <span className="mx-1.5">·</span>
              Anonymous
            </>
          )}
          {reopened_count > 0 && (
            <>
              <span className="mx-1.5">·</span>
              <span className="text-rust-600">Reopened{reopened_count > 1 ? ` ×${reopened_count}` : ''}</span>
            </>
          )}
        </p>
        {(showWarden || rating) && (
          <div className="flex items-center justify-between gap-2 mt-1.5">
            {showWarden ? (
              <p className="text-xs text-ink-soft truncate">
                {assigned_warden_name ? (
                  <>Warden: {assigned_warden_name}</>
                ) : category === 'ragging' ? (
                  'Admin only'
                ) : status === 'resolved' ? (
                  ''
                ) : (
                  <span className="text-brass-600 font-medium">Unassigned</span>
                )}
              </p>
            ) : (
              <span />
            )}
            {rating ? <StarRating value={rating} size="sm" /> : null}
          </div>
        )}
      </div>
    </button>
  )
}
