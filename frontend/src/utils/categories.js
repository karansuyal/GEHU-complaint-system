// Single source of truth for complaint categories (labels, hints, icons).
export const CATEGORIES = [
  { value: 'maintenance', label: 'Maintenance', hint: 'Electricity, water, room repair', icon: 'wrench' },
  { value: 'mess', label: 'Mess / Food', hint: 'Food quality, hygiene, timing', icon: 'utensils' },
  { value: 'wifi', label: 'Wifi / Internet', hint: 'Connectivity, speed, outages', icon: 'wifi' },
  { value: 'cleanliness', label: 'Cleanliness', hint: 'Common areas, washrooms', icon: 'sparkle' },
  { value: 'security', label: 'Security', hint: 'Access, safety concerns', icon: 'shield' },
  { value: 'ragging', label: 'Ragging / Discipline', hint: 'Routed to admin, always anonymous', icon: 'alert' }
]

export const CATEGORY_BY_VALUE = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]))
export const categoryLabel = (v) => CATEGORY_BY_VALUE[v]?.label ?? (v ? v[0].toUpperCase() + v.slice(1) : '')
export const WARDEN_CATEGORIES = CATEGORIES.filter((c) => c.value !== 'ragging')

export const roleHome = (role) => (role === 'admin' ? '/admin' : role === 'warden' ? '/warden' : '/dashboard')
