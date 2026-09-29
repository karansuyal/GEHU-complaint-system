import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend } from 'recharts'
import { analyticsAPI, complaintsAPI } from '../api/client'
import ComplaintCard from '../components/ComplaintCard'
import EmptyState from '../components/EmptyState'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import { ListSkeleton, StatSkeletons } from '../components/Skeleton'
import StatTile from '../components/StatTile'
import { useTheme } from '../hooks/useTheme'
import usePageTitle from '../hooks/usePageTitle'
import { categoryLabel } from '../utils/categories'

// Recharts needs literal colours, so pick them per theme here.
const CHART = {
  light: { grid: '#E4E1D8', tick: '#7A786C', filed: '#B8862E', resolved: '#204B3B', bar: '#204B3B', tipBg: '#FFFFFF', tipBorder: '#DEDBD3' },
  dark: { grid: '#2E3C35', tick: '#8D9992', filed: '#D6A24A', resolved: '#6DBB98', bar: '#4A9576', tipBg: '#151D19', tipBorder: '#2E3C35' }
}

const shortDate = (s) => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export default function AdminDashboard() {
  usePageTitle('Campus overview')
  const { resolved } = useTheme()
  const C = CHART[resolved]
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [trend, setTrend] = useState([])
  const [categories, setCategories] = useState([])
  const [resolutionTime, setResolutionTime] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([analyticsAPI.overview(), complaintsAPI.listAll({ limit: 10 }), analyticsAPI.trend(14), analyticsAPI.categoryBreakdown(), analyticsAPI.resolutionTime()])
      .then(([s, c, t, cat, r]) => {
        setStats(s.data)
        setRecent(c.data)
        setTrend(t.data.map((d) => ({ ...d, label: shortDate(d.date) })))
        setCategories(cat.data.map((x) => ({ ...x, label: categoryLabel(x.category) })).sort((a, b) => b.count - a.count))
        setResolutionTime(r.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const cards = [
    { label: 'Total complaints', value: stats?.total },
    { label: 'Pending', value: stats?.pending },
    { label: 'Escalated', value: stats?.escalated, tone: 'warn' },
    { label: 'Unassigned', value: stats?.unassigned, tone: 'warn' },
    { label: 'Resolved (30 days)', value: stats?.resolved_30d, tone: 'good' },
    { label: 'Avg. resolution time', value: resolutionTime?.avg_hours != null ? `${resolutionTime.avg_hours}h` : null },
    { label: 'Reopened', value: stats?.reopened },
    { label: 'Avg. rating', value: stats?.avg_rating != null ? `${stats.avg_rating} / 5` : null }
  ]
  const tip = { fontSize: 12, borderRadius: 6, border: `1px solid ${C.tipBorder}`, background: C.tipBg, color: resolved === 'dark' ? '#E9EEEA' : '#17211D' }
  const axis = { fontSize: 11, fill: C.tick }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <PageHeader
        title="Campus overview"
        subtitle="GEHU Bhimtal Campus · all categories"
        actions={
          <>
            <Link to="/admin/complaints" className="btn-secondary">
              <Icon name="search" className="h-4 w-4" /> All complaints
            </Link>
            <Link to="/admin/staff" className="btn-secondary">
              <Icon name="people" className="h-4 w-4" /> Staff
            </Link>
          </>
        }
      />

      {stats?.escalated > 0 && (
        <Link to="/admin/complaints?status=escalated" className="flex items-center gap-3 bg-rust-50 border border-rust-100 rounded-md p-3.5 text-sm text-rust-600 mb-6 hover:brightness-95">
          <Icon name="warning" className="h-5 w-5 shrink-0" />
          <span className="flex-1">
            <strong>{stats.escalated}</strong> complaint{stats.escalated > 1 ? 's have' : ' has'} crossed the SLA and been auto-escalated. Review now.
          </span>
          <Icon name="chevronRight" className="h-4 w-4 shrink-0" />
        </Link>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {loading ? <StatSkeletons count={8} /> : cards.map((c) => <StatTile key={c.label} label={c.label} value={c.value ?? '—'} tone={c.tone} />)}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-10">
        <section className="panel p-4 sm:p-5" aria-labelledby="trend-h">
          <h2 id="trend-h" className="text-sm font-medium text-ink-soft mb-4">Filed vs resolved, last 14 days</h2>
          {trend.length === 0 ? (
            <p className="text-sm text-ink-faint text-center py-12">Not enough data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="filed" name="Filed" stroke={C.filed} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke={C.resolved} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="panel p-4 sm:p-5" aria-labelledby="cat-h">
          <h2 id="cat-h" className="text-sm font-medium text-ink-soft mb-4">Complaints by category</h2>
          {categories.length === 0 ? (
            <p className="text-sm text-ink-faint text-center py-12">Not enough data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, categories.length * 40 + 20)}>
              <BarChart data={categories} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={86} tick={axis} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tip} cursor={{ fill: C.grid, opacity: 0.4 }} />
                <Bar dataKey="count" name="Complaints" fill={C.bar} radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl text-ink">Recent complaints</h2>
        <Link to="/admin/complaints" className="text-sm text-accent font-medium hover:underline">
          View all
        </Link>
      </div>
      {loading ? (
        <ListSkeleton rows={4} grid />
      ) : recent.length === 0 ? (
        <EmptyState icon="inbox" title="No complaints yet">New complaints from students will show up here.</EmptyState>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {recent.map((c) => (
            <ComplaintCard key={c.id} complaint={c} showWarden showDue />
          ))}
        </div>
      )}
    </div>
  )
}
