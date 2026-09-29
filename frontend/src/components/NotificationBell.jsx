import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsAPI } from '../api/client'
import { timeAgo } from '../utils/date'
import Icon from './Icon'

const TYPE_ICONS = { new_complaint: 'inbox', status_change: 'refresh', new_comment: 'message', escalation: 'warning' }
const TYPE_TONES = {
  new_complaint: 'bg-slate-50 text-slate-600',
  status_change: 'bg-pine-50 text-pine-600',
  new_comment: 'bg-brass-50 text-brass-600',
  escalation: 'bg-rust-50 text-rust-600'
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef(null)

  const refreshCount = useCallback(() => {
    if (document.visibilityState === 'hidden') return
    notificationsAPI
      .unreadCount()
      .then(({ data }) => setUnread(data.count))
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshCount()
    const interval = setInterval(refreshCount, 20000)
    document.addEventListener('visibilitychange', refreshCount)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', refreshCount)
    }
  }, [refreshCount])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => wrapperRef.current && !wrapperRef.current.contains(e.target) && setOpen(false)
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
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative h-11 w-11 sm:h-10 sm:w-10 rounded-md flex items-center justify-center text-ink-soft hover:bg-stone-100 hover:text-ink transition-colors"
      >
        <Icon name="bell" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 h-[18px] min-w-[18px] px-1 rounded-full bg-rust-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-paper">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed left-3 right-3 top-[calc(4.25rem+env(safe-area-inset-top,0px))] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 panel shadow-lifted overflow-hidden z-50 animate-fade-in"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
            <p className="text-sm font-medium text-ink">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-accent font-medium hover:underline min-h-[32px]">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[min(24rem,60dvh)] overflow-y-auto overscroll-contain">
            {loading ? (
              <p className="text-sm text-ink-faint text-center py-10">Loading…</p>
            ) : items.length === 0 ? (
              <div className="text-center py-10 px-6">
                <Icon name="bell" className="h-7 w-7 mx-auto text-stone-400 mb-2" />
                <p className="text-sm text-ink-soft">You're all caught up.</p>
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-stone-100 transition-colors border-b border-stone-200 last:border-b-0 ${!item.is_read ? 'bg-pine-50/60' : ''}`}
                >
                  <span className={`h-8 w-8 rounded-full shrink-0 flex items-center justify-center ${TYPE_TONES[item.type] || 'bg-stone-100 text-ink-soft'}`}>
                    <Icon name={TYPE_ICONS[item.type] || 'bell'} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink truncate">{item.title}</span>
                    <span className="block text-xs text-ink-soft mt-0.5 line-clamp-2">{item.body}</span>
                    <span className="block text-[11px] text-ink-faint mt-1">{timeAgo(item.created_at)}</span>
                  </span>
                  {!item.is_read && <span className="h-2 w-2 rounded-full bg-accent shrink-0 mt-2" aria-label="Unread" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
