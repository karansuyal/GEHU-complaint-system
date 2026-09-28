export default function Pagination({ page, pages, total, onChange }) {
  if (!total) return null
  return (
    <div className="flex items-center justify-between gap-3 mt-5 text-sm">
      <p className="text-ink-faint">
        Page {page} of {pages} · {total} result{total === 1 ? '' : 's'}
      </p>
      <div className="flex gap-2">
        <button className="btn-secondary !py-2" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </button>
        <button className="btn-secondary !py-2" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  )
}
