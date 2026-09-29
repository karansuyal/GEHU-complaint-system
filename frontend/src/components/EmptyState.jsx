import Icon from './Icon'

export default function EmptyState({ icon = 'inbox', title, children, action }) {
  return (
    <div className="panel border-dashed shadow-none px-6 py-12 sm:py-14 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-stone-100 text-ink-faint flex items-center justify-center mb-4">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <p className="font-display text-lg text-ink">{title}</p>
      {children && <p className="text-sm text-ink-soft mt-1 max-w-sm mx-auto">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
