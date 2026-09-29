import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'

// Bottom sheet on phones, centred dialog on larger screens. Rendered in a portal
// so no ancestor can clip it, traps focus, restores focus on close, locks page
// scroll and closes on Escape / backdrop tap.
export default function Sheet({ open, onClose, title, children, footer, size = 'md' }) {
  const panelRef = useRef(null)
  const lastFocus = useRef(null)

  useEffect(() => {
    if (!open) return
    lastFocus.current = document.activeElement
    const onKey = (e) => {
      if (e.key === 'Escape') return onClose()
      if (e.key !== 'Tab') return
      const nodes = panelRef.current?.querySelectorAll(FOCUSABLE)
      if (!nodes?.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Focus the first field, not the close button, so the keyboard opens on the input.
    const t = setTimeout(() => {
      const target = panelRef.current?.querySelector('[data-autofocus],textarea,input,select') || panelRef.current
      target?.focus?.({ preventScroll: true })
    }, 30)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      lastFocus.current?.focus?.({ preventScroll: true })
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${size === 'sm' ? 'sm:max-w-sm' : 'sm:max-w-md'} bg-surface rounded-t-2xl sm:rounded-xl shadow-lifted max-h-[92dvh] flex flex-col animate-sheet-up outline-none border border-stone-300/60`}
      >
        <div className="sm:hidden flex justify-center pt-2" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-stone-400" />
        </div>
        <div className="flex items-center justify-between gap-3 px-5 pt-3 sm:pt-4 pb-3 border-b border-stone-200">
          <h2 className="font-display text-lg text-ink truncate">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="h-10 w-10 -mr-2 rounded-md text-ink-faint hover:bg-stone-100 hover:text-ink flex items-center justify-center">
            <Icon name="close" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto overscroll-contain">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-stone-200" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            {footer}
          </div>
        )}
        {!footer && <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />}
      </div>
    </div>,
    document.body
  )
}
