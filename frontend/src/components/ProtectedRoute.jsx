import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Wraps a page and enforces: (1) user must be logged in,
// (2) if `roles` is passed, user.role must be one of them.
export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="animate-spin h-7 w-7 border-2 border-pine-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children
}
