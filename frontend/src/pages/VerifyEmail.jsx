import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../api/client'
import { useAuth } from '../context/AuthContext'
import AuthShell from '../components/AuthShell'
import { OtpInput } from '../components/Field'
import Icon from '../components/Icon'
import useCooldown from '../hooks/useCooldown'
import usePageTitle from '../hooks/usePageTitle'
import { roleHome } from '../utils/categories'

export default function VerifyEmail() {
  usePageTitle('Verify email')
  const { state } = useLocation()
  const email = state?.email
  const { verifyEmail } = useAuth()
  const navigate = useNavigate()
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, startCooldown] = useCooldown(email || 'verify')

  // Opened directly (refresh / bookmark): we don't know the email, so go back.
  if (!email) return <Navigate to="/login" replace />

  const submit = async (code) => {
    if (loading) return
    setLoading(true)
    try {
      const user = await verifyEmail(email, code)
      toast.success('Email verified. Welcome!')
      navigate(roleHome(user.role), { replace: true })
    } catch (err) {
      setOtp('')
      toast.error(err.response?.data?.detail || 'Could not verify. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const onChange = (digits) => {
    setOtp(digits)
    if (digits.length === 6) submit(digits) // auto-submit as soon as the 6th digit lands
  }

  const resend = async () => {
    try {
      await authAPI.resendOtp(email)
      toast.success('New code sent.')
      startCooldown(60)
      setOtp('')
    } catch {
      toast.error('Could not resend the code.')
    }
  }

  return (
    <AuthShell
      headline="One quick check that it's really you."
      blurb="We only let verified college emails file complaints, so every ticket has a real person behind it."
      title="Check your email"
      subtitle={
        <>
          We sent a 6-digit code to <strong className="text-ink font-medium break-all">{email}</strong>. It expires in 10 minutes.
        </>
      }
      footer={
        <>
          Wrong email?{' '}
          <Link to="/register" className="text-accent font-medium hover:underline">
            Start over
          </Link>
          <span className="mx-2 text-stone-400">·</span>
          <Link to="/login" className="text-accent font-medium hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (otp.length === 6) submit(otp)
        }}
        className="space-y-5"
      >
        <div>
          <p className="field-label">Verification code</p>
          <OtpInput value={otp} onChange={onChange} disabled={loading} />
        </div>
        <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full">
          {loading ? 'Verifying…' : 'Verify email'}
        </button>
        <button type="button" onClick={resend} disabled={cooldown > 0} className="btn-ghost w-full disabled:!text-ink-faint">
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't get it? Resend code"}
        </button>
        <div className="flex gap-2.5 rounded-md bg-stone-100 p-3 text-xs text-ink-soft leading-relaxed">
          <Icon name="mail" className="h-4 w-4 shrink-0 mt-0.5 text-ink-faint" />
          <span>Can't find it? Check your Spam or Promotions folder. Mail from the portal can take a minute to arrive.</span>
        </div>
      </form>
    </AuthShell>
  )
}
