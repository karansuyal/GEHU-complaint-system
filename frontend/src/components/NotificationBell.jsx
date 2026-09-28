import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsAPI } from '../api/client'

const TYPE_ICONS = {
  new_complaint: '📥',
  status_change: '🔄',
  new_comment: '💬',
  escalation: '⚠️'
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr + 'Z').getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef(null)

  const refreshCount = () => {
    notificationsAPI
      .unreadCount()
      .then(({ data }) => setUnread(data.count))
      .catch(() => {})
  }

  useEffect(() => {
    refreshCount()
    const interval = setInterval(refreshCount, 20000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOpen = () => {
    const next = !open
    setOpen(next)
    if (next) {
      setLoading(true)
      notificationsAPI
        .list()
        .then(({ data }) => setItems(data))
        .catch(() => setItems([]))
        .finally(() => setLoading(false))
    }
  }

  const handleItemClick = async (item) => {
    if (!item.is_read) {
      try {
        await notificationsAPI.markRead(item.id)
        setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)))
        setUnread((prev) => Math.max(0, prev - 1))
      } catch {
        /* non-fatal */
      }
    }
    setOpen(false)
    if (item.complaint_id) navigate(`/complaints/${item.complaint_id}`)
  }

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead()
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnread(0)
    } catch {
      /* non-fatal */
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={toggleOpen}
        aria-label="Notifications"
        className="relative h-9 w-9 rounded-sm flex items-center justify-center text-ink-soft hover:bg-stone-100 hover:text-ink transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
          <path
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.66V5a2 2 0 1 0-4 0v.34A6 6 0 0 0 6 11v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 h-[17px] min-w-[17px] px-1 rounded-full bg-rust-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-3 right-3 top-[4.25rem] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 card shadow-lifted overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 divider">
            <p className="text-sm font-medium text-ink">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-pine-500 font-medium hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-ink-faint text-center py-8">Loading…</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-ink-faint text-center py-8">You're all caught up.</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left px-4 py-3 flex gap-2.5 hover:bg-stone-100 transition-colors border-b border-stone-200 last:border-b-0 ${
                    !item.is_read ? 'bg-pine-50/60' : ''
                  }`}
                >
                  <span className="text-base shrink-0 mt-0.5">{TYPE_ICONS[item.type] || '🔔'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{item.title}</p>
                    <p className="text-xs text-ink-faint mt-0.5 line-clamp-2">{item.body}</p>
                    <p className="text-[11px] text-ink-faint/80 mt-1">{timeAgo(item.created_at)}</p>
                  </div>
                  {!item.is_read && <span className="h-1.5 w-1.5 rounded-full bg-pine-500 shrink-0 mt-1.5" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
