import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { complaintsAPI, staffAPI } from '../api/client'
import ComplaintCard from '../components/ComplaintCard'
import Pagination from '../components/Pagination'
import useDebounce from '../hooks/useDebounce'

const STATUSES = [
  ['', 'All'],
  ['pending', 'Pending'],
  ['in_progress', 'In progress'],
  ['escalated', 'Escalated'],
  ['resolved', 'Resolved']
]
const CATEGORIES = ['maintenance', 'mess', 'wifi', 'cleanliness', 'security', 'ragging']

const EMPTY = { q: '', status: '', category: '', warden: '', date_from: '', date_to: '', sort: 'newest' }

export default function AdminComplaints() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState(EMPTY)
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [wardens, setWardens] = useState([])
  const q = useDebounce(filters.q)

  useEffect(() => {
    staffAPI
      .list()
      .then(({ data }) => setWardens(data.filter((s) => s.role === 'warden')))
      .catch(() => {})
  }, [])

  // Any filter change goes back to page 1.
  useEffect(() => {
    setPage(1)
  }, [q, filters.status, filters.category, filters.warden, filters.date_from, filters.date_to, filters.sort])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = {
      page,
      page_size: 15,
      sort: filters.sort,
      q: q || undefined,
      status: filters.status || undefined,
      category: filters.category || undefined,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined
    }
    if (filters.warden === 'unassigned') params.unassigned = true
    else if (filters.warden) params.warden_id = filters.warden

    complaintsAPI
      .search(params)
      .then(({ data }) => !cancelled && setData(data))
      .catch(() => !cancelled && setData({ items: [], total: 0, pages: 1 }))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [page, q, filters.status, filters.category, filters.warden, filters.date_from, filters.date_to, filters.sort])

  const set = (patch) => setFilters((f) => ({ ...f, ...patch }))
  const activeCount = ['category', 'warden', 'date_from', 'date_to'].filter((k) => filters[k]).length
  const anyFilter = activeCount > 0 || filters.status || filters.q

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/admin" className="text-sm text-pine-500 hover:underline">
        ← Overview
      </Link>
      <h1 className="font-display text-2xl text-ink mt-3 mb-5">All complaints</h1>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            className="input-field !pl-9"
            placeholder="Search ticket no., title, location…"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`btn-secondary shrink-0 ${showFilters || activeCount ? '!border-pine-500 !text-pine-500' : ''}`}
          aria-expanded={showFilters}
        >
          Filters{activeCount ? ` (${activeCount})` : ''}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
        {STATUSES.map(([key, label]) => (
          <button
            key={key || 'all'}
            onClick={() => set({ status: key })}
            className={`px-3 py-1.5 rounded-sm text-sm whitespace-nowrap border transition-colors ${
              filters.status === key
                ? 'bg-pine-500 text-paper border-pine-500'
                : 'bg-white text-ink-soft border-stone-300 hover:border-ink/30'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="panel p-4 mb-4 grid sm:grid-cols-2 gap-3">
          <div>
            <label className="field-label">Category</label>
            <select className="input-field" value={filters.category} onChange={(e) => set({ category: e.target.value })}>
              <option value="">Any category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Warden</label>
            <select className="input-field" value={filters.warden} onChange={(e) => set({ warden: e.target.value })}>
              <option value="">Anyone</option>
              <option value="unassigned">Unassigned</option>
              {wardens.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.handles_category})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Filed from</label>
            <input type="date" className="input-field" value={filters.date_from} onChange={(e) => set({ date_from: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Filed until</label>
            <input type="date" className="input-field" value={filters.date_to} onChange={(e) => set({ date_to: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Sort</label>
            <select className="input-field" value={filters.sort} onChange={(e) => set({ sort: e.target.value })}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-ghost" onClick={() => setFilters(EMPTY)}>
              Clear all
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-faint text-center py-14">Loading…</p>
      ) : data.items.length === 0 ? (
        <div className="panel border-dashed p-12 text-center text-ink-soft text-sm">
          {anyFilter ? 'No complaints match these filters.' : 'No complaints yet.'}
          {anyFilter && (
            <div>
              <button className="text-pine-500 font-medium hover:underline mt-2" onClick={() => setFilters(EMPTY)}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((c) => (
            <ComplaintCard key={c.id} complaint={c} showWarden onClick={() => navigate(`/complaints/${c.id}`)} />
          ))}
        </div>
      )}

      <Pagination page={page} pages={data.pages} total={data.total} onChange={setPage} />
    </div>
  )
}
