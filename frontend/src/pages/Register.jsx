import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import AuthShell from '../components/AuthShell'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    enrollment_no: '',
    hostel_block: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await register({
        ...form,
        email: form.email.trim(),
        campus: 'bhimtal',
        role: 'student'
      })
      if (result.requiresVerification) {
        toast.success('We emailed you a 6-digit code.')
        navigate('/verify-email', { state: { email: result.email } })
      } else {
        toast.success('Account created!')
        navigate('/dashboard')
      }
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Registration failed. Check the details and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      headline="Raise it once. We'll see it through."
      blurb="Register with your college email to file, track and follow up on hostel and campus complaints at Bhimtal."
      title="Create your account"
      subtitle="GEHU Bhimtal Campus students only"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-pine-500 font-medium hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="field-label">Full name</label>
          <input
            required
            autoComplete="name"
            className="input-field"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="field-label">College email</label>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@gehu.ac.in"
            className="input-field"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Enrollment no.</label>
            <input
              required
              className="input-field"
              value={form.enrollment_no}
              onChange={(e) => setForm({ ...form, enrollment_no: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Hostel block</label>
            <input
              placeholder="e.g. Block C"
              className="input-field"
              value={form.hostel_block}
              onChange={(e) => setForm({ ...form, hostel_block: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="field-label">Password</label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input-field"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <p className="text-xs text-ink-faint mt-1">At least 8 characters.</p>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  )
}
