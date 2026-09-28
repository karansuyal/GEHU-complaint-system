import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../api/client'
import { useAuth } from '../context/AuthContext'
import AuthShell from '../components/AuthShell'

const RESEND_SECONDS = 60

export default function VerifyEmail() {
  const { state } = useLocation()
  const email = state?.email
  const { verifyEmail } = useAuth()
  const navigate = useNavigate()
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(RESEND_SECONDS)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // Opened directly (refresh / bookmark): we don't know the email, so go back.
  if (!email) return <Navigate to="/login" replace />

  const submit = async (code) => {
    setLoading(true)
    try {
      const user = await verifyEmail(email, code)
      toast.success('Email verified — welcome!')
      navigate(user.role === 'admin' ? '/admin' : user.role === 'warden' ? '/warden' : '/dashboard', { replace: true })
    } catch (err) {
      setOtp('')
      inputRef.current?.focus()
      toast.error(err.response?.data?.detail || 'Could not verify. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const onChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
    setOtp(digits)
    if (digits.length === 6) submit(digits) // auto-submit as soon as the 6th digit lands
  }

  const resend = async () => {
    try {
      await authAPI.resendOtp(email)
      toast.success('New code sent.')
      setCooldown(RESEND_SECONDS)
    } catch {
      toast.error('Could not resend the code.')
    }
  }

  return (
    <AuthShell
      headline="One quick check that it's really you."
      blurb="We only let verified college emails file complaints, so every ticket has a real person behind it."
      title="Check your email"
      subtitle={`We sent a 6-digit code to ${email}. It expires in 10 minutes.`}
      footer={
        <Link to="/login" className="text-pine-500 font-medium hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (otp.length === 6) submit(otp)
        }}
        className="space-y-4"
      >
        <div>
          <label className="field-label">Verification code</label>
          <input
            ref={inputRef}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            aria-label="6-digit verification code"
            className="input-field text-center font-display text-2xl tracking-[0.5em] !py-3"
            value={otp}
            onChange={onChange}
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full">
          {loading ? 'Verifying…' : 'Verify email'}
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0}
          className="w-full text-sm text-ink-soft disabled:text-ink-faint hover:underline disabled:no-underline py-2"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't get it? Resend code"}
        </button>
      </form>
    </AuthShell>
  )
}
