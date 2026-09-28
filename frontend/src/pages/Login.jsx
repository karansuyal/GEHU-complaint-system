import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import AuthShell from '../components/AuthShell'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(form.email.trim(), form.password)
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`)
      const path = user.role === 'admin' ? '/admin' : user.role === 'warden' ? '/warden' : '/dashboard'
      navigate(path)
    } catch (err) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 403 && detail === 'email_not_verified') {
        toast('Please verify your email first — we sent you a new code.')
        navigate('/verify-email', { state: { email: form.email.trim().toLowerCase() } })
      } else if (err.response?.status === 403 && detail === 'account_disabled') {
        toast.error('This account has been deactivated. Please contact the admin.')
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
      blurb="Every complaint filed at GEHU Bhimtal is logged, timestamped and tracked until it's resolved — visible to you at every step."
      title="Sign in"
      subtitle="GEHU Bhimtal Complaint Registry"
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="text-pine-500 font-medium hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
        <div>
          <div className="flex items-center justify-between">
            <label className="field-label">Password</label>
            <Link to="/forgot-password" className="text-xs text-pine-500 font-medium hover:underline mb-1.5">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="input-field"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  )
}
