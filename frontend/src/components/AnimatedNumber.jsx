import { useEffect, useRef, useState } from 'react'

// Counts up to `value` once it arrives. Non-numeric values ("—", "4.2 / 5") are shown as-is.
export default function AnimatedNumber({ value, duration = 700, suffix = '' }) {
  const target = typeof value === 'number' ? value : Number(value)
  const numeric = Number.isFinite(target) && value !== '' && value != null
  const [shown, setShown] = useState(numeric ? 0 : value)
  const raf = useRef(0)

  useEffect(() => {
    if (!numeric) return setShown(value)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) return setShown(target)
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(Math.round(target * eased * 10) / 10)
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value, numeric, target, duration])

  return <>{numeric ? Number.isInteger(target) ? Math.round(shown) : shown : shown}{numeric ? suffix : ''}</>
}
