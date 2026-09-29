import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import AuthShell from '../components/AuthShell'
import { Field, PasswordInput, StrengthMeter } from '../components/Field'
import usePageTitle from '../hooks/usePageTitle'

export default function Register() {
  usePageTitle('Create account')
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', enrollment_no: '', hostel_block: '' })
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await register({ ...form, name: form.name.trim(), email: form.email.trim(), campus: 'bhimtal', role: 'student' })
      if (result.requiresVerification) {
        toast.success('We emailed you a 6-digit code.')
        navigate('/verify-email', { state: { email: result.email } })
      } else {
        toast.success('Account created!')
        navigate('/dashboard')
      }
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : Array.isArray(detail) && detail[0]?.msg ? detail[0].msg : 'Registration failed. Check the details and try again.'
      toast.error(msg)
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
          <Link to="/login" className="text-accent font-medium hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name">
          <input required autoComplete="name" autoCapitalize="words" enterKeyHint="next" className="input-field" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="College email">
          <input type="email" required autoComplete="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" placeholder="you@gehu.ac.in" className="input-field" value={form.email} onChange={set('email')} />
        </Field>
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4">
          <Field label="Enrollment no.">
            <input required autoCapitalize="characters" autoCorrect="off" enterKeyHint="next" className="input-field" value={form.enrollment_no} onChange={set('enrollment_no')} />
          </Field>
          <Field label="Hostel block">
            <input placeholder="e.g. Block C" autoCapitalize="words" enterKeyHint="next" className="input-field" value={form.hostel_block} onChange={set('hostel_block')} />
          </Field>
        </div>
        <Field label="Password" hint={form.password ? undefined : 'At least 8 characters.'}>
          <PasswordInput required minLength={8} autoComplete="new-password" enterKeyHint="go" value={form.password} onChange={set('password')} />
        </Field>
        <StrengthMeter password={form.password} />
        <button type="submit" disabled={loading} className="btn-primary w-full !mt-6">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
        <p className="text-xs text-ink-faint text-center">We'll email a 6-digit code to confirm it's really you.</p>
      </form>
    </AuthShell>
  )
}
