import { supabase } from "@/lib/supabase"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/")

  const rawData = window.atob(base64)

  return Uint8Array.from(
    [...rawData].map((character) => character.charCodeAt(0))
  )
}

export async function enablePushNotifications() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Worker werden auf diesem Gerät nicht unterstützt.")
  }

  if (!("PushManager" in window)) {
    throw new Error("Push-Benachrichtigungen werden nicht unterstützt.")
  }

  const permission = await Notification.requestPermission()

  if (permission !== "granted") {
    throw new Error("Benachrichtigungen wurden nicht erlaubt.")
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  if (!publicKey) {
    throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY fehlt.")
  }

  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  })

  await navigator.serviceWorker.ready

  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) throw new Error("Du bist nicht eingeloggt.")

const subscriptionData = subscription.toJSON()

if (!subscriptionData.endpoint || !subscriptionData.keys) {
  throw new Error("Das Push-Abonnement ist unvollständig.")
}

const { error } = await supabase
  .from("push_subscriptions")
  .upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      subscription: subscriptionData,
      user_agent: navigator.userAgent,
      enabled: true,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,endpoint",
    }
  )

if (error) throw error

  return subscription
}

export async function disablePushNotifications() {
  if (!("serviceWorker" in navigator)) return

  const registration =
    await navigator.serviceWorker.getRegistration("/")

  if (!registration) return

  const subscription =
    await registration.pushManager.getSubscription()

  if (!subscription) return

  const { error } = await supabase
    .from("push_subscriptions")
    .update({
      enabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq("endpoint", subscription.endpoint)

  if (error) throw error

  await subscription.unsubscribe()
}