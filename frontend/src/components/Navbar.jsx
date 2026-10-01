import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleHome } from '../utils/categories'
import NotificationBell from './NotificationBell'
import PresenceBadge from './PresenceBadge'
import ThemeToggle from './ThemeToggle'
import UserMenu from './UserMenu'

const LINKS = {
  student: [
    ['/dashboard', 'My complaints', true],
    ['/complaints/new', 'File complaint', false]
  ],
  admin: [
    ['/admin', 'Overview', true],
    ['/admin/complaints', 'Complaints', false],
    ['/admin/staff', 'Staff', false]
  ],
  warden: [['/warden', 'Assigned queue', true]]
}

export default function Navbar() {
  const { user } = useAuth()
  const links = LINKS[user?.role] || []

  return (
    <header
      className="glass border-b border-stone-300/60 sticky top-0 z-40 no-print"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <nav aria-label="Main" className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
        <Link to={user ? roleHome(user.role) : '/'} className="flex items-center gap-2.5 group shrink-0" aria-label="GEHU Complaint Registry home">
          <img src="/icons/icon.svg" alt="" className="h-9 w-9 rounded-xl shadow-card transition-transform group-hover:scale-105" />
          <span className="leading-tight">
            <span className="block font-display font-semibold text-ink text-[0.95rem]">GEHU Bhimtal</span>
            <span className="block text-[11px] text-ink-faint -mt-0.5">Complaint Registry</span>
          </span>
        </Link>

        {links.length > 0 && (
          <div className="hidden md:flex items-center gap-1 ml-4 mr-auto">
            {links.map(([to, label, end]) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `px-3 min-h-[40px] inline-flex items-center rounded-md text-sm font-medium transition-colors ${
                    isActive ? 'bg-pine-100 text-pine-600' : 'text-ink-soft hover:bg-stone-100'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 sm:gap-2 ml-auto">
          {user?.role === 'student' && <PresenceBadge />}
          {!user && <ThemeToggle />}
          {user && <NotificationBell />}
          {user && <UserMenu />}
        </div>
      </nav>
    </header>
  )
}
