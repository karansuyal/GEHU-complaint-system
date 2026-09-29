import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import Icon from './Icon'

// Evidence photo: thumbnail in the page, full-screen view on tap (pinch-zoom works natively).
export default function ImageViewer({ src, alt }) {
  const [open, setOpen] = useState(false)
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  if (broken) return <p className="text-xs text-ink-faint mt-3">The photo could not be loaded.</p>

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-4 block w-full rounded-lg overflow-hidden border border-stone-300 bg-stone-100 group relative" aria-label="View photo full screen">
        <img src={src} alt={alt} loading="lazy" onError={() => setBroken(true)} className="w-full max-h-80 object-cover group-hover:opacity-95 transition-opacity" />
        <span className="absolute bottom-2 right-2 text-[11px] bg-black/60 text-white px-2 py-1 rounded">Tap to enlarge</span>
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center animate-fade-in" role="dialog" aria-modal="true" aria-label={alt} onClick={() => setOpen(false)}>
            <button aria-label="Close photo" onClick={() => setOpen(false)} className="absolute right-3 h-11 w-11 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25" style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}>
              <Icon name="close" />
            </button>
            <img src={src} alt={alt} className="max-h-[92dvh] max-w-[96vw] object-contain" onClick={(e) => e.stopPropagation()} />
          </div>,
          document.body
        )}
    </>
  )
}
