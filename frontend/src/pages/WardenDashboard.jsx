import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { complaintsAPI } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import Pagination from '../components/Pagination'
import useDebounce from '../hooks/useDebounce'
import { formatDate } from '../utils/date'

const STATUS_OPTIONS = ['pending', 'in_progress', 'resolved']
const FILTERS = [
  ['', 'All'],
  ['pending', 'Pending'],
  ['in_progress', 'In progress'],
  ['escalated', 'Escalated'],
  ['resolved', 'Resolved']
]

export default function WardenDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState({ items: [], total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = useDebounce(search)

  useEffect(() => {
    setPage(1)
  }, [q, status])

  const load = () => {
    setLoading(true)
    complaintsAPI
      .search({ page, page_size: 15, q: q || undefined, status: status || undefined })
      .then(({ data }) => setData(data))
      .catch(() => setData({ items: [], total: 0, pages: 1 }))
      .finally(() => setLoading(false))
  }

  useEffect(load, [page, q, status])

  const changeStatus = async (id, next) => {
    setUpdating(id)
    try {
      await complaintsAPI.updateStatus(id, { status: next })
      toast.success('Status updated')
      load()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdating(null)
    }
  }

  // Note: ragging/anonymous complaints routed to admin never appear here -
  // the backend excludes them from the warden's assigned queue entirely.

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
      <p className="text-xs uppercase tracking-wide text-ink-faint mb-1">Warden</p>
      <h1 className="font-display text-2xl text-ink mb-1">Assigned complaints</h1>
      <p className="text-sm text-ink-faint mb-5">Tap a complaint to open it, or change its status right here.</p>

      <input
        type="search"
        className="input-field mb-3"
        placeholder="Search ticket no., title, location…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {FILTERS.map(([key, label]) => (
          <button
            key={key || 'all'}
            onClick={() => setStatus(key)}
            className={`px-3 py-1.5 rounded-sm text-sm whitespace-nowrap border transition-colors ${
              status === key
                ? 'bg-pine-500 text-paper border-pine-500'
                : 'bg-white text-ink-soft border-stone-300 hover:border-ink/30'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-ink-faint text-center py-14">Loading…</p>
      ) : data.items.length === 0 ? (
        <div className="panel border-dashed p-12 text-center text-ink-soft text-sm">
          {q || status ? 'No complaints match these filters.' : 'Nothing assigned right now.'}
        </div>
      ) : (
        <div className="panel divide-y divide-stone-200">
          {data.items.map((c) => (
            <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-100/60 transition-colors">
              <button onClick={() => navigate(`/complaints/${c.id}`)} className="min-w-0 text-left">
                <p className="font-medium text-ink truncate hover:text-pine-500">{c.title}</p>
                <p className="text-xs text-ink-faint mt-0.5 ticket-no">
                  {c.ticket_id} · {c.location} · {formatDate(c.created_at)}
                  {c.reopened_count > 0 && <span className="text-rust-600"> · Reopened</span>}
                </p>
              </button>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={c.status} />
                <select
                  disabled={updating === c.id}
                  value={c.status === 'escalated' ? '' : c.status}
                  onChange={(e) => changeStatus(c.id, e.target.value)}
                  className="flex-1 sm:flex-none text-sm border border-stone-300 rounded-md px-2 py-2.5 sm:py-1.5 bg-white focus:border-pine-500 focus:ring-1 focus:ring-pine-500 outline-none"
                >
                  {c.status === 'escalated' && (
                    <option value="" disabled>
                      choose…
                    </option>
                  )}
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} pages={data.pages} total={data.total} onChange={setPage} />
    </div>
  )
}
