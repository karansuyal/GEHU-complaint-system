import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../hooks/useTheme'
import Avatar from './Avatar'
import Icon from './Icon'
import Sheet from './Sheet'

// Every role gets the same pattern: 2-3 destinations + "Account".
// `fab` renders the primary action as a raised centre button.
const TABS = {
  student: [
    { to: '/dashboard', label: 'Home', icon: 'home', end: true },
    { to: '/complaints/new', label: 'File', icon: 'plus', fab: true }
  ],
  warden: [
    { to: '/warden', label: 'Queue', icon: 'list', end: true },
    { to: '/warden?status=escalated', label: 'Urgent', icon: 'warning', match: 'escalated' }
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: 'grid', end: true },
    { to: '/admin/complaints', label: 'Complaints', icon: 'list' },
    { to: '/admin/staff', label: 'Staff', icon: 'people' }
  ]
}

export default function MobileTabBar() {
  const { user, logout } = useAuth()
  const { resolved, toggle } = useTheme()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const [account, setAccount] = useState(false)
  const tabs = TABS[user?.role]
  if (!tabs) return null

  const isActive = (t) => {
    if (t.match) return pathname === '/warden' && search.includes(t.match)
    if (t.to === '/warden') return pathname === '/warden' && !search.includes('escalated')
    return t.end ? pathname === t.to : pathname.startsWith(t.to)
  }

  return (
    <>
      <nav aria-label="Primary" className="md:hidden fixed bottom-0 inset-x-0 z-40 no-print px-3" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}>
        <div className="tabbar rounded-2xl max-w-md mx-auto flex items-stretch h-[62px] px-1.5 shadow-nav">
          {tabs.map((t) => {
            const active = isActive(t)
            return (
              <NavLink
                key={t.to}
                to={t.to}
                aria-current={active ? 'page' : undefined}
                className="relative flex-1 flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold select-none"
              >
                {t.fab ? (
                  <span className="-mt-5 h-12 w-12 rounded-2xl bg-pine-500 text-white flex items-center justify-center shadow-lifted ring-4 ring-paper active:scale-95 transition-transform">
                    <Icon name={t.icon} className="h-6 w-6" strokeWidth={2.4} />
                  </span>
                ) : (
                  <span className={`h-8 w-12 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-pine-100 text-pine-600' : 'text-ink-faint'}`}>
                    <Icon name={t.icon} className="h-[21px] w-[21px]" strokeWidth={active ? 2.2 : 1.7} />
                  </span>
                )}
                <span className={active ? 'text-pine-600' : 'text-ink-faint'}>{t.label}</span>
              </NavLink>
            )
          })}
          <button type="button" onClick={() => setAccount(true)} className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold text-ink-faint select-none" aria-haspopup="dialog">
            <span className="h-8 w-12 flex items-center justify-center">
              <Avatar name={user.name} size="sm" className="!h-7 !w-7 !text-[11px]" />
            </span>
            <span>Account</span>
          </button>
        </div>
      </nav>

      <Sheet open={account} onClose={() => setAccount(false)} title="Account">
        <div className="flex items-center gap-3 mb-4">
          <Avatar name={user.name} size="lg" />
          <div className="min-w-0">
            <p className="font-semibold text-ink truncate">{user.name}</p>
            <p className="text-xs text-ink-faint truncate">{user.email}</p>
            <p className="text-xs text-accent capitalize mt-0.5">
              {user.role}
              {user.handles_category ? ` · ${user.handles_category}` : ''}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <button onClick={toggle} className="btn-secondary w-full !justify-start gap-3">
            <Icon name={resolved === 'dark' ? 'sun' : 'moon'} className="h-[18px] w-[18px]" />
            {resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          </button>
          <button
            onClick={() => {
              setAccount(false)
              logout()
              navigate('/login')
            }}
            className="btn-danger w-full !justify-start gap-3"
          >
            <Icon name="logout" className="h-[18px] w-[18px]" />
            Sign out
          </button>
        </div>
      </Sheet>
    </>
  )
}
