import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend
} from 'recharts'
import { analyticsAPI, complaintsAPI } from '../api/client'
import ComplaintCard from '../components/ComplaintCard'

const CATEGORY_LABELS = {
  maintenance: 'Maintenance',
  mess: 'Mess',
  wifi: 'Wifi',
  cleanliness: 'Cleanliness',
  security: 'Security',
  ragging: 'Ragging'
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [trend, setTrend] = useState([])
  const [categories, setCategories] = useState([])
  const [resolutionTime, setResolutionTime] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      analyticsAPI.overview(),
      complaintsAPI.listAll({ limit: 10 }),
      analyticsAPI.trend(14),
      analyticsAPI.categoryBreakdown(),
      analyticsAPI.resolutionTime()
    ])
      .then(([s, c, t, cat, r]) => {
        setStats(s.data)
        setRecent(c.data)
        setTrend(t.data.map((d) => ({ ...d, label: formatShortDate(d.date) })))
        setCategories(cat.data.map((c) => ({ ...c, label: CATEGORY_LABELS[c.category] || c.category })))
        setResolutionTime(r.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const cards = [
    { label: 'Total complaints', value: stats?.total ?? '—' },
    { label: 'Pending', value: stats?.pending ?? '—' },
    { label: 'Escalated', value: stats?.escalated ?? '—', warn: true },
    { label: 'Unassigned', value: stats?.unassigned ?? '—', warn: true },
    { label: 'Resolved (30d)', value: stats?.resolved_30d ?? '—' },
    {
      label: 'Avg. resolution',
      value: resolutionTime?.avg_hours != null ? `${resolutionTime.avg_hours}h` : '—'
    },
    { label: 'Reopened', value: stats?.reopened ?? '—' },
    { label: 'Avg. rating', value: stats?.avg_rating != null ? `${stats.avg_rating} / 5` : '—' }
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <p className="text-xs uppercase tracking-wide text-ink-faint mb-1">Admin</p>
      <h1 className="font-display text-2xl text-ink mb-1">Campus overview</h1>
      <p className="text-sm text-ink-faint mb-5">GEHU Bhimtal Campus · all categories</p>

      <div className="flex gap-2 mb-6">
        <Link to="/admin/complaints" className="btn-secondary flex-1 sm:flex-none">
          Search all complaints
        </Link>
        <Link to="/admin/staff" className="btn-secondary flex-1 sm:flex-none">
          Manage staff
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {cards.map((c) => (
          <div key={c.label} className={`panel p-4 ${c.warn && Number(c.value) > 0 ? 'border-rust-100 bg-rust-50' : ''}`}>
            <p className={`font-display text-2xl ${c.warn && Number(c.value) > 0 ? 'text-rust-600' : 'text-ink'}`}>
              {c.value}
            </p>
            <p className="text-xs mt-1 text-ink-faint">{c.label}</p>
          </div>
        ))}
      </div>

      {stats?.escalated > 0 && (
        <div className="bg-rust-50 border border-rust-100 rounded-md p-3 text-sm text-rust-600 mb-6 flex gap-2">
          <span className="shrink-0">⚠️</span>
          <span>
            {stats.escalated} complaint(s) have crossed SLA and been auto-escalated. Review immediately.
          </span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="panel p-4">
          <h2 className="text-sm font-medium text-ink-soft mb-3">Last 14 days</h2>
          {trend.length === 0 ? (
            <p className="text-sm text-ink-faint text-center py-10">Not enough data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E1D8" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8C8A7E' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8C8A7E' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #DEDBD3' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="filed" name="Filed" stroke="#B8862E" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#204B3B" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="panel p-4">
          <h2 className="text-sm font-medium text-ink-soft mb-3">By category</h2>
          {categories.length === 0 ? (
            <p className="text-sm text-ink-faint text-center py-10">Not enough data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categories} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E1D8" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8C8A7E' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8C8A7E' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #DEDBD3' }} />
                <Bar dataKey="count" name="Complaints" fill="#204B3B" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-ink-soft">Recent complaints</h2>
        <Link to="/admin/complaints" className="text-sm text-pine-500 font-medium hover:underline">
          View all
        </Link>
      </div>
      {loading ? (
        <p className="text-sm text-ink-faint text-center py-10">Loading…</p>
      ) : recent.length === 0 ? (
        <div className="panel border-dashed p-12 text-center text-ink-soft text-sm">No complaints yet.</div>
      ) : (
        <div className="space-y-3">
          {recent.map((c) => (
            <ComplaintCard key={c.id} complaint={c} showWarden onClick={() => navigate(`/complaints/${c.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}
