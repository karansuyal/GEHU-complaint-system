import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { complaintsAPI, staffAPI } from '../api/client'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import StarRating from '../components/StarRating'
import Sheet from '../components/Sheet'
import { daysLeft, formatDate, formatDateTime, timeAgo } from '../utils/date'

const STAFF_STATUSES = [
  ['pending', 'Pending'],
  ['in_progress', 'In progress'],
  ['resolved', 'Resolved']
]

function errText(err, fallback) {
  const d = err.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d) && d[0]?.msg) return d[0].msg
  return fallback
}

export default function ComplaintDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [complaint, setComplaint] = useState(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  // student: feedback + reopen
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [reopenOpen, setReopenOpen] = useState(false)
  const [reason, setReason] = useState('')

  // admin: assignment
  const [wardens, setWardens] = useState([])
  const [assignTo, setAssignTo] = useState('')

  const load = () =>
    complaintsAPI
      .getOne(id)
      .then(({ data }) => {
        setComplaint(data)
        setAssignTo(data.assigned_warden_id || '')
      })
      .catch(() => setComplaint(null))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [id])

  useEffect(() => {
    if (user?.role !== 'admin') return
    staffAPI
      .list()
      .then(({ data }) => setWardens(data.filter((s) => s.role === 'warden' && s.is_active)))
      .catch(() => {})
  }, [user?.role])

  const run = async (fn, okMsg) => {
    setBusy(true)
    try {
      await fn()
      if (okMsg) toast.success(okMsg)
      await load()
      return true
    } catch (err) {
      toast.error(errText(err, 'Something went wrong'))
      return false
    } finally {
      setBusy(false)
    }
  }

  const submitComment = async (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    const ok = await run(() => complaintsAPI.addComment(id, { text: comment }))
    if (ok) setComment('')
  }

  const submitFeedback = () =>
    run(() => complaintsAPI.leaveFeedback(id, { rating, comment: feedback.trim() || null }), 'Thanks for your feedback')

  const submitReopen = async () => {
    const ok = await run(() => complaintsAPI.reopen(id, reason.trim()), 'Complaint reopened')
    if (ok) {
      setReopenOpen(false)
      setReason('')
      setRating(0)
      setFeedback('')
    }
  }

  const backTo = user?.role === 'admin' ? '/admin' : user?.role === 'warden' ? '/warden' : '/dashboard'

  if (loading) return <p className="text-center text-sm text-ink-faint py-14">Loading…</p>
  if (!complaint) return <p className="text-center text-sm text-ink-faint py-14">Complaint not found.</p>

  const isStudent = user?.role === 'student'
  const isStaff = user?.role === 'warden' || user?.role === 'admin'
  const resolved = complaint.status === 'resolved'
  const canReopen = isStudent && resolved && complaint.reopen_deadline && daysLeft(complaint.reopen_deadline) > 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-10">
      <Link to={backTo} className="text-sm text-pine-500 hover:underline inline-flex items-center gap-1">
        ← Back
      </Link>

      <div className="panel p-5 sm:p-6 mt-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-xs text-ink-faint ticket-no mb-1">{complaint.ticket_id}</p>
            <h1 className="font-display text-xl text-ink break-words">{complaint.title}</h1>
            <p className="text-xs text-ink-faint mt-1.5">
              {complaint.location} · Filed {formatDate(complaint.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <StatusBadge status={complaint.status} />
        </div>

        <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-line">{complaint.description}</p>

        {complaint.photo_url && (
          <img
            src={complaint.photo_url}
            alt="Complaint evidence"
            className="mt-4 rounded-md border border-stone-300 max-h-72 w-full object-cover"
          />
        )}

        <div className="mt-5 pt-4 divider text-sm flex flex-wrap gap-x-6 gap-y-1 text-ink-soft">
          <span>
            Handled by:{' '}
            <strong className="text-ink font-medium">
              {complaint.assigned_warden_name ||
                (complaint.category === 'ragging' ? 'Admin (anti-ragging)' : 'Admin — no warden assigned')}
            </strong>
          </span>
          {complaint.is_anonymous && <span>Filed anonymously</span>}
        </div>

        {complaint.reopened_count > 0 && (
          <div className="mt-4 bg-rust-50 border border-rust-100 rounded-md p-3 text-sm text-rust-600">
            Reopened {complaint.reopened_count} time{complaint.reopened_count > 1 ? 's' : ''}
            {complaint.reopen_reason ? <> — “{complaint.reopen_reason}”</> : null}
          </div>
        )}

        {/* Staff controls */}
        {isStaff && (
          <div className="mt-5 pt-4 divider grid sm:grid-cols-2 gap-3">
            <div>
              <label className="field-label">Status</label>
              <select
                className="input-field"
                disabled={busy}
                value={complaint.status === 'escalated' ? '' : complaint.status}
                onChange={(e) => run(() => complaintsAPI.updateStatus(id, { status: e.target.value }), 'Status updated')}
              >
                {complaint.status === 'escalated' && (
                  <option value="" disabled>
                    Escalated — choose new status
                  </option>
                )}
                {STAFF_STATUSES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            {user.role === 'admin' && complaint.category !== 'ragging' && (
              <div>
                <label className="field-label">Assigned warden</label>
                <div className="flex gap-2">
                  <select className="input-field" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                    <option value="">Unassigned (admin)</option>
                    {wardens.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} · {w.handles_category}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn-secondary shrink-0"
                    disabled={busy || assignTo === (complaint.assigned_warden_id || '')}
                    onClick={() => run(() => complaintsAPI.assign(id, assignTo || null), 'Assignment updated')}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {complaint.status_history?.length > 0 && (
          <div className="mt-6 pt-5 divider">
            <h3 className="text-sm font-medium text-ink-soft mb-3">Timeline</h3>
            <div className="space-y-2.5">
              {complaint.status_history.map((h, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-ink-faint flex-wrap">
                  <span className="h-1.5 w-1.5 rounded-full bg-pine-500 shrink-0" />
                  <StatusBadge status={h.status} />
                  <span>{formatDateTime(h.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Student: rate the resolution / reopen */}
      {isStudent && resolved && (
        <div className="panel p-5 sm:p-6 mt-4">
          {complaint.rating ? (
            <div>
              <h3 className="text-sm font-medium text-ink-soft mb-2">Your feedback</h3>
              <StarRating value={complaint.rating} />
              {complaint.feedback_text && <p className="text-sm text-ink-soft mt-2">“{complaint.feedback_text}”</p>}
            </div>
          ) : (
            <div>
              <h3 className="font-display text-lg text-ink">Was this resolved properly?</h3>
              <p className="text-sm text-ink-faint mt-0.5 mb-3">Your rating helps us hold the queue accountable.</p>
              <StarRating value={rating} onChange={setRating} />
              <textarea
                rows={2}
                maxLength={500}
                className="input-field resize-none mt-3"
                placeholder="Anything to add? (optional)"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <button className="btn-primary w-full sm:w-auto mt-3" disabled={busy || !rating} onClick={submitFeedback}>
                Submit rating
              </button>
            </div>
          )}

          {canReopen ? (
            <div className="mt-5 pt-4 divider flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-ink-soft">
                Still not fixed? You can reopen this for {daysLeft(complaint.reopen_deadline)} more day
                {daysLeft(complaint.reopen_deadline) === 1 ? '' : 's'}.
              </p>
              <button className="btn-secondary !border-rust-100 !text-rust-600 hover:!bg-rust-50" onClick={() => setReopenOpen(true)}>
                Reopen complaint
              </button>
            </div>
          ) : (
            <p className="mt-4 pt-4 divider text-xs text-ink-faint">
              The reopen window has closed. If the problem is back, please file a new complaint.
            </p>
          )}
        </div>
      )}

      <div className="panel p-5 sm:p-6 mt-4">
        <h3 className="text-sm font-medium text-ink-soft mb-3">Comments</h3>
        <div className="space-y-3 mb-4">
          {complaint.comments?.map((c, i) => (
            <div key={i} className="text-sm">
              <span className="font-medium text-ink">{c.author_name}: </span>
              <span className="text-ink-soft">{c.text}</span>
              <span className="text-[11px] text-ink-faint ml-2">{timeAgo(c.created_at)}</span>
            </div>
          ))}
          {(!complaint.comments || complaint.comments.length === 0) && (
            <p className="text-sm text-ink-faint">No comments yet.</p>
          )}
        </div>
        <form onSubmit={submitComment} className="flex gap-2">
          <input
            className="input-field"
            placeholder="Add a comment…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button type="submit" disabled={busy} className="btn-primary shrink-0">
            Post
          </button>
        </form>
      </div>

      <Sheet
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        title="Reopen complaint"
        footer={
          <button className="btn-primary w-full" disabled={busy || reason.trim().length < 5} onClick={submitReopen}>
            {busy ? 'Reopening…' : 'Reopen complaint'}
          </button>
        }
      >
        <p className="text-sm text-ink-soft mb-3">
          Tell us what's still wrong. This goes back to the warden's queue with a fresh deadline.
        </p>
        <textarea
          rows={4}
          maxLength={500}
          autoFocus
          className="input-field resize-none"
          placeholder="e.g. The light was replaced but it's flickering again."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <p className="text-xs text-ink-faint mt-1">{reason.trim().length}/500 · at least 5 characters</p>
      </Sheet>
    </div>
  )
}
