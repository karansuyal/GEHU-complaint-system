// Handles service worker registration and Web Push subscription.
// Silently no-ops anywhere push isn't supported (older browsers, iOS
// Safari without "Add to Home Screen", or if VAPID isn't configured on
// the backend) — notifications inside the app still work either way.

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export async function registerServiceWorker() {
  if (!isPushSupported()) return null
  return navigator.serviceWorker.register('/sw.js')
}

export async function subscribeToPush(vapidPublicKey) {
  if (!isPushSupported() || !vapidPublicKey) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const registration = await registerServiceWorker()
  if (!registration) return null

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    })
  }
  return subscription.toJSON()
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return null
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return null
  const json = subscription.toJSON()
  await subscription.unsubscribe()
  return json
}
