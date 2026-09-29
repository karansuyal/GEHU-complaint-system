import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import AuthShell from '../components/AuthShell'
import { Field, PasswordInput } from '../components/Field'
import usePageTitle from '../hooks/usePageTitle'
import { roleHome } from '../utils/categories'

export default function Login() {
  usePageTitle('Sign in')
  const { login } = useAuth()
  const navigate = useNavigate()
  const { state } = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(form.email.trim(), form.password)
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`)
      navigate(state?.from && state.from !== '/login' ? state.from : roleHome(user.role), { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 403 && detail === 'email_not_verified') {
        toast('Please verify your email first. We sent you a new code.')
        navigate('/verify-email', { state: { email: form.email.trim().toLowerCase() } })
      } else if (err.response?.status === 403 && detail === 'account_disabled') {
        toast.error('This account has been deactivated. Please contact the admin.')
      } else if (!err.response) {
        toast.error("Can't reach the server. Check your connection and try again.")
      } else {
        toast.error(typeof detail === 'string' ? detail : 'Login failed. Check your credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      headline="A record for every issue raised on campus."
      blurb="Every complaint filed at GEHU Bhimtal is logged, timestamped and tracked until it's resolved, and visible to you at every step."
      title="Sign in"
      subtitle="GEHU Bhimtal Complaint Registry"
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="text-accent font-medium hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="College email">
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            placeholder="you@gehu.ac.in"
            className="input-field"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field
          label="Password"
          labelExtra={
            <Link to="/forgot-password" className="text-xs text-accent font-medium hover:underline mb-1.5">
              Forgot password?
            </Link>
          }
        >
          <PasswordInput required autoComplete="current-password" enterKeyHint="go" placeholder="Your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <button type="submit" disabled={loading} className="btn-primary w-full !mt-6">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  )
}
