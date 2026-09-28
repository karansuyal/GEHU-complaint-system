import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { complaintsAPI } from '../api/client'
import ComplaintCard from '../components/ComplaintCard'

export default function StudentDashboard() {
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    complaintsAPI
      .listMine()
      .then(({ data }) => setComplaints(data))
      .catch(() => setComplaints([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered =
    filter === 'all' ? complaints : complaints.filter((c) => c.status === filter)

  const counts = {
    all: complaints.length,
    pending: complaints.filter((c) => c.status === 'pending').length,
    in_progress: complaints.filter((c) => c.status === 'in_progress').length,
    resolved: complaints.filter((c) => c.status === 'resolved').length
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-start sm:items-center justify-between gap-4 mb-7 flex-col sm:flex-row">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-faint mb-1">Student Dashboard</p>
          <h1 className="font-display text-2xl text-ink">My complaints</h1>
        </div>
        <Link to="/complaints/new" className="btn-primary w-full sm:w-auto">
          File a complaint
        </Link>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {[
          ['all', 'All'],
          ['pending', 'Pending'],
          ['in_progress', 'In progress'],
          ['resolved', 'Resolved']
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-sm text-sm whitespace-nowrap border transition-colors ${
              filter === key
                ? 'bg-pine-500 text-paper border-pine-500'
                : 'bg-white text-ink-soft border-stone-300 hover:border-ink/30'
            }`}
          >
            {label} <span className="opacity-70">({counts[key] ?? 0})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-ink-faint text-center py-14">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="panel border-dashed p-12 text-center">
          <p className="text-ink-soft text-sm">No complaints here yet.</p>
          <Link to="/complaints/new" className="text-pine-500 text-sm font-medium hover:underline mt-2 inline-block">
            File your first complaint
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <ComplaintCard key={c.id} complaint={c} onClick={() => navigate(`/complaints/${c.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}
