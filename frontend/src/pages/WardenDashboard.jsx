import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { complaintsAPI } from '../api/client'
import { useAuth } from '../context/AuthContext'
import DueChip from '../components/DueChip'
import EmptyState from '../components/EmptyState'
import FilterChips from '../components/FilterChips'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import Pagination from '../components/Pagination'
import { ListSkeleton, StatSkeletons } from '../components/Skeleton'
import StatTile from '../components/StatTile'
import StatusBadge from '../components/StatusBadge'
import useDebounce from '../hooks/useDebounce'
import usePageTitle from '../hooks/usePageTitle'
import { categoryLabel } from '../utils/categories'
import { formatDate } from '../utils/date'
import { canChangeStatus, statusOptions } from '../utils/status'

const STATUS_OPTIONS = [
  ['pending', 'Pending'],
  ['in_progress', 'In progress'],
  ['resolved', 'Resolved']
]
const FILTERS = [['', 'All'], ...STATUS_OPTIONS.slice(0, 2), ['escalated', 'Escalated'], ['resolved', 'Resolved']]

export default function WardenDashboard() {
  usePageTitle('Assigned complaints')
  const { user } = useAuth()
  const [data, setData] = useState({ items: [], total: 0, pages: 1 })
  const [totals, setTotals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [updating, setUpdating] = useState(null)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = useDebounce(search)

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

  // Ragging / anonymous-to-admin complaints never appear here: the backend
  // excludes them from the warden's assigned queue entirely.

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <PageHeader title="Assigned complaints" subtitle={user?.handles_category ? `${categoryLabel(user.handles_category)} queue · tap a complaint to open it` : 'Tap a complaint to open it, or change its status right here'} />

      <div className="grid grid-cols-3 gap-3 mb-6">
        {totals ? (
          <>
            <StatTile label="Pending" value={totals.pending} onClick={() => setStatus(status === 'pending' ? '' : 'pending')} active={status === 'pending'} />
            <StatTile label="In progress" value={totals.in_progress} onClick={() => setStatus(status === 'in_progress' ? '' : 'in_progress')} active={status === 'in_progress'} />
            <StatTile label="Escalated" value={totals.escalated} tone="warn" onClick={() => setStatus(status === 'escalated' ? '' : 'escalated')} active={status === 'escalated'} />
          </>
        ) : (
          <StatSkeletons count={3} />
        )}
      </div>

      <div className="relative mb-3">
        <Icon name="search" className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
        <input type="search" enterKeyHint="search" aria-label="Search complaints" className="input-field !pl-10" placeholder="Search ticket no., title, location…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="mb-5">
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
        <ul className="panel divide-y divide-stone-200 overflow-hidden">
          {data.items.map((c) => (
            <li key={c.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-stone-100/60 transition-colors">
              <Link to={`/complaints/${c.id}`} className="min-w-0 group">
                <span className="block font-medium text-ink line-clamp-2 md:line-clamp-1 group-hover:text-accent">{c.title}</span>
                <span className="block text-xs text-ink-faint mt-1 ticket-no">
                  {c.ticket_id} · {c.location} · {formatDate(c.created_at)}
                  {c.reopened_count > 0 && <span className="text-rust-600"> · Reopened</span>}
                </span>
              </Link>
              <div className="flex items-center gap-3 shrink-0 flex-wrap">
                <StatusBadge status={c.status} />
                <DueChip deadline={c.sla_deadline} />
                <select
                  aria-label={`Change status of ${c.ticket_id}`}
                  disabled={updating === c.id || !canChangeStatus('warden', c.status)}
                  value={c.status === 'escalated' ? '' : c.status}
                  onChange={(e) => changeStatus(c.id, e.target.value)}
                  className="input-field !w-auto flex-1 md:flex-none md:!min-h-[36px] md:!py-1.5 min-w-[9.5rem]"
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
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} pages={data.pages} total={data.total} onChange={setPage} />
    </div>
  )
}
