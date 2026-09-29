/** @type {import('tailwindcss').Config} */
// Every colour is a CSS variable (see src/index.css) so the whole app can switch
// between light and dark themes without touching a single component.
const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: c('paper'),
        surface: c('surface'),
        accent: c('accent'),
        ink: { DEFAULT: c('ink'), soft: c('ink-soft'), faint: c('ink-faint') },
        stone: { 100: c('stone-100'), 200: c('stone-200'), 300: c('stone-300'), 400: c('stone-400') },
        pine: { 50: c('pine-50'), 100: c('pine-100'), 400: c('pine-400'), 500: c('pine-500'), 600: c('pine-600'), 700: c('pine-700') },
        brass: { 50: c('brass-50'), 100: c('brass-100'), 500: c('brass-500'), 600: c('brass-600') },
        rust: { 50: c('rust-50'), 100: c('rust-100'), 500: c('rust-500'), 600: c('rust-600') },
        slate: { 50: c('slate-50'), 100: c('slate-100'), 500: c('slate-500'), 600: c('slate-600') }
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.06), 0 1px 1px rgb(var(--shadow) / 0.04)',
        lifted: '0 16px 32px -12px rgb(var(--shadow) / 0.28)',
        glow: '0 0 0 4px rgb(var(--c-pine-400) / 0.15)'
      },
      borderRadius: { sm: '4px', DEFAULT: '6px', md: '6px', lg: '8px', xl: '12px' },
      minHeight: { dvh: '100dvh' },
      height: { dvh: '100dvh' },
      spacing: { 'safe-b': 'env(safe-area-inset-bottom, 0px)', 'safe-t': 'env(safe-area-inset-top, 0px)' },
      keyframes: {
        'sheet-up': { from: { transform: 'translateY(24px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } }
      },
      animation: {
        'sheet-up': 'sheet-up 0.28s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.2s ease-out both'
      }
    }
  },
  plugins: []
}
