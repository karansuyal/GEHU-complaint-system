import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const icons = {
  home: (
    <>
      <path d="M4 11.5 12 4l8 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />,
  list: (
    <>
      <path d="M8 6h12M8 12h12M8 18h12" strokeLinecap="round" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" strokeLinecap="round" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6M18 14c1.9.6 3 2.2 3 4.5" strokeLinecap="round" />
    </>
  )
}

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

// App-like bottom tab bar shown only on small screens (most students use
// this on their phones). Hidden on sm+ where the top navbar covers navigation.
export default function MobileTabBar() {
  const { user } = useAuth()
  const tabs = TABS[user?.role]
  if (!tabs) return null

  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-paper/95 backdrop-blur border-t border-stone-300"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid h-16 max-w-md mx-auto" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-pine-500' : 'text-ink-faint'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {t.emphasis ? (
                  <span
                    className={`h-8 w-8 rounded-full flex items-center justify-center -mt-0.5 transition-colors ${
                      isActive ? 'bg-pine-500 text-paper' : 'bg-stone-100 text-ink-soft'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
                      {icons[t.icon]}
                    </svg>
                  </span>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={isActive ? 2.1 : 1.7}>
                    {icons[t.icon]}
                  </svg>
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
