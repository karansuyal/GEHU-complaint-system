import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../api/client'
import AuthShell from '../components/AuthShell'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState('email') // 'email' -> 'reset'
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const sendCode = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.forgotPassword(email.trim())
      toast.success('If that email is registered, a code is on its way.')
      setStep('reset')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const reset = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.resetPassword({ email: email.trim(), otp, new_password: password })
      toast.success('Password updated. Please sign in.')
      navigate('/login', { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Could not reset the password. Check the code and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      headline="Locked out? It happens."
      blurb="Reset your password with a one-time code sent to your college email."
      title="Reset your password"
      subtitle={
        step === 'email'
          ? "Enter your college email and we'll send you a code."
          : `Enter the 6-digit code we sent to ${email} and choose a new password.`
      }
      footer={
        <Link to="/login" className="text-pine-500 font-medium hover:underline">
          Back to sign in
        </Link>
      }
    >
      {step === 'email' ? (
        <form onSubmit={sendCode} className="space-y-4">
          <div>
            <label className="field-label">College email</label>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@gehu.ac.in"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Sending…' : 'Send code'}
          </button>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-4">
          <div>
            <label className="field-label">Code</label>
            <input
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              className="input-field text-center font-display text-xl tracking-[0.4em]"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>
          <div>
            <label className="field-label">New password</label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-ink-faint mt-1">At least 8 characters.</p>
          </div>
          <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full">
            {loading ? 'Updating…' : 'Update password'}
          </button>
          <button type="button" onClick={() => setStep('email')} className="w-full text-sm text-ink-soft hover:underline py-2">
            Use a different email / resend code
          </button>
        </form>
      )}
    </AuthShell>
  )
}
