import Sheet from './Sheet'

// Replaces window.confirm(): native dialogs are unstyled, blocked in some
// in-app browsers / installed PWAs, and can't explain consequences well.
export default function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', danger, busy, onConfirm, onClose }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className={danger ? 'btn-primary !bg-none !bg-rust-500' : 'btn-primary'} onClick={onConfirm} disabled={busy} data-autofocus>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="text-sm text-ink-soft leading-relaxed">{children}</div>
    </Sheet>
  )
}
