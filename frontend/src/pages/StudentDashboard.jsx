import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { complaintsAPI } from '../api/client'
import { useAuth } from '../context/AuthContext'
import ComplaintCard from '../components/ComplaintCard'
import EmptyState from '../components/EmptyState'
import FilterChips from '../components/FilterChips'
import HeroBanner, { HeroButton } from '../components/HeroBanner'
import Icon from '../components/Icon'
import ProgressRing from '../components/ProgressRing'
import { ListSkeleton } from '../components/Skeleton'
import StatTile from '../components/StatTile'
import useGreeting from '../hooks/useGreeting'
import usePageTitle from '../hooks/usePageTitle'
import { CATEGORIES } from '../utils/categories'
import { parseServerDate } from '../utils/date'

const FILTERS = [
  ['all', 'All'],
  ['pending', 'Pending'],
  ['in_progress', 'In progress'],
  ['escalated', 'Escalated'],
  ['resolved', 'Resolved']
]

// Filed-per-day for the last 7 days, oldest first (feeds the sparkline).
function weekSpark(list) {
  const out = Array(7).fill(0)
  const today = new Date().setHours(0, 0, 0, 0)
  list.forEach((c) => {
    const d = parseServerDate(c.created_at)
    if (!d) return
    const diff = Math.round((today - new Date(d).setHours(0, 0, 0, 0)) / 86400000)
    if (diff >= 0 && diff < 7) out[6 - diff] += 1
  })
  return out
}

export default function StudentDashboard() {
  usePageTitle('My complaints')
  const { user } = useAuth()
  const greeting = useGreeting()
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState('all')

  const load = () => {
    setLoading(true)
    setFailed(false)
    complaintsAPI
      .listMine()
      .then(({ data }) => setComplaints(data))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = filter === 'all' ? complaints : complaints.filter((c) => c.status === filter)
  const count = (s) => complaints.filter((c) => c.status === s).length
  const counts = { all: complaints.length, pending: count('pending'), in_progress: count('in_progress'), escalated: count('escalated'), resolved: count('resolved') }
  const filters = FILTERS.filter(([k]) => k !== 'escalated' || counts.escalated > 0)
  const open = counts.pending + counts.in_progress + counts.escalated
  const resolvedPct = counts.all ? (counts.resolved / counts.all) * 100 : 0
  const spark = useMemo(() => weekSpark(complaints), [complaints])
  const first = user?.name?.split(' ')[0] || 'there'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
      <HeroBanner
        eyebrow={greeting}
        title={`${first} 👋`}
        subtitle={loading ? 'Loading your complaints…' : open > 0 ? `${open} complaint${open > 1 ? 's are' : ' is'} being worked on right now.` : counts.all ? 'Everything you filed is resolved. Nice!' : 'Something wrong on campus? File it here and track it live.'}
        aside={counts.all > 0 ? <ProgressRing value={resolvedPct} label="resolved" size={84} /> : null}
      >
        <HeroButton as={Link} to="/complaints/new" primary>
          <Icon name="plus" className="h-4 w-4" strokeWidth={2.4} /> File a complaint
        </HeroButton>
        {counts.escalated > 0 && (
          <HeroButton type="button" onClick={() => setFilter('escalated')}>
            <Icon name="warning" className="h-4 w-4" /> {counts.escalated} escalated
          </HeroButton>
        )}
      </HeroBanner>

      {!loading && complaints.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 stagger">
          <div style={{ '--i': 0 }}><StatTile icon="clipboard" label="Total filed" value={counts.all} spark={spark} hint="last 7 days" /></div>
          <div style={{ '--i': 1 }}><StatTile icon="clock" tone="brass" label="Pending" value={counts.pending} /></div>
          <div style={{ '--i': 2 }}><StatTile icon="refresh" tone="info" label="In progress" value={counts.in_progress} /></div>
          <div style={{ '--i': 3 }}><StatTile icon="checkCircle" tone="good" label="Resolved" value={counts.resolved} /></div>
        </div>
      )}

      {complaints.length === 0 && !loading && !failed && (
        <section className="mb-6" aria-label="Quick categories">
          <h2 className="text-sm font-semibold text-ink-soft mb-3">What do you need help with?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 stagger">
            {CATEGORIES.map((c, i) => (
              <Link key={c.value} to={`/complaints/new?category=${c.value}`} style={{ '--i': i }} className="panel panel-hover p-4 flex flex-col gap-3">
                <span className="stat-icon bg-pine-50 text-pine-600"><Icon name={c.icon} className="h-[18px] w-[18px]" /></span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{c.label}</span>
                  <span className="block text-[11px] text-ink-faint mt-0.5 leading-snug">{c.hint}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl text-ink">Your complaints</h2>
        {!loading && !failed && (
          <button onClick={load} className="btn-ghost !min-h-[40px]" aria-label="Refresh">
            <Icon name="refresh" className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mb-4 sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 -mx-4 px-4 sm:mx-0 sm:px-0 py-2 glass">
        <FilterChips options={filters} value={filter} onChange={setFilter} counts={counts} label="Filter by status" />
      </div>

      {loading ? (
        <ListSkeleton rows={4} grid />
      ) : failed ? (
        <EmptyState icon="warning" title="Couldn't load your complaints" action={<button className="btn-secondary" onClick={load}>Try again</button>}>
          Check your connection and try again.
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="clipboard"
          title={filter === 'all' ? 'No complaints yet' : 'Nothing here'}
          action={filter === 'all' ? <Link to="/complaints/new" className="btn-primary">File your first complaint</Link> : <button className="btn-secondary" onClick={() => setFilter('all')}>Show all</button>}
        >
          {filter === 'all' ? 'When something on campus needs fixing, file it here and track it to the end.' : 'No complaints have this status.'}
        </EmptyState>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 stagger">
          {filtered.map((c, i) => (
            <div key={c.id} style={{ '--i': Math.min(i, 8) }}>
              <ComplaintCard complaint={c} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
