import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleHome } from '../utils/categories'

// Requires a signed-in user and, if `roles` is passed, one of those roles.
export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-[60dvh] flex items-center justify-center" role="status">
        <div className="animate-spin h-7 w-7 border-2 border-accent border-t-transparent rounded-full" />
        <span className="sr-only">Loading…</span>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />
  return children
}
