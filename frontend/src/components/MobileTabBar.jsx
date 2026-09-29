import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from './Icon'

const TABS = {
  student: [
    { to: '/dashboard', label: 'My complaints', icon: 'home', end: true },
    { to: '/complaints/new', label: 'File complaint', icon: 'plus', emphasis: true }
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: 'home', end: true },
    { to: '/admin/complaints', label: 'Complaints', icon: 'list' },
    { to: '/admin/staff', label: 'Staff', icon: 'people' }
  ]
}

// App-style bottom tab bar for phones. Hidden from md up, where the top bar
// carries the same links.
export default function MobileTabBar() {
  const { user } = useAuth()
  const tabs = TABS[user?.role]
  if (!tabs) return null

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-paper/95 backdrop-blur border-t border-stone-300/80 no-print"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid h-16 max-w-md mx-auto" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${isActive ? 'text-accent' : 'text-ink-faint'}`
            }
          >
            {({ isActive }) => (
              <>
                {t.emphasis ? (
                  <span className={`h-8 w-11 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-pine-500 text-white' : 'bg-stone-200 text-ink-soft'}`}>
                    <Icon name={t.icon} className="h-[18px] w-[18px]" strokeWidth={2.2} />
                  </span>
                ) : (
                  <Icon name={t.icon} strokeWidth={isActive ? 2.1 : 1.7} />
                )}
                {t.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
