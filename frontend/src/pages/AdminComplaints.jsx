import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { complaintsAPI, staffAPI } from '../api/client'
import ComplaintCard from '../components/ComplaintCard'
import EmptyState from '../components/EmptyState'
import { Field } from '../components/Field'
import FilterChips from '../components/FilterChips'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import Pagination from '../components/Pagination'
import { ListSkeleton } from '../components/Skeleton'
import useDebounce from '../hooks/useDebounce'
import usePageTitle from '../hooks/usePageTitle'
import { CATEGORIES } from '../utils/categories'

const STATUSES = [['', 'All'], ['pending', 'Pending'], ['in_progress', 'In progress'], ['escalated', 'Escalated'], ['resolved', 'Resolved']]
const EMPTY = { q: '', status: '', category: '', warden: '', date_from: '', date_to: '', sort: 'newest' }

export default function AdminComplaints() {
  usePageTitle('All complaints')
  const [params] = useSearchParams()
  const [filters, setFilters] = useState({ ...EMPTY, status: params.get('status') || '' })
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [wardens, setWardens] = useState([])
  const q = useDebounce(filters.q)

  useEffect(() => {
    staffAPI.list().then(({ data }) => setWardens(data.filter((s) => s.role === 'warden'))).catch(() => {})
  }, [])

  // Any filter change goes back to page 1.
  useEffect(() => setPage(1), [q, filters.status, filters.category, filters.warden, filters.date_from, filters.date_to, filters.sort])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFailed(false)
    const p = {
      page,
      page_size: 15,
      sort: filters.sort,
      q: q || undefined,
      status: filters.status || undefined,
      category: filters.category || undefined,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined
    }
    if (filters.warden === 'unassigned') p.unassigned = true
    else if (filters.warden) p.warden_id = filters.warden

    complaintsAPI
      .search(p)
      .then(({ data }) => !cancelled && setData(data))
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [page, q, filters.status, filters.category, filters.warden, filters.date_from, filters.date_to, filters.sort])

  const set = (patch) => setFilters((f) => ({ ...f, ...patch }))
  const activeCount = ['category', 'warden', 'date_from', 'date_to'].filter((k) => filters[k]).length
  const anyFilter = activeCount > 0 || filters.status || filters.q

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <PageHeader title="All complaints" subtitle="Search and filter across the whole campus" back={{ to: '/admin', label: 'Overview' }} />

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Icon name="search" className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          <input type="search" enterKeyHint="search" aria-label="Search complaints" className="input-field !pl-10" placeholder="Search ticket no., title, location…" value={filters.q} onChange={(e) => set({ q: e.target.value })} />
        </div>
        <button onClick={() => setShowFilters((v) => !v)} className={`btn-secondary shrink-0 ${showFilters || activeCount ? '!border-pine-400 !text-accent' : ''}`} aria-expanded={showFilters}>
          <Icon name="filter" className="h-4 w-4" />
          <span className="hidden min-[400px]:inline">Filters</span>
          {activeCount ? <span className="h-5 min-w-5 px-1 rounded-full bg-pine-500 text-white text-[11px] flex items-center justify-center">{activeCount}</span> : null}
        </button>
      </div>

      <div className="mb-4">
        <FilterChips options={STATUSES} value={filters.status} onChange={(v) => set({ status: v })} label="Filter by status" />
      </div>

      {showFilters && (
        <div className="panel p-4 mb-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          <Field label="Category">
            <select className="input-field" value={filters.category} onChange={(e) => set({ category: e.target.value })}>
              <option value="">Any category</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Warden">
            <select className="input-field" value={filters.warden} onChange={(e) => set({ warden: e.target.value })}>
              <option value="">Anyone</option>
              <option value="unassigned">Unassigned</option>
              {wardens.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({w.handles_category})</option>
              ))}
            </select>
          </Field>
          <Field label="Sort">
            <select className="input-field" value={filters.sort} onChange={(e) => set({ sort: e.target.value })}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </Field>
          <Field label="Filed from">
            <input type="date" className="input-field" value={filters.date_from} onChange={(e) => set({ date_from: e.target.value })} />
          </Field>
          <Field label="Filed until">
            <input type="date" className="input-field" value={filters.date_to} onChange={(e) => set({ date_to: e.target.value })} />
          </Field>
          <div className="flex items-end">
            <button className="btn-ghost w-full sm:w-auto" onClick={() => setFilters(EMPTY)}>Clear all</button>
          </div>
        </div>
      )}

      {loading ? (
        <ListSkeleton rows={5} grid />
      ) : failed ? (
        <EmptyState icon="warning" title="Couldn't load complaints">Check your connection and try again.</EmptyState>
      ) : data.items.length === 0 ? (
        <EmptyState icon="search" title={anyFilter ? 'No matches' : 'No complaints yet'} action={anyFilter ? <button className="btn-secondary" onClick={() => setFilters(EMPTY)}>Clear filters</button> : null}>
          {anyFilter ? 'No complaints match these filters.' : 'Complaints will appear here as students file them.'}
        </EmptyState>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.items.map((c) => (
            <ComplaintCard key={c.id} complaint={c} showWarden showDue />
          ))}
        </div>
      )}

      <Pagination page={page} pages={data.pages} total={data.total} onChange={setPage} />
    </div>
  )
}
