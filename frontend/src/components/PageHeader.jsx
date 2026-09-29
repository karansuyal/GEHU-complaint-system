import { Link } from 'react-router-dom'
import Icon from './Icon'

export default function PageHeader({ title, subtitle, back, actions }) {
  return (
    <header className={title || subtitle || actions ? 'mb-6' : 'mb-3'}>
      {back && (
        <Link to={back.to} className="inline-flex items-center gap-1 text-sm text-accent hover:underline mb-3 -ml-1 min-h-[44px] sm:min-h-0 px-1">
          <Icon name="chevronLeft" className="h-4 w-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        {(title || subtitle) && (
          <div className="min-w-0">
            {title && <h1 className="font-display text-page-title text-ink">{title}</h1>}
            {subtitle && <p className="text-sm text-ink-faint mt-1">{subtitle}</p>}
          </div>
        )}
        {actions && <div className="flex gap-2 shrink-0 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
      </div>
    </header>
  )
}
