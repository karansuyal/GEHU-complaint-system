import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { complaintsAPI } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Field } from '../components/Field'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import usePageTitle from '../hooks/usePageTitle'
import { CATEGORIES } from '../utils/categories'
import { MAX_PHOTO_MB, compressImage, formatBytes } from '../utils/image'

const DRAFT_KEY = 'gehu_complaint_draft'
const BLANK = { category: '', title: '', description: '', location: '', is_anonymous: false }

const loadDraft = () => {
  try {
    return { ...BLANK, ...JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') }
  } catch {
    return BLANK
  }
}

export default function NewComplaint() {
  usePageTitle('File a complaint')
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState(() => {
    const d = loadDraft()
    return { ...d, location: d.location || user?.hostel_block || '' }
  })
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef(null)
  const isRagging = form.category === 'ragging'
  const hasDraft = !!(form.title || form.description)

  // Autosave: a dropped connection or accidental back-swipe shouldn't lose a long description.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
      } catch {
        /* storage full / private mode */
      }
    }, 400)
    return () => clearTimeout(t)
  }, [form])

  useEffect(() => {
    if (!photo) return setPreview(null)
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const pickPhoto = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file.')
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) return toast.error(`That photo is over ${MAX_PHOTO_MB} MB.`)
    const small = await compressImage(file)
    setPhoto(small)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, typeof v === 'string' ? v.trim() : v))
      // Ragging complaints are always forced anonymous and routed directly to
      // the campus admin / anti-ragging cell, bypassing the warden entirely.
      if (isRagging) fd.set('is_anonymous', 'true')
      if (photo) fd.append('photo', photo)

      const { data } = await complaintsAPI.create(fd)
      try {
        localStorage.removeItem(DRAFT_KEY)
      } catch {
        /* ignore */
      }
      toast.success(`Complaint filed. Ticket ${data.ticket_id}`)
      navigate(`/complaints/${data.id}`, { replace: true })
    } catch (err) {
      const d = err.response?.data?.detail
      toast.error(typeof d === 'string' ? d : !err.response ? "Can't reach the server. Your draft is saved." : 'Could not submit complaint.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <PageHeader
        title="File a complaint"
        subtitle="GEHU Bhimtal Campus"
        back={{ to: '/dashboard', label: 'My complaints' }}
        actions={
          hasDraft && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setForm(BLANK)
                setPhoto(null)
                try {
                  localStorage.removeItem(DRAFT_KEY)
                } catch {
                  /* ignore */
                }
              }}
            >
              Clear draft
            </button>
          )
        }
      />

      <form onSubmit={handleSubmit} className="panel p-4 sm:p-6 space-y-6">
        <fieldset>
          <legend className="field-label mb-2">What's it about?</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {CATEGORIES.map((c) => {
              const active = form.category === c.value
              return (
                <button
                  type="button"
                  key={c.value}
                  aria-pressed={active}
                  onClick={() => setForm({ ...form, category: c.value })}
                  className={`text-left px-3 py-3 min-h-[76px] rounded-md border text-sm transition-colors ${
                    active ? 'border-pine-400 bg-pine-50 ring-2 ring-pine-400/20' : 'border-stone-300 hover:border-ink/30 bg-surface'
                  }`}
                >
                  <span className={`flex items-center gap-2 font-medium ${active ? 'text-pine-600' : 'text-ink'}`}>
                    <Icon name={c.icon} className="h-[18px] w-[18px] shrink-0" />
                    <span className="leading-tight">{c.label}</span>
                  </span>
                  <span className="block text-xs text-ink-faint mt-1 leading-snug">{c.hint}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        {isRagging && (
          <div role="note" className="bg-rust-50 border border-rust-100 rounded-md p-3.5 text-sm text-rust-600 flex gap-3">
            <Icon name="lock" className="h-5 w-5 shrink-0 mt-0.5" />
            <span>
              This complaint will be submitted <strong>anonymously</strong> and sent <strong>directly to the campus admin / anti-ragging committee</strong>. Your hostel warden will not see it or be notified.
            </span>
          </div>
        )}

        <Field label="Title">
          <input required maxLength={120} enterKeyHint="next" placeholder="e.g. No water supply in Block C, 2nd floor" className="input-field" value={form.title} onChange={set('title')} />
        </Field>

        <Field label="Description" hint={`${form.description.length}/2000`}>
          <textarea required rows={5} maxLength={2000} placeholder="What happened, since when, and how it affects you…" className="input-field resize-y min-h-[120px]" value={form.description} onChange={set('description')} />
        </Field>

        <Field label="Location">
          <input required enterKeyHint="done" placeholder="e.g. Hostel Block C, Room 214" className="input-field" value={form.location} onChange={set('location')} />
        </Field>

        <div>
          <p className="field-label">Photo evidence (optional)</p>
          {preview ? (
            <div className="flex items-center gap-3 p-2.5 border border-stone-300 rounded-md bg-surface">
              <img src={preview} alt="Selected evidence" className="h-16 w-16 rounded object-cover shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink truncate">{photo.name}</p>
                <p className="text-xs text-ink-faint">{formatBytes(photo.size)}, resized for faster upload</p>
              </div>
              <button type="button" onClick={() => setPhoto(null)} aria-label="Remove photo" className="h-11 w-11 rounded-md text-ink-faint hover:bg-stone-100 hover:text-rust-600 flex items-center justify-center">
                <Icon name="trash" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDrag(true)
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDrag(false)
                pickPhoto(e.dataTransfer.files?.[0])
              }}
              className={`rounded-md border-2 border-dashed transition-colors ${drag ? 'border-pine-400 bg-pine-50' : 'border-stone-300'}`}
            >
              <div className="p-4 flex flex-col sm:flex-row items-center gap-3 justify-center text-center">
                <span className="hidden sm:flex h-10 w-10 rounded-full bg-stone-100 items-center justify-center text-ink-faint">
                  <Icon name="image" />
                </span>
                <p className="text-sm text-ink-soft hidden sm:block">Drag a photo here, or</p>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button type="button" className="btn-secondary flex-1 sm:flex-none" onClick={() => fileRef.current?.click()}>
                    <Icon name="upload" className="h-4 w-4" /> Choose photo
                  </button>
                  <label className="btn-secondary flex-1 sm:hidden cursor-pointer">
                    <Icon name="camera" className="h-4 w-4" /> Camera
                    <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} />
                  </label>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => pickPhoto(e.target.files?.[0])} />
            </div>
          )}
        </div>

        {!isRagging && (
          <label className="flex items-start gap-3 text-sm text-ink-soft cursor-pointer min-h-[44px] py-1">
            <input type="checkbox" checked={form.is_anonymous} onChange={(e) => setForm({ ...form, is_anonymous: e.target.checked })} className="mt-0.5 h-5 w-5 rounded border-stone-400 text-pine-500 focus:ring-pine-400" />
            <span>
              Submit anonymously
              <span className="block text-xs text-ink-faint mt-0.5">Wardens won't see your name. Admins can still see who filed it, for accountability.</span>
            </span>
          </label>
        )}

        <button type="submit" disabled={loading || !form.category} className="btn-primary w-full">
          {loading ? 'Submitting…' : form.category ? 'Submit complaint' : 'Choose a category to continue'}
        </button>
      </form>
    </div>
  )
}
