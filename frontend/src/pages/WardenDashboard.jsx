import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { complaintsAPI } from '../api/client'
import { useAuth } from '../context/AuthContext'
import DueChip from '../components/DueChip'
import EmptyState from '../components/EmptyState'
import FilterChips from '../components/FilterChips'
import HeroBanner from '../components/HeroBanner'
import Icon from '../components/Icon'
import Pagination from '../components/Pagination'
import { ListSkeleton, StatSkeletons } from '../components/Skeleton'
import StatTile from '../components/StatTile'
import StatusBadge from '../components/StatusBadge'
import useDebounce from '../hooks/useDebounce'
import useGreeting from '../hooks/useGreeting'
import usePageTitle from '../hooks/usePageTitle'
import { categoryLabel } from '../utils/categories'
import { formatDate } from '../utils/date'
import { canChangeStatus, statusOptions } from '../utils/status'

const FILTERS = [['', 'All'], ['pending', 'Pending'], ['in_progress', 'In progress'], ['escalated', 'Escalated'], ['resolved', 'Resolved']]
const RAIL = { pending: 'rgb(var(--c-brass-500))', in_progress: 'rgb(var(--c-slate-500))', resolved: 'rgb(var(--c-pine-400))', escalated: 'rgb(var(--c-rust-500))' }

export default function WardenDashboard() {
  usePageTitle('Assigned complaints')
  const { user } = useAuth()
  const greeting = useGreeting()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState({ items: [], total: 0, pages: 1 })
  const [totals, setTotals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [updating, setUpdating] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const status = params.get('status') || ''
  const q = useDebounce(search)

  // The status lives in the URL so the phone tab bar's "Urgent" tab and the chips stay in sync.
  const setStatus = (s) => setParams(s ? { status: s } : {}, { replace: true })

  useEffect(() => setPage(1), [q, status])

  const loadTotals = useCallback(() => {
    Promise.all(['pending', 'in_progress', 'escalated'].map((s) => complaintsAPI.search({ page_size: 1, status: s })))
      .then(([p, i, e]) => setTotals({ pending: p.data.total, in_progress: i.data.total, escalated: e.data.total }))
      .catch(() => {})
  }, [])
  useEffect(loadTotals, [loadTotals])

  const load = useCallback(() => {
    setLoading(true)
    setFailed(false)
    complaintsAPI
      .search({ page, page_size: 15, q: q || undefined, status: status || undefined })
      .then(({ data }) => setData(data))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [page, q, status])
  useEffect(load, [load])

  const changeStatus = async (id, next) => {
    setUpdating(id)
    try {
      await complaintsAPI.updateStatus(id, { status: next })
      toast.success('Status updated')
      load()
      loadTotals()
    } catch (err) {
      const d = err.response?.data?.detail
      toast.error(typeof d === 'string' ? d : 'Failed to update status')
      load()
    } finally {
      setUpdating(null)
    }
  }

  const needsAction = totals ? totals.pending + totals.escalated : null
  const first = user?.name?.split(' ')[0] || 'there'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
      <HeroBanner
        eyebrow={`${greeting}${user?.handles_category ? ` · ${categoryLabel(user.handles_category)} desk` : ''}`}
        title={`${first}, your queue`}
        subtitle={needsAction == null ? 'Loading your queue…' : needsAction > 0 ? `${needsAction} complaint${needsAction > 1 ? 's need' : ' needs'} your attention.` : "You're all caught up. Great work!"}
        aside={
          totals && (
            <div className="hero-chip rounded-2xl px-4 py-3 text-center shrink-0">
              <p className="font-display text-3xl leading-none tabular-nums">{needsAction}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/70 mt-1.5">to action</p>
            </div>
          )
        }
      />

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-5 stagger">
        {totals ? (
          <>
            <div style={{ '--i': 0 }}><StatTile icon="clock" tone="brass" label="Pending" value={totals.pending} onClick={() => setStatus(status === 'pending' ? '' : 'pending')} active={status === 'pending'} /></div>
            <div style={{ '--i': 1 }}><StatTile icon="refresh" tone="info" label="In progress" value={totals.in_progress} onClick={() => setStatus(status === 'in_progress' ? '' : 'in_progress')} active={status === 'in_progress'} /></div>
            <div style={{ '--i': 2 }}><StatTile icon="warning" tone="warn" label="Escalated" value={totals.escalated} onClick={() => setStatus(status === 'escalated' ? '' : 'escalated')} active={status === 'escalated'} /></div>
          </>
        ) : (
          <StatSkeletons count={3} />
        )}
      </div>

      <div className="sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 -mx-4 px-4 sm:mx-0 sm:px-0 py-2 glass mb-2">
        <div className="relative mb-2">
          <Icon name="search" className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          <input type="search" enterKeyHint="search" aria-label="Search complaints" className="input-field !pl-10" placeholder="Search ticket no., title, location…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <FilterChips options={FILTERS} value={status} onChange={setStatus} label="Filter by status" />
      </div>

      {loading ? (
        <ListSkeleton rows={5} />
      ) : failed ? (
        <EmptyState icon="warning" title="Couldn't load complaints" action={<button className="btn-secondary" onClick={load}>Try again</button>}>
          Check your connection and try again.
        </EmptyState>
      ) : data.items.length === 0 ? (
        <EmptyState icon="check" title={q || status ? 'No matches' : "You're all caught up"}>
          {q || status ? 'No complaints match these filters.' : 'Nothing is assigned to you right now.'}
        </EmptyState>
      ) : (
        <ul className="space-y-3 stagger">
          {data.items.map((c, i) => (
            <li key={c.id} style={{ '--i': Math.min(i, 8), '--rail': RAIL[c.status] }} className="panel status-rail p-4 pl-5">
              <Link to={`/complaints/${c.id}`} className="block group">
                <span className="flex items-start justify-between gap-3">
                  <span className="block font-semibold text-ink line-clamp-2 group-hover:text-accent transition-colors">{c.title}</span>
                  <Icon name="chevronRight" className="h-5 w-5 text-stone-400 shrink-0 mt-0.5" />
                </span>
                <span className="block text-xs text-ink-faint mt-1 ticket-no">
                  {c.ticket_id} · {c.location} · {formatDate(c.created_at)}
                  {c.reopened_count > 0 && <span className="text-rust-600"> · Reopened</span>}
                </span>
              </Link>
              <div className="flex items-center justify-between gap-2 mt-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <StatusBadge status={c.status} />
                  <DueChip deadline={c.sla_deadline} />
                </div>
              </div>
              <select
                aria-label={`Change status of ${c.ticket_id}`}
                disabled={updating === c.id || !canChangeStatus('warden', c.status)}
                value={c.status === 'escalated' ? '' : c.status}
                onChange={(e) => changeStatus(c.id, e.target.value)}
                className="input-field mt-3 sm:max-w-[14rem]"
              >
                {c.status === 'escalated' && (
                  <option value="" disabled>
                    Choose status…
                  </option>
                )}
                {statusOptions('warden', c.status).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} pages={data.pages} total={data.total} onChange={setPage} />
    </div>
  )
}
