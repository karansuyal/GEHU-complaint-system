// Greeting banner shown at the top of every dashboard. `aside` is a slot for a
// ProgressRing or any quick figure; `children` holds action buttons / chips.
export default function HeroBanner({ eyebrow, title, subtitle, aside, children }) {
  return (
    <section className="hero p-5 sm:p-7 mb-5 animate-fade-up">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="text-[11px] uppercase tracking-[0.14em] text-white/60 font-semibold">{eyebrow}</p>}
          <h1 className="font-display text-display-md mt-1 text-white">{title}</h1>
          {subtitle && <p className="text-sm text-white/70 mt-1.5 leading-relaxed max-w-md">{subtitle}</p>}
        </div>
        {aside}
      </div>
      {children && <div className="mt-5 flex flex-wrap gap-2.5">{children}</div>}
    </section>
  )
}

export function HeroButton({ as: Tag = 'button', primary, className = '', ...rest }) {
  return (
    <Tag
      className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl text-sm font-semibold transition active:scale-[0.97] ${
        primary ? 'bg-white text-pine-700 hover:bg-white/90 shadow-card' : 'hero-chip text-white hover:bg-white/20'
      } ${className}`}
      {...rest}
    />
  )
}
