import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { staffAPI } from '../api/client'
import Avatar from '../components/Avatar'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import { Field, PasswordInput, StrengthMeter } from '../components/Field'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import Sheet from '../components/Sheet'
import { ListSkeleton } from '../components/Skeleton'
import SegmentedControl from '../components/SegmentedControl'
import StarRating from '../components/StarRating'
import usePageTitle from '../hooks/usePageTitle'
import { WARDEN_CATEGORIES, categoryLabel } from '../utils/categories'
import { parseServerDate } from '../utils/date'

const BLANK = { name: '', email: '', password: '', role: 'warden', handles_category: 'maintenance', hostel_block: '' }

const isOnline = (lastSeen) => {
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
  usePageTitle('Staff')
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState(null)
  const [edit, setEdit] = useState({})
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmToggle, setConfirmToggle] = useState(false)

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
      toast.success(`${form.role === 'warden' ? 'Warden' : 'Admin'} account created. They've been emailed.`)
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
    setSaving(true)
    try {
      await staffAPI.update(editing.id, { is_active: next })
      toast.success(next ? 'Account reactivated' : 'Account deactivated')
      setConfirmToggle(false)
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
      toast.success('Password updated. They were notified by email.')
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
    <li key={s.id}>
      <button onClick={() => openEdit(s)} className={`panel panel-hover w-full text-left p-4 ${s.is_active ? '' : 'opacity-60'}`}>
        <span className="flex items-start gap-3">
          <span className="relative">
            <Avatar name={s.name} />
            {isOnline(s.last_seen) && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-pine-400 ring-2 ring-surface" title="Online now" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-ink truncate">{s.name}</span>
            <span className="block text-xs text-ink-faint truncate mt-0.5">{s.email}</span>
          </span>
          <span className="status-tag bg-stone-100 text-ink-soft border-stone-300 shrink-0">
            {s.role === 'warden' ? categoryLabel(s.handles_category) : 'Admin'}
            {!s.is_active && ' · Inactive'}
          </span>
        </span>
        {s.role === 'warden' && (
          <span className="flex items-center gap-4 mt-3 pt-3 border-t border-stone-200 text-xs text-ink-soft flex-wrap">
            <span><strong className="text-ink">{s.open_complaints}</strong> open</span>
            <span><strong className="text-ink">{s.resolved_complaints}</strong> resolved</span>
            {s.avg_rating != null && (
              <span className="flex items-center gap-1">
                <StarRating value={Math.round(s.avg_rating)} size="sm" /> {s.avg_rating}
              </span>
            )}
          </span>
        )}
      </button>
    </li>
  )

  const warn = editing && editing.is_active && editing.role === 'warden' && editing.open_complaints > 0

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <PageHeader
        title="Staff"
        subtitle="Wardens and admins for the campus"
        back={{ to: '/admin', label: 'Overview' }}
        actions={
          <button className="btn-primary" onClick={() => setAdding(true)}>
            <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} /> Add staff
          </button>
        }
      />

      {loading ? (
        <ListSkeleton rows={4} grid />
      ) : (
        <>
          <h2 className="text-sm font-medium text-ink-soft mb-3">Wardens ({wardens.length})</h2>
          {wardens.length === 0 ? (
            <div className="mb-8">
              <EmptyState icon="people" title="No wardens yet" action={<button className="btn-primary" onClick={() => setAdding(true)}>Add a warden</button>}>
                Without one, new complaints in that category go straight to admins.
              </EmptyState>
            </div>
          ) : (
            <ul className="grid md:grid-cols-2 gap-3 mb-8">{wardens.map(renderRow)}</ul>
          )}
          <h2 className="text-sm font-medium text-ink-soft mb-3">Admins ({admins.length})</h2>
          <ul className="grid md:grid-cols-2 gap-3">{admins.map(renderRow)}</ul>
        </>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add staff member">
        <form onSubmit={create} className="space-y-4">
          <SegmentedControl label="Role" value={form.role} onChange={(role) => setForm({ ...form, role })} options={[['warden', 'Warden'], ['admin', 'Admin']]} />
          <Field label="Full name">
            <input required autoCapitalize="words" className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <input type="email" required inputMode="email" autoCapitalize="none" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          {form.role === 'warden' && (
            <>
              <Field label="Handles category" hint="Ragging complaints always go to admins, never to a warden.">
                <select className="input-field" value={form.handles_category} onChange={(e) => setForm({ ...form, handles_category: e.target.value })}>
                  {WARDEN_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Hostel block (optional)">
                <input className="input-field" value={form.hostel_block} onChange={(e) => setForm({ ...form, hostel_block: e.target.value })} />
              </Field>
            </>
          )}
          <div>
            <Field label="Temporary password" hint="Share it securely. We'll email them a welcome note (without the password) and they can change it via “Forgot password”.">
              <PasswordInput required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <StrengthMeter password={form.password} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Creating…' : 'Create account'}
          </button>
        </form>
      </Sheet>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing ? editing.name : ''}>
        {editing && (
          <div className="space-y-4">
            <p className="text-xs text-ink-faint -mt-1 break-all">{editing.email}</p>
            <Field label="Full name">
              <input className="input-field" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </Field>
            {editing.role === 'warden' && (
              <>
                <Field label="Handles category" hint={edit.handles_category !== editing.handles_category ? 'Open complaints outside the new category will be moved to another warden (or unassigned).' : undefined}>
                  <select className="input-field" value={edit.handles_category} onChange={(e) => setEdit({ ...edit, handles_category: e.target.value })}>
                    {WARDEN_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Hostel block">
                  <input className="input-field" value={edit.hostel_block} onChange={(e) => setEdit({ ...edit, hostel_block: e.target.value })} />
                </Field>
              </>
            )}
            <button onClick={save} disabled={saving} className="btn-primary w-full">Save changes</button>

            <div className="pt-4 border-t border-stone-200">
              <Field label="Set a new password">
                <div className="flex gap-2">
                  <PasswordInput autoComplete="new-password" placeholder="Min. 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <button onClick={resetPassword} disabled={saving || !newPassword} className="btn-secondary shrink-0">Update</button>
                </div>
              </Field>
            </div>

            <div className="pt-4 border-t border-stone-200">
              <button onClick={() => setConfirmToggle(true)} disabled={saving} className={`w-full ${editing.is_active ? 'btn-danger' : 'btn-secondary'}`}>
                {editing.is_active ? 'Deactivate account' : 'Reactivate account'}
              </button>
            </div>
          </div>
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmToggle}
        onClose={() => setConfirmToggle(false)}
        onConfirm={toggleActive}
        busy={saving}
        danger={editing?.is_active}
        title={editing?.is_active ? `Deactivate ${editing?.name}?` : `Reactivate ${editing?.name}?`}
        confirmLabel={editing?.is_active ? 'Deactivate' : 'Reactivate'}
      >
        {editing?.is_active ? (
          <>
            They won't be able to sign in. Their history stays for the audit trail.
            {warn && <> Their {editing.open_complaints} open complaint{editing.open_complaints > 1 ? 's' : ''} will move to another warden in the same category, or become unassigned.</>}
          </>
        ) : (
          'They will be able to sign in again.'
        )}
      </ConfirmDialog>
    </div>
  )
}
