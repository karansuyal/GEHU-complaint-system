// Tiny inline trend line for stat tiles. Pure SVG, no chart library.
export default function Sparkline({ data = [], width = 84, height = 28, className = 'text-pine-500' }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const span = max - min || 1
  const step = width / (data.length - 1)
  const pts = data.map((v, i) => [i * step, height - 3 - ((v - min) / span) * (height - 6)])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const area = `${d} L${width} ${height} L0 ${height} Z`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <path d={area} fill="currentColor" opacity="0.12" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill="currentColor" />
    </svg>
  )
}
