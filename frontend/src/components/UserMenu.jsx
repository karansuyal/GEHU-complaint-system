import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../hooks/useTheme'
import Avatar from './Avatar'
import Icon from './Icon'

export default function UserMenu() {
  const { user, logout } = useAuth()
  const { resolved, toggle } = useTheme()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2 h-11 sm:h-10 pl-1 pr-1 lg:pr-2 rounded-md hover:bg-stone-100 transition-colors"
      >
        <Avatar name={user.name} />
        <span className="hidden lg:block text-left leading-tight max-w-[10rem]">
          <span className="block text-sm font-medium text-ink truncate">{user.name}</span>
          <span className="block text-xs text-ink-faint capitalize">{user.role}</span>
        </span>
        <Icon name="chevronDown" className="hidden lg:block h-4 w-4 text-ink-faint" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 panel shadow-lifted z-50 animate-fade-in overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-200">
            <p className="text-sm font-medium text-ink truncate">{user.name}</p>
            <p className="text-xs text-ink-faint truncate">{user.email}</p>
            <p className="text-xs text-accent capitalize mt-1">{user.role}{user.handles_category ? ` · ${user.handles_category}` : ''}</p>
          </div>
          <button role="menuitem" onClick={toggle} className="w-full flex items-center gap-3 px-4 min-h-[48px] text-sm text-ink-soft hover:bg-stone-100">
            <Icon name={resolved === 'dark' ? 'sun' : 'moon'} className="h-[18px] w-[18px]" />
            {resolved === 'dark' ? 'Light theme' : 'Dark theme'}
          </button>
          <button
            role="menuitem"
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="w-full flex items-center gap-3 px-4 min-h-[48px] text-sm text-rust-600 hover:bg-rust-50 border-t border-stone-200"
          >
            <Icon name="logout" className="h-[18px] w-[18px]" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
