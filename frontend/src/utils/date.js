// The API returns UTC timestamps without a timezone suffix ("2026-09-28T06:24:22").
// `new Date()` would read those as *local* time and show them hours off, so we
// mark them as UTC before parsing.
export function parseServerDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(value)
  return new Date(hasZone ? value : `${value}Z`)
}

export function formatDate(value, opts = { day: 'numeric', month: 'short' }) {
  const d = parseServerDate(value)
  return d ? d.toLocaleDateString('en-IN', opts) : ''
}

export function formatDateTime(value) {
  const d = parseServerDate(value)
  return d
    ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : ''
}

export function timeAgo(value) {
  const d = parseServerDate(value)
  if (!d) return ''
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function daysLeft(value) {
  const d = parseServerDate(value)
  if (!d) return 0
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000))
}
