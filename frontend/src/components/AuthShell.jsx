import Icon from './Icon'

const POINTS = [
  ['clipboard', 'Every complaint gets a ticket number you can follow.'],
  ['lock', 'Ragging reports are anonymous and reach only the admin.'],
  ['clock', 'If nobody responds in time, it escalates automatically.']
]

// Shared split layout for Login / Register / Verify / Forgot password:
// identity panel on large screens, a single clean form column on phones.
export default function AuthShell({ headline, blurb, title, subtitle, children, footer }) {
  return (
    <div className="min-h-[calc(100dvh-4rem)] grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden lg:flex relative flex-col justify-between text-white px-12 xl:px-16 py-14 overflow-hidden" style={{ background: 'linear-gradient(150deg,#204B3B 0%,#193C2F 55%,#132E24 100%)' }}>
        <div
          className="absolute inset-0 opacity-40 mix-blend-soft-light"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 15%, rgba(184,134,46,0.45) 0%, transparent 45%), radial-gradient(circle at 85% 80%, rgba(250,249,246,0.25) 0%, transparent 40%)' }}
        />
        <svg className="absolute inset-0 w-full h-full opacity-[0.14]" viewBox="0 0 600 800" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          {[620, 660, 700, 740, 780].map((y, i) => (
            <path key={i} d={`M-50 ${y} C 120 ${y - 60}, 180 ${y + 40}, 320 ${y - 30} S 560 ${y - 100}, 650 ${y - 40}`} stroke="#FAF9F6" strokeWidth="1.5" />
          ))}
        </svg>

        <div className="relative max-w-md animate-fade-up">
          <p className="font-display text-display-lg">{headline}</p>
          <p className="text-white/70 text-[0.95rem] mt-4 leading-relaxed">{blurb}</p>
        </div>

        <ul className="relative space-y-4 max-w-md">
          {POINTS.map(([icon, text]) => (
            <li key={text} className="flex items-start gap-3 text-sm text-white/80">
              <span className="h-8 w-8 rounded-md bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <Icon name={icon} className="h-4 w-4" />
              </span>
              <span className="pt-1.5">{text}</span>
            </li>
          ))}
        </ul>

        <p className="relative text-white/50 text-xs">Graphic Era Hill University · Bhimtal Campus</p>
      </aside>

      <div className="flex flex-col items-center justify-start sm:justify-center px-4 pt-4 pb-8 sm:py-12">
        {/* Phones: compact brand banner (the big side panel is desktop-only). */}
        <div className="hero lg:hidden w-full max-w-[26rem] p-5 mb-6 animate-fade-up">
          <p className="font-display text-xl leading-snug">{headline}</p>
          <p className="text-xs text-white/65 mt-2">Graphic Era Hill University · Bhimtal Campus</p>
        </div>
        <div className="w-full max-w-[26rem] animate-fade-up">
          <h1 className="font-display text-display-md text-ink mb-1.5">{title}</h1>
          {subtitle && <p className="text-sm text-ink-faint mb-7 leading-relaxed">{subtitle}</p>}
          {children}
          {footer && <div className="text-sm text-ink-soft mt-7 text-center sm:text-left">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
