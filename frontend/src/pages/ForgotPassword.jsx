import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../api/client'
import AuthShell from '../components/AuthShell'
import { Field, OtpInput, PasswordInput, StrengthMeter } from '../components/Field'
import useCooldown from '../hooks/useCooldown'
import usePageTitle from '../hooks/usePageTitle'

export default function ForgotPassword() {
  usePageTitle('Reset password')
  const navigate = useNavigate()
  const [step, setStep] = useState('email') // 'email' -> 'reset'
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, startCooldown] = useCooldown(email || 'reset')

  const sendCode = async (e) => {
    e?.preventDefault()
    setLoading(true)
    try {
      await authAPI.forgotPassword(email.trim())
      toast.success('If that email is registered, a code is on its way.')
      setStep('reset')
      startCooldown(60)
    } catch (err) {
      const d = err.response?.data?.detail
      toast.error(typeof d === 'string' ? d : 'Something went wrong. Please try again.')
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
        step === 'email' ? (
          "Enter your college email and we'll send you a code."
        ) : (
          <>
            Enter the 6-digit code we sent to <strong className="text-ink font-medium break-all">{email}</strong> and choose a new password.
          </>
        )
      }
      footer={
        <Link to="/login" className="text-accent font-medium hover:underline">
          Back to sign in
        </Link>
      }
    >
      {step === 'email' ? (
        <form onSubmit={sendCode} className="space-y-4">
          <Field label="College email">
            <input type="email" required autoComplete="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="you@gehu.ac.in" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Sending…' : 'Send code'}
          </button>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-5">
          <div>
            <p className="field-label">Code</p>
            <OtpInput value={otp} onChange={setOtp} disabled={loading} />
          </div>
          <div>
            <Field label="New password" hint={password ? undefined : 'At least 8 characters.'}>
              <PasswordInput required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <StrengthMeter password={password} />
          </div>
          <button type="submit" disabled={loading || otp.length !== 6 || password.length < 8} className="btn-primary w-full">
            {loading ? 'Updating…' : 'Update password'}
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={sendCode} disabled={cooldown > 0 || loading} className="btn-ghost flex-1 disabled:!text-ink-faint">
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
            <button type="button" onClick={() => setStep('email')} className="btn-ghost flex-1">
              Different email
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  )
}
