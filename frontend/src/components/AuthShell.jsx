// Shared split layout for Login / Register / Verify / Forgot password:
// identity panel with contour lines on desktop, plain form column on phones.
export default function AuthShell({ headline, blurb, title, subtitle, children, footer }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
      <div className="hidden lg:flex relative flex-col justify-between bg-gradient-to-br from-pine-600 via-pine-600 to-pine-700 text-paper px-12 py-12 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.35] mix-blend-soft-light"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(184,134,46,0.4) 0%, transparent 45%), radial-gradient(circle at 85% 75%, rgba(250,249,246,0.25) 0%, transparent 40%)'
          }}
        />
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.16]"
          viewBox="0 0 600 800"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <path d="M-50 620 C 120 560, 180 660, 320 590 S 560 520, 650 580" stroke="#FAF9F6" strokeWidth="1.5" />
          <path d="M-50 660 C 130 600, 190 700, 330 630 S 570 560, 650 620" stroke="#FAF9F6" strokeWidth="1.5" />
          <path d="M-50 700 C 140 640, 200 740, 340 670 S 580 600, 650 660" stroke="#FAF9F6" strokeWidth="1.5" />
          <path d="M-50 740 C 150 680, 210 780, 350 710 S 590 640, 650 700" stroke="#FAF9F6" strokeWidth="1.5" />
          <path d="M-50 780 C 160 720, 220 820, 360 750 S 600 680, 650 740" stroke="#FAF9F6" strokeWidth="1.5" />
        </svg>
        <div className="relative animate-fade-up">
          <div className="h-9 w-9 rounded-md bg-paper/15 border border-paper/25 flex items-center justify-center font-display font-semibold text-lg shadow-lg backdrop-blur-sm">
            G
          </div>
        </div>
        <div className="relative max-w-sm animate-fade-up" style={{ animationDelay: '80ms' }}>
          <p className="font-display text-display-lg">{headline}</p>
          <p className="text-paper/70 text-sm mt-4 leading-relaxed">{blurb}</p>
        </div>
        <p className="relative text-paper/50 text-xs animate-fade-up" style={{ animationDelay: '140ms' }}>
          Graphic Era Hill University · Bhimtal Campus
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-10 bg-paper">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-6 lg:hidden text-center">
            <div className="h-10 w-10 rounded-md bg-gradient-to-b from-pine-400 to-pine-500 flex items-center justify-center text-paper font-display font-semibold text-lg mx-auto shadow-[0_4px_14px_-4px_rgba(32,75,59,0.5)]">
              G
            </div>
          </div>
          <h1 className="font-display text-display-md text-ink mb-1">{title}</h1>
          {subtitle && <p className="text-sm text-ink-faint mb-6">{subtitle}</p>}
          {children}
          {footer && <div className="text-sm text-ink-faint mt-6">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
