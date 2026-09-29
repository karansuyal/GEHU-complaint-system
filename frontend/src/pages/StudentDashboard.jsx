import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { complaintsAPI } from '../api/client'
import { useAuth } from '../context/AuthContext'
import ComplaintCard from '../components/ComplaintCard'
import EmptyState from '../components/EmptyState'
import FilterChips from '../components/FilterChips'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { ListSkeleton } from '../components/Skeleton'
import StatTile from '../components/StatTile'
import usePageTitle from '../hooks/usePageTitle'

const FILTERS = [
  ['all', 'All'],
  ['pending', 'Pending'],
  ['in_progress', 'In progress'],
  ['escalated', 'Escalated'],
  ['resolved', 'Resolved']
]

export default function StudentDashboard() {
  usePageTitle('My complaints')
  const { user } = useAuth()
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
  // Escalated is only worth a chip when there is one.
  const filters = FILTERS.filter(([k]) => k !== 'escalated' || counts.escalated > 0)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <PageHeader
        title={`Hi ${user?.name?.split(' ')[0] || 'there'}, here's where things stand`}
        subtitle="Your complaints and their latest status"
        actions={
          <Link to="/complaints/new" className="btn-primary">
            <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} /> File a complaint
          </Link>
        }
      />

      {!loading && complaints.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatTile label="Total filed" value={counts.all} />
          <StatTile label="Pending" value={counts.pending} />
          <StatTile label="In progress" value={counts.in_progress} />
          <StatTile label="Resolved" value={counts.resolved} tone="good" />
        </div>
      )}

      <div className="mb-5">
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
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((c) => (
            <ComplaintCard key={c.id} complaint={c} />
          ))}
        </div>
      )}
    </div>
  )
}
