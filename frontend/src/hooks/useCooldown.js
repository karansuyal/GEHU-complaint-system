import { useEffect, useState } from 'react'

// A resend-OTP cooldown that survives a page reload: the deadline (not the
// remaining seconds) is what's persisted, so refreshing mid-countdown can't
// reset it back to the full duration.
export default function useCooldown(key) {
  const storageKey = `gehu_cooldown_${key}`

  const remaining = () => {
    const until = Number(localStorage.getItem(storageKey) || 0)
    return Math.max(0, Math.ceil((until - Date.now()) / 1000))
  }

  const [seconds, setSeconds] = useState(remaining)

  useEffect(() => {
    if (seconds <= 0) return
    const t = setInterval(() => setSeconds(remaining()), 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds > 0])

  const start = (durationSeconds) => {
    localStorage.setItem(storageKey, String(Date.now() + durationSeconds * 1000))
    setSeconds(durationSeconds)
  }

  return [seconds, start]
}
