import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { complaintsAPI, staffAPI } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import DueChip from '../components/DueChip'
import EmptyState from '../components/EmptyState'
import { Field } from '../components/Field'
import Icon from '../components/Icon'
import ImageViewer from '../components/ImageViewer'
import PageHeader from '../components/PageHeader'
import SegmentedControl from '../components/SegmentedControl'
import Sheet from '../components/Sheet'
import { Skeleton } from '../components/Skeleton'
import StarRating from '../components/StarRating'
import StatusBadge from '../components/StatusBadge'
import Timeline from '../components/Timeline'
import usePageTitle from '../hooks/usePageTitle'
import { categoryLabel, roleHome } from '../utils/categories'
import { daysLeft, formatDate, timeAgo } from '../utils/date'

const STAFF_STATUSES = [['pending', 'Pending'], ['in_progress', 'In progress'], ['resolved', 'Resolved']]

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
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [reopenOpen, setReopenOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [wardens, setWardens] = useState([])
  const [assignTo, setAssignTo] = useState('')

  usePageTitle(complaint ? complaint.ticket_id : 'Complaint')

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
    setLoading(true)
    load()
  }, [id])

  useEffect(() => {
    if (user?.role !== 'admin') return
    staffAPI.list().then(({ data }) => setWardens(data.filter((s) => s.role === 'warden' && s.is_active))).catch(() => {})
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
    e?.preventDefault()
    if (!comment.trim()) return
    const ok = await run(() => complaintsAPI.addComment(id, { text: comment.trim() }))
    if (ok) setComment('')
  }

  const submitFeedback = () => run(() => complaintsAPI.leaveFeedback(id, { rating, comment: feedback.trim() || null }), 'Thanks for your feedback')

  const submitReopen = async () => {
    const ok = await run(() => complaintsAPI.reopen(id, reason.trim()), 'Complaint reopened')
    if (ok) {
      setReopenOpen(false)
      setReason('')
      setRating(0)
      setFeedback('')
    }
  }

  const copyTicket = async () => {
    try {
      await navigator.clipboard.writeText(complaint.ticket_id)
      toast.success('Ticket number copied')
    } catch {
      toast.error('Could not copy')
    }
  }

  const back = { to: roleHome(user?.role), label: user?.role === 'student' ? 'My complaints' : user?.role === 'admin' ? 'Overview' : 'Assigned complaints' }

  if (loading)
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-4" role="status" aria-label="Loading complaint">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  if (!complaint)
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <EmptyState icon="search" title="Complaint not found" action={<Link to={back.to} className="btn-secondary">Back</Link>}>
          It may have been removed, or you may not have access to it.
        </EmptyState>
      </div>
    )

  const isStudent = user?.role === 'student'
  const isStaff = user?.role === 'warden' || user?.role === 'admin'
  const resolved = complaint.status === 'resolved'
  const canReopen = isStudent && resolved && complaint.reopen_deadline && daysLeft(complaint.reopen_deadline) > 0
  const isMine = (name) => name === user.name || (isStudent && name === 'Student (anonymous)')

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <PageHeader title="" back={back} />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem] gap-5 items-start">
        {/* Main card */}
        <section className="panel p-5 sm:p-6 lg:col-start-1" aria-labelledby="c-title">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <button onClick={copyTicket} className="ticket-no text-sm inline-flex items-center gap-1.5 hover:text-accent min-h-[32px]" title="Copy ticket number">
              {complaint.ticket_id}
              <Icon name="clipboard" className="h-3.5 w-3.5" />
            </button>
            <StatusBadge status={complaint.status} />
          </div>
          <h1 id="c-title" className="font-display text-2xl text-ink break-words">{complaint.title}</h1>
          <p className="text-sm text-ink-faint mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <span>{categoryLabel(complaint.category)}</span>
            <span>{complaint.location}</span>
            <span>Filed {formatDate(complaint.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </p>
          <p className="text-[0.95rem] text-ink-soft leading-relaxed whitespace-pre-line mt-5 max-w-prose">{complaint.description}</p>
          {complaint.photo_url && <ImageViewer src={complaint.photo_url} alt="Complaint evidence" />}

          {complaint.reopened_count > 0 && (
            <div className="mt-5 bg-rust-50 border border-rust-100 rounded-md p-3 text-sm text-rust-600">
              Reopened {complaint.reopened_count} time{complaint.reopened_count > 1 ? 's' : ''}
              {complaint.reopen_reason ? <>: “{complaint.reopen_reason}”</> : null}
            </div>
          )}
        </section>

        {/* Sidebar: details, staff controls, timeline */}
        <aside className="space-y-5 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24">
          <section className="panel p-5 space-y-4" aria-label="Details">
            <div>
              <p className="text-xs text-ink-faint mb-1.5">Handled by</p>
              <div className="flex items-center gap-2.5">
                {complaint.assigned_warden_name ? <Avatar name={complaint.assigned_warden_name} size="sm" /> : <span className="h-8 w-8 rounded-full bg-stone-200 flex items-center justify-center text-ink-faint"><Icon name="user" className="h-4 w-4" /></span>}
                <p className="text-sm font-medium text-ink">
                  {complaint.assigned_warden_name || (complaint.category === 'ragging' ? 'Admin (anti-ragging)' : 'Admin. No warden assigned')}
                </p>
              </div>
            </div>
            {complaint.sla_deadline && (
              <div>
                <p className="text-xs text-ink-faint mb-1">Response due</p>
                <DueChip deadline={complaint.sla_deadline} className="!text-sm" />
              </div>
            )}
            {complaint.is_anonymous && (
              <p className="text-xs text-ink-soft flex items-center gap-1.5">
                <Icon name="lock" className="h-3.5 w-3.5" /> Filed anonymously
              </p>
            )}

            {isStaff && (
              <div className="pt-4 border-t border-stone-200 space-y-4">
                <div>
                  <p className="field-label">Status</p>
                  <SegmentedControl
                    label="Status"
                    disabled={busy}
                    value={complaint.status === 'escalated' ? '' : complaint.status}
                    onChange={(v) => run(() => complaintsAPI.updateStatus(id, { status: v }), 'Status updated')}
                    options={STAFF_STATUSES}
                  />
                  {complaint.status === 'escalated' && <p className="text-xs text-rust-600 mt-1.5">Escalated. Choose a new status to take it back.</p>}
                </div>
                {user.role === 'admin' && complaint.category !== 'ragging' && (
                  <Field label="Assigned warden">
                    <div className="flex gap-2">
                      <select className="input-field" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                        <option value="">Unassigned (admin)</option>
                        {wardens.map((w) => (
                          <option key={w.id} value={w.id}>{w.name} · {w.handles_category}</option>
                        ))}
                      </select>
                      <button className="btn-secondary shrink-0" disabled={busy || assignTo === (complaint.assigned_warden_id || '')} onClick={() => run(() => complaintsAPI.assign(id, assignTo || null), 'Assignment updated')}>
                        Save
                      </button>
                    </div>
                  </Field>
                )}
              </div>
            )}
          </section>

          {complaint.status_history?.length > 0 && (
            <section className="panel p-5" aria-labelledby="tl-h">
              <h2 id="tl-h" className="text-sm font-medium text-ink-soft mb-4">Timeline</h2>
              <Timeline items={complaint.status_history} />
            </section>
          )}
        </aside>

        {/* Feedback + comments */}
        <div className="space-y-5 lg:col-start-1">
          {isStudent && resolved && (
            <section className="panel p-5 sm:p-6" aria-label="Feedback">
              {complaint.rating ? (
                <div>
                  <h2 className="text-sm font-medium text-ink-soft mb-2">Your feedback</h2>
                  <StarRating value={complaint.rating} />
                  {complaint.feedback_text && <p className="text-sm text-ink-soft mt-2">“{complaint.feedback_text}”</p>}
                </div>
              ) : (
                <div>
                  <h2 className="font-display text-lg text-ink">Was this resolved properly?</h2>
                  <p className="text-sm text-ink-faint mt-0.5 mb-3">Your rating helps us hold the queue accountable.</p>
                  <StarRating value={rating} onChange={setRating} />
                  <textarea rows={2} maxLength={500} aria-label="Feedback (optional)" className="input-field resize-none mt-3" placeholder="Anything to add? (optional)" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                  <button className="btn-primary w-full sm:w-auto mt-3" disabled={busy || !rating} onClick={submitFeedback}>
                    Submit rating
                  </button>
                </div>
              )}

              {canReopen ? (
                <div className="mt-5 pt-4 border-t border-stone-200 flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm text-ink-soft">
                    Still not fixed? You can reopen this for {daysLeft(complaint.reopen_deadline)} more day{daysLeft(complaint.reopen_deadline) === 1 ? '' : 's'}.
                  </p>
                  <button className="btn-danger w-full sm:w-auto" onClick={() => setReopenOpen(true)}>Reopen complaint</button>
                </div>
              ) : (
                <p className="mt-4 pt-4 border-t border-stone-200 text-xs text-ink-faint">The reopen window has closed. If the problem is back, please file a new complaint.</p>
              )}
            </section>
          )}

          <section className="panel p-5 sm:p-6" aria-labelledby="cm-h">
            <h2 id="cm-h" className="text-sm font-medium text-ink-soft mb-4">
              Comments {complaint.comments?.length ? <span className="text-ink-faint">({complaint.comments.length})</span> : null}
            </h2>
            <ul className="space-y-3 mb-5">
              {complaint.comments?.map((c, i) => {
                const mine = isMine(c.author_name)
                return (
                  <li key={i} className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
                    <Avatar name={c.author_name} size="sm" />
                    <div className={`max-w-[85%] rounded-lg px-3.5 py-2.5 ${mine ? 'bg-pine-50 rounded-tr-sm' : 'bg-stone-100 rounded-tl-sm'}`}>
                      <p className="text-xs text-ink-faint mb-0.5">
                        <span className="font-medium text-ink-soft">{c.author_name}</span> · {timeAgo(c.created_at)}
                      </p>
                      <p className="text-sm text-ink whitespace-pre-line break-words">{c.text}</p>
                    </div>
                  </li>
                )
              })}
              {(!complaint.comments || complaint.comments.length === 0) && <li className="text-sm text-ink-faint">No comments yet. Start the conversation below.</li>}
            </ul>
            <form onSubmit={submitComment} className="flex gap-2 items-end">
              <textarea
                rows={2}
                maxLength={1000}
                aria-label="Add a comment"
                className="input-field resize-none"
                placeholder="Add a comment…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && submitComment(e)}
              />
              <button type="submit" disabled={busy || !comment.trim()} className="btn-primary !px-4 shrink-0" aria-label="Post comment">
                <Icon name="send" className="h-[18px] w-[18px]" />
                <span className="hidden sm:inline">Post</span>
              </button>
            </form>
          </section>
        </div>
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
        <p className="text-sm text-ink-soft mb-3">Tell us what's still wrong. This goes back to the warden's queue with a fresh deadline.</p>
        <textarea rows={4} maxLength={500} className="input-field resize-none" aria-label="Why are you reopening?" placeholder="e.g. The light was replaced but it's flickering again." value={reason} onChange={(e) => setReason(e.target.value)} />
        <p className="text-xs text-ink-faint mt-1.5">{reason.trim().length}/500 · at least 5 characters</p>
      </Sheet>
    </div>
  )
}
