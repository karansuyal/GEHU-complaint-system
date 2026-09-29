import { useEffect, useState } from 'react'
import { presenceAPI } from '../api/client'

// Pings the backend every 25s so this user counts as "online" for others, and
// shows students how many staff are currently around. Pauses while the tab is
// hidden so a backgrounded phone doesn't burn battery or data.
export default function PresenceBadge() {
  const [count, setCount] = useState(null)

  useEffect(() => {
    const ping = () => {
      if (document.visibilityState === 'hidden') return
      presenceAPI.heartbeat().catch(() => {})
      presenceAPI
        .staffOnline()
        .then(({ data }) => setCount(data.count))
        .catch(() => {})
    }
    ping()
    const interval = setInterval(ping, 25000)
    document.addEventListener('visibilitychange', ping)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', ping)
    }
  }, [])

  if (count === null) return null

  return (
    <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-pine-50 border border-pine-100 text-xs text-pine-600 font-medium" title="Wardens and admins currently online">
      <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pine-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-pine-400" />
      </span>
      {count} staff online
    </div>
  )
}
