import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import usePageTitle from '../hooks/usePageTitle'

export default function NotFound() {
  usePageTitle('Page not found')
  const { user } = useAuth()
  return (
    <div className="min-h-[60dvh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="font-display text-6xl text-stone-400">404</p>
        <h1 className="font-display text-2xl text-ink mt-3">This page doesn't exist</h1>
        <p className="text-sm text-ink-soft mt-2">The link may be old or mistyped.</p>
        <Link to="/" className="btn-primary mt-6">{user ? 'Go to my dashboard' : 'Go to sign in'}</Link>
      </div>
    </div>
  )
}
