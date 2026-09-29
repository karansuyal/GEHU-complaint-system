import { useSyncExternalStore } from 'react'

const KEY = 'gehu_theme' // 'light' | 'dark' | (absent = follow the device)
const listeners = new Set()

const read = () => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}
const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
const isDark = (mode) => mode === 'dark' || (mode !== 'light' && systemDark())

function apply() {
  const dark = isDark(read())
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0E1411' : '#FAF9F6')
  listeners.forEach((l) => l())
}

// Follow the OS setting live while the user hasn't picked one explicitly.
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
  if (!read()) apply()
})

const subscribe = (cb) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
const snapshot = () => (isDark(read()) ? 'dark' : 'light')

export function useTheme() {
  const resolved = useSyncExternalStore(subscribe, snapshot, () => 'light')
  const setMode = (mode) => {
    try {
      if (mode) localStorage.setItem(KEY, mode)
      else localStorage.removeItem(KEY)
    } catch {
      /* private mode: theme just won't persist */
    }
    apply()
  }
  return { resolved, setMode, toggle: () => setMode(resolved === 'dark' ? 'light' : 'dark') }
}
