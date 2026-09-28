import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { complaintsAPI } from '../api/client'

const CATEGORIES = [
  { value: 'maintenance', label: 'Maintenance', hint: 'Electricity, water, room repair', icon: '🔧' },
  { value: 'mess', label: 'Mess / Food', hint: 'Food quality, hygiene, timing', icon: '🍽️' },
  { value: 'wifi', label: 'Wifi / Internet', hint: 'Connectivity, speed, outages', icon: '📶' },
  { value: 'cleanliness', label: 'Cleanliness', hint: 'Common areas, washrooms', icon: '🧹' },
  { value: 'security', label: 'Security', hint: 'Access, safety concerns', icon: '🛡️' },
  { value: 'ragging', label: 'Ragging / Discipline', hint: 'Routed to admin, always anonymous', icon: '🚨' }
]

export default function NewComplaint() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    category: '',
    title: '',
    description: '',
    location: '',
    is_anonymous: false
  })
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(false)

  const isRagging = form.category === 'ragging'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      // Ragging complaints are always forced anonymous + routed directly to
      // the campus admin / anti-ragging cell, bypassing the warden entirely.
      if (isRagging) fd.set('is_anonymous', 'true')
      if (photo) fd.append('photo', photo)

      const { data } = await complaintsAPI.create(fd)
      toast.success(`Complaint filed. Ticket ${data.ticket_id}`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not submit complaint.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <p className="text-xs uppercase tracking-wide text-ink-faint mb-1">New entry</p>
      <h1 className="font-display text-2xl text-ink mb-1">File a complaint</h1>
      <p className="text-sm text-ink-faint mb-6">GEHU Bhimtal Campus</p>

      <form onSubmit={handleSubmit} className="panel p-6 space-y-5">
        <div>
          <label className="field-label mb-2">Category</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.value}
                onClick={() => setForm({ ...form, category: c.value })}
                className={`text-left px-3 py-2.5 rounded-md border text-sm transition-colors ${
                  form.category === c.value
                    ? 'border-pine-500 bg-pine-50 text-pine-600'
                    : 'border-stone-300 hover:border-ink/30'
                }`}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <span>{c.icon}</span>
                  {c.label}
                </span>
                <span className="block text-xs text-ink-faint mt-0.5">{c.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {isRagging && (
          <div className="bg-rust-50 border border-rust-100 rounded-md p-3 text-sm text-rust-600 flex gap-2">
            <span className="shrink-0">🔒</span>
            <span>
              This complaint will be submitted <strong>anonymously</strong> and sent{' '}
              <strong>directly to the campus admin / anti-ragging committee</strong> — your
              hostel warden will not see it or be notified.
            </span>
          </div>
        )}

        <div>
          <label className="field-label">Title</label>
          <input
            required
            placeholder="Short summary, e.g. 'No water supply in Block C, 2nd floor'"
            className="input-field"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div>
          <label className="field-label">Description</label>
          <textarea
            required
            rows={4}
            placeholder="Describe the issue in detail…"
            className="input-field resize-none"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div>
          <label className="field-label">Location</label>
          <input
            required
            placeholder="e.g. Hostel Block C, Room 214"
            className="input-field"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>

        <div>
          <label className="field-label">Photo evidence (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files[0])}
            className="text-sm text-ink-soft file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-stone-300 file:bg-white file:text-ink-soft file:text-sm file:font-medium"
          />
        </div>

        {!isRagging && (
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={form.is_anonymous}
              onChange={(e) => setForm({ ...form, is_anonymous: e.target.checked })}
              className="rounded border-stone-300 text-pine-500 focus:ring-pine-500"
            />
            Submit anonymously
          </label>
        )}

        <button type="submit" disabled={loading || !form.category} className="btn-primary w-full">
          {loading ? 'Submitting…' : 'Submit complaint'}
        </button>
      </form>
    </div>
  )
}
