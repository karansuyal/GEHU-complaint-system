const TONES = ['bg-pine-100 text-pine-700', 'bg-brass-100 text-brass-600', 'bg-slate-100 text-slate-600', 'bg-rust-100 text-rust-600']

export default function Avatar({ name = '', size = 'md', className = '' }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'
  const tone = TONES[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % TONES.length]
  const dim = size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-9 w-9 text-sm'
  return (
    <span aria-hidden="true" className={`${dim} ${tone} ${className} rounded-full inline-flex items-center justify-center font-semibold shrink-0 select-none`}>
      {initials}
    </span>
  )
}
