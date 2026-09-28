import { useEffect, useState } from 'react'
import { presenceAPI } from '../api/client'

// Pings the backend every 25s so this user counts as "online" for others,
// and polls the staff-online count to show students someone's watching.
export default function PresenceBadge() {
  const [count, setCount] = useState(null)

  useEffect(() => {
    const ping = () => {
      presenceAPI.heartbeat().catch(() => {})
      presenceAPI
        .staffOnline()
        .then(({ data }) => setCount(data.count))
        .catch(() => {})
    }
    ping()
    const interval = setInterval(ping, 25000)
    return () => clearInterval(interval)
  }, [])

  if (count === null) return null

  return (
    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-pine-50 border border-pine-100 text-xs text-pine-600 font-medium">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pine-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-pine-500" />
      </span>
      {count} staff online
    </div>
  )
}
