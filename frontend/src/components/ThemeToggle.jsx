import { useTheme } from '../hooks/useTheme'
import Icon from './Icon'

export default function ThemeToggle({ className = '' }) {
  const { resolved, toggle } = useTheme()
  const dark = resolved === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
      className={`h-11 w-11 sm:h-10 sm:w-10 rounded-md flex items-center justify-center text-ink-soft hover:bg-stone-100 hover:text-ink transition-colors ${className}`}
    >
      <Icon name={dark ? 'sun' : 'moon'} />
    </button>
  )
}
