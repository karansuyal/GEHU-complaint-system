import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'
import PresenceBadge from './PresenceBadge'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const dashboardPath =
    user?.role === 'admin' ? '/admin' : user?.role === 'warden' ? '/warden' : '/dashboard'

  return (
    <nav
      className="bg-paper/95 backdrop-blur border-b border-stone-300 sticky top-0 z-40"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to={user ? dashboardPath : '/'} className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-sm bg-pine-500 flex items-center justify-center text-paper font-display font-semibold text-base">
            G
          </div>
          <div className="leading-tight">
            <p className="font-display font-semibold text-ink text-[0.95rem]">GEHU Bhimtal</p>
            <p className="text-[10.5px] text-ink-faint tracking-wide uppercase -mt-0.5">
              Complaint Registry
            </p>
          </div>
        </Link>

        {user?.role === 'admin' && (
          <div className="hidden sm:flex items-center gap-1 ml-6 mr-auto">
            {[
              ['/admin', 'Overview', true],
              ['/admin/complaints', 'Complaints', false],
              ['/admin/staff', 'Staff', false]
            ].map(([to, label, end]) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-sm text-sm font-medium transition-colors ${
                    isActive ? 'bg-pine-50 text-pine-600' : 'text-ink-soft hover:bg-stone-100'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        )}

        {user && (
          <div className="flex items-center gap-2 sm:gap-3">
            {user.role === 'student' && <PresenceBadge />}
            <NotificationBell />
            <div className="w-px h-6 bg-stone-300 mx-1 hidden sm:block" />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-ink leading-tight">{user.name}</p>
              <p className="text-xs text-ink-faint capitalize leading-tight">{user.role}</p>
            </div>
            <button onClick={handleLogout} className="btn-secondary !py-1.5">
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
