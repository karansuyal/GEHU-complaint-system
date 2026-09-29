import Icon from './Icon'

export default function Pagination({ page, pages, total, onChange }) {
  if (!total) return null
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 mt-6 text-sm">
      <p className="text-ink-faint">
        Page {page} of {pages}
        <span className="hidden sm:inline"> · {total} result{total === 1 ? '' : 's'}</span>
      </p>
      <div className="flex gap-2">
        <button className="btn-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <Icon name="chevronLeft" className="h-4 w-4" /> Previous
        </button>
        <button className="btn-secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next <Icon name="chevronRight" className="h-4 w-4" />
        </button>
      </div>
    </nav>
  )
}
