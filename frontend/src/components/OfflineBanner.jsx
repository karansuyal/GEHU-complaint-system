import useOnline from '../hooks/useOnline'
import Icon from './Icon'

export default function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div role="status" className="bg-brass-50 text-brass-600 border-b border-brass-100 text-sm px-4 py-2 flex items-center justify-center gap-2 no-print">
      <Icon name="warning" className="h-4 w-4 shrink-0" />
      You're offline. Changes won't save until you reconnect.
    </div>
  )
}
