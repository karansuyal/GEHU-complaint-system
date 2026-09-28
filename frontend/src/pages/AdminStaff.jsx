import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { staffAPI } from '../api/client'
import Sheet from '../components/Sheet'
import StarRating from '../components/StarRating'
import { parseServerDate } from '../utils/date'

// Wardens can never take 'ragging' - it always goes to the admin.
const WARDEN_CATEGORIES = ['maintenance', 'mess', 'wifi', 'cleanliness', 'security']
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '')

const BLANK = { name: '', email: '', password: '', role: 'warden', handles_category: 'maintenance', hostel_block: '' }

function isOnline(lastSeen) {
  const d = parseServerDate(lastSeen)
  return d ? Date.now() - d.getTime() < 90000 : false
}

function errText(err, fallback) {
  const d = err.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d) && d[0]?.msg) return d[0].msg
  return fallback
}

export default function AdminStaff() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState(null)
  const [edit, setEdit] = useState({})
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () =>
    staffAPI
      .list()
      .then(({ data }) => setStaff(data))
      .catch(() => toast.error('Could not load staff'))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  const create = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await staffAPI.create({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        handles_category: form.role === 'warden' ? form.handles_category : null,
        hostel_block: form.hostel_block.trim() || null
      })
      toast.success(`${form.role === 'warden' ? 'Warden' : 'Admin'} account created`)
      setAdding(false)
      setForm(BLANK)
      load()
    } catch (err) {
      toast.error(errText(err, 'Could not create the account'))
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (s) => {
    setEditing(s)
    setEdit({ name: s.name, hostel_block: s.hostel_block || '', handles_category: s.handles_category || '' })
    setNewPassword('')
  }

  const save = async () => {
    setSaving(true)
    try {
      const patch = { name: edit.name, hostel_block: edit.hostel_block }
      if (editing.role === 'warden') patch.handles_category = edit.handles_category
      await staffAPI.update(editing.id, patch)
      toast.success('Saved')
      setEditing(null)
      load()
    } catch (err) {
      toast.error(errText(err, 'Could not save changes'))
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async () => {
    const next = !editing.is_active
    const verb = next ? 'Reactivate' : 'Deactivate'
    const warn =
      !next && editing.role === 'warden' && editing.open_complaints > 0
        ? `\n\nTheir ${editing.open_complaints} open complaint(s) will move to another warden in the same category, or become unassigned.`
        : ''
    if (!window.confirm(`${verb} ${editing.name}?${warn}`)) return
    setSaving(true)
    try {
      await staffAPI.update(editing.id, { is_active: next })
      toast.success(next ? 'Account reactivated' : 'Account deactivated')
      setEditing(null)
      load()
    } catch (err) {
      toast.error(errText(err, 'Could not update the account'))
    } finally {
      setSaving(false)
    }
  }

  const resetPassword = async () => {
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters')
    setSaving(true)
    try {
      await staffAPI.resetPassword(editing.id, newPassword)
      toast.success('Password updated')
      setNewPassword('')
    } catch (err) {
      toast.error(errText(err, 'Could not reset the password'))
    } finally {
      setSaving(false)
    }
  }

  const wardens = staff.filter((s) => s.role === 'warden')
  const admins = staff.filter((s) => s.role === 'admin')

  const renderRow = (s) => (
    <button
      key={s.id}
      onClick={() => openEdit(s)}
      className={`panel w-full text-left p-4 hover:border-pine-400 transition-colors ${s.is_active ? '' : 'opacity-60'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-ink truncate flex items-center gap-2">
            {s.name}
            {isOnline(s.last_seen) && (
              <span className="h-1.5 w-1.5 rounded-full bg-pine-500 shrink-0" title="Online now" />
            )}
          </p>
          <p className="text-xs text-ink-faint truncate mt-0.5">{s.email}</p>
        </div>
        <span className="status-tag bg-stone-100 text-ink-soft border-stone-300 shrink-0">
          {s.role === 'warden' ? cap(s.handles_category) : 'Admin'}
          {!s.is_active && ' · Inactive'}
        </span>
      </div>
      {s.role === 'warden' && (
        <div className="flex items-center gap-4 mt-3 text-xs text-ink-soft">
          <span>
            <strong className="text-ink">{s.open_complaints}</strong> open
          </span>
          <span>
            <strong className="text-ink">{s.resolved_complaints}</strong> resolved
          </span>
          {s.avg_rating != null && (
            <span className="flex items-center gap-1">
              <StarRating value={Math.round(s.avg_rating)} size="sm" />
              {s.avg_rating}
            </span>
          )}
        </div>
      )}
    </button>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/admin" className="text-sm text-pine-500 hover:underline">
        ← Overview
      </Link>
      <div className="flex items-center justify-between gap-3 mt-3 mb-6">
        <div>
          <h1 className="font-display text-2xl text-ink">Staff</h1>
          <p className="text-sm text-ink-faint">Wardens and admins for the campus</p>
        </div>
        <button className="btn-primary" onClick={() => setAdding(true)}>
          Add staff
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-ink-faint text-center py-14">Loading…</p>
      ) : (
        <>
          <h2 className="text-sm font-medium text-ink-soft mb-3">Wardens ({wardens.length})</h2>
          {wardens.length === 0 ? (
            <div className="panel border-dashed p-10 text-center text-sm text-ink-soft mb-8">
              No wardens yet. Without one, new complaints in that category go straight to admins.
            </div>
          ) : (
            <div className="space-y-3 mb-8">
              {wardens.map(renderRow)}
            </div>
          )}
          <h2 className="text-sm font-medium text-ink-soft mb-3">Admins ({admins.length})</h2>
          <div className="space-y-3">
            {admins.map(renderRow)}
          </div>
        </>
      )}

      {/* Add staff */}
      <Sheet open={adding} onClose={() => setAdding(false)} title="Add staff member">
        <form onSubmit={create} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {['warden', 'admin'].map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setForm({ ...form, role: r })}
                className={`px-3 py-2.5 rounded-md border text-sm font-medium transition-colors ${
                  form.role === r ? 'border-pine-500 bg-pine-50 text-pine-600' : 'border-stone-300 text-ink-soft'
                }`}
              >
                {cap(r)}
              </button>
            ))}
          </div>
          <div>
            <label className="field-label">Full name</label>
            <input required className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Email</label>
            <input type="email" required className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          {form.role === 'warden' && (
            <>
              <div>
                <label className="field-label">Handles category</label>
                <select className="input-field" value={form.handles_category} onChange={(e) => setForm({ ...form, handles_category: e.target.value })}>
                  {WARDEN_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {cap(c)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-ink-faint mt-1">Ragging complaints always go to admins, never to a warden.</p>
              </div>
              <div>
                <label className="field-label">Hostel block (optional)</label>
                <input className="input-field" value={form.hostel_block} onChange={(e) => setForm({ ...form, hostel_block: e.target.value })} />
              </div>
            </>
          )}
          <div>
            <label className="field-label">Temporary password</label>
            <input type="password" required minLength={8} autoComplete="new-password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <p className="text-xs text-ink-faint mt-1">Share it securely — they can change it later via “Forgot password”.</p>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Creating…' : 'Create account'}
          </button>
        </form>
      </Sheet>

      {/* Edit staff */}
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing ? editing.name : ''}>
        {editing && (
          <div className="space-y-4">
            <p className="text-xs text-ink-faint -mt-1">{editing.email}</p>
            <div>
              <label className="field-label">Full name</label>
              <input className="input-field" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </div>
            {editing.role === 'warden' && (
              <>
                <div>
                  <label className="field-label">Handles category</label>
                  <select className="input-field" value={edit.handles_category} onChange={(e) => setEdit({ ...edit, handles_category: e.target.value })}>
                    {WARDEN_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {cap(c)}
                      </option>
                    ))}
                  </select>
                  {edit.handles_category !== editing.handles_category && (
                    <p className="text-xs text-brass-600 mt-1">
                      Open complaints outside the new category will be moved to another warden (or unassigned).
                    </p>
                  )}
                </div>
                <div>
                  <label className="field-label">Hostel block</label>
                  <input className="input-field" value={edit.hostel_block} onChange={(e) => setEdit({ ...edit, hostel_block: e.target.value })} />
                </div>
              </>
            )}
            <button onClick={save} disabled={saving} className="btn-primary w-full">
              Save changes
            </button>

            <div className="pt-4 border-t border-stone-200">
              <label className="field-label">Set a new password</label>
              <div className="flex gap-2">
                <input type="password" autoComplete="new-password" placeholder="Min. 8 characters" className="input-field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <button onClick={resetPassword} disabled={saving || !newPassword} className="btn-secondary shrink-0">
                  Update
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200">
              <button
                onClick={toggleActive}
                disabled={saving}
                className={`w-full py-2.5 rounded-md text-sm font-medium border transition-colors ${
                  editing.is_active
                    ? 'border-rust-100 text-rust-600 hover:bg-rust-50'
                    : 'border-pine-100 text-pine-600 hover:bg-pine-50'
                }`}
              >
                {editing.is_active ? 'Deactivate account' : 'Reactivate account'}
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
