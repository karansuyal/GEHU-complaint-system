import { useEffect } from 'react'
import { notificationsAPI } from '../api/client'
import { subscribeToPush } from '../utils/pushNotifications'

// Mounted once inside a logged-in layout. Fires once per session: asks
// for notification permission (if not already decided) and registers
// the subscription with the backend. Fails silently everywhere push
// isn't available — in-app notifications work regardless.
export default function PushSetup() {
  useEffect(() => {
    let cancelled = false

    async function setup() {
      const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      let publicKey = envKey
      if (!publicKey) {
        try {
          const { data } = await notificationsAPI.vapidPublicKey()
          if (!data.enabled) return
          publicKey = data.public_key
        } catch {
          return
        }
      }
      if (!publicKey) return
      if (typeof Notification === 'undefined' || Notification.permission === 'denied') return

      try {
        const subscription = await subscribeToPush(publicKey)
        if (subscription && !cancelled) {
          await notificationsAPI.pushSubscribe(subscription)
        }
      } catch {
        // push isn't critical — in-app notifications still work
      }
    }

    setup()
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
