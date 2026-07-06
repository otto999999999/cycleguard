"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, Dumbbell, HeartPulse, LogOut, Settings, Sparkles, Syringe, User, X } from "lucide-react"
import { supabase } from "@/lib/supabase"

const areas = [
  {
    title: "Steroide",
    subtitle: "Cycle, Supplemente, Logging und Vorrat",
    href: "/steroids",
    icon: Syringe,
className:
  "border-red-400/20 bg-gradient-to-br from-red-400/[0.12] to-white/[0.025] shadow-[0_0_40px_rgba(248,113,113,0.12)]",
    iconClass: "bg-red-400/12 text-red-300",
    badgeClass: "border-red-400/20 bg-red-400/10 text-red-300",
    badge: "Core",
  },
  {
    title: "Gym",
    subtitle: "Workouts, Training und Fortschritt",
    href: "/performance/strength",
    icon: Dumbbell,
    className:
      "border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.12] to-white/[0.025] shadow-[0_0_40px_rgba(34,211,238,0.12)]",
    iconClass: "bg-cyan-400/12 text-cyan-300",
    badgeClass: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    badge: "Aktiv",
  },
  {
    title: "Ernährung",
    subtitle: "Kalorien, Makros und Barcode-Scanner",
    href: "/nutrition",
    icon: Sparkles,
    className:
      "border-orange-400/20 bg-gradient-to-br from-orange-400/[0.12] to-white/[0.025] shadow-[0_0_40px_rgba(251,146,60,0.10)]",
    iconClass: "bg-orange-400/12 text-orange-300",
    badgeClass: "border-orange-400/20 bg-orange-400/10 text-orange-300",
    badge: "Coming Soon",
  },
  {
    title: "Pflege",
    subtitle: "Haut, Gesundheit und Routinen",
    href: "/care",
    icon: HeartPulse,
className:
  "border-blue-400/20 bg-gradient-to-br from-blue-400/[0.12] to-white/[0.025] shadow-[0_0_40px_rgba(96,165,250,0.12)]",
    iconClass: "bg-blue-400/12 text-blue-300",
    badgeClass: "border-blue-400/20 bg-blue-400/10 text-blue-300",
    badge: "Coming Soon",
  },
]

export default function HomeMenuPage() {
  const [showSettings, setShowSettings] = useState(false)
  const [showPushModal, setShowPushModal] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [email, setEmail] = useState("")

const logout = async () => {
  await supabase.auth.signOut()
  window.location.href = "/login"
}

useEffect(() => {
  const loadUserAndPush = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    setEmail(user?.email || "")

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return

    const registration = await navigator.serviceWorker.getRegistration("/sw.js")
    const subscription = await registration?.pushManager.getSubscription()

    setPushEnabled(!!subscription)
  }

  loadUserAndPush()
}, [])

useEffect(() => {
  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setEmail(user?.email || "")
  }

  loadUser()
}, [])
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

const registerPush = async () => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    alert("Push wird nicht unterstützt.")
    return
  }

  const permission = await Notification.requestPermission()

  if (permission !== "granted") {
    alert("Push nicht erlaubt.")
    return
  }

  await navigator.serviceWorker.register("/sw.js")

  const readyRegistration = await navigator.serviceWorker.ready
  const existingSubscription = await readyRegistration.pushManager.getSubscription()

  const subscription =
    existingSubscription ||
    (await readyRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ),
    }))

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      subscription,
    },
    {
      onConflict: "user_id,endpoint",
    }
  )

  if (error) {
    alert(error.message)
    return
  }

  setPushEnabled(true)
  setShowPushModal(false)
}
  return (
    <div className="min-h-screen bg-[#050505] text-foreground pb-20">
{showSettings && (
  <div className="fixed inset-0 z-[70] flex items-end bg-black/80 backdrop-blur-md">
    <div className="w-full rounded-t-[32px] border-t border-white/10 bg-gradient-to-b from-[#111111] to-[#070707] p-6 max-h-[88vh] overflow-y-auto backdrop-blur-2xl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold">Einstellungen</h2>

        <button
          onClick={() => setShowSettings(false)}
          className="w-10 h-10 rounded-xl bg-[#111111] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl bg-[#111111] p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <User className="h-8 w-8 text-primary" />
            </div>

            <div>
              <p className="text-lg font-semibold">Mein Account</p>
              <p className="text-sm text-muted-foreground">
                {email || "Wird geladen..."}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowPushModal(true)}
          className="w-full rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.08] p-5 flex items-center gap-4 active:scale-[0.985]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <Bell className="h-6 w-6 text-emerald-400" />
          </div>

          <div className="text-left">
            <p className="font-medium text-emerald-400">
              {pushEnabled ? "Benachrichtigungen aktiv" : "Benachrichtigungen"}
            </p>

            <p className="text-xs text-muted-foreground">
              {pushEnabled
                ? "Dieses Gerät ist registriert"
                : "Push-Erinnerungen aktivieren"}
            </p>
          </div>
        </button>

        <button
          onClick={async () => {
            if (confirm("Wirklich ausloggen?")) {
              await supabase.auth.signOut()
              window.location.href = "/login"
            }
          }}
          className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 p-5 flex items-center gap-4 active:scale-[0.985]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <LogOut className="h-6 w-6 text-red-400" />
          </div>

          <div className="text-left">
            <p className="font-medium text-red-400">Ausloggen</p>
            <p className="text-xs text-muted-foreground">
              Aktuelle Sitzung beenden
            </p>
          </div>
        </button>
      </div>

      <div className="mt-8 text-center text-xs text-muted-foreground">
        CycleGuard v0.1 • cycleguard.xyz
      </div>
    </div>
  </div>
)}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-120px] left-[-80px] h-[340px] w-[340px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-[220px] right-[-120px] h-[300px] w-[300px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-140px] left-[18%] h-[320px] w-[320px] rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-2xl">
<div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
  <div>
    <h1 className="text-2xl font-bold tracking-tight">CycleGuard</h1>
    <p className="text-xs text-muted-foreground">Wähle deinen Bereich</p>
  </div>

<button
  type="button"
  onClick={() => setShowSettings(true)}
  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition-all active:scale-95"
>
  <Settings className="h-5 w-5" />
</button>
</div>
      </header>

      <main className="mx-auto max-w-lg px-5 pt-6">
        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-white/[0.015] p-6 shadow-2xl backdrop-blur-xl">
          <div className="absolute right-[-70px] top-[-70px] h-[180px] w-[180px] rounded-full bg-emerald-400/12 blur-3xl" />
          <div className="absolute bottom-[-80px] left-[-50px] h-[160px] w-[160px] rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Hauptmenü
            </div>

            <h2 className="text-4xl font-black tracking-tight">
              Tracke deinen
              <span className="block bg-gradient-to-r from-emerald-300 via-cyan-300 to-white bg-clip-text text-transparent">
                Fortschritt.
              </span>
            </h2>

            <p className="mt-4 max-w-[320px] text-sm leading-6 text-muted-foreground">
              Wähle zwischen Steroide, Gym, Ernährung und Pflege. Die aktiven Bereiche sind sofort nutzbar.
            </p>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {areas.map((area) => {
            const Icon = area.icon

            return (
              <Link
                key={area.title}
                href={area.href}
                className={`group relative block overflow-hidden rounded-[32px] border p-5 backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] ${area.className}`}
              >
                <div className="absolute right-[-30px] top-[-30px] h-[110px] w-[110px] rounded-full bg-white/[0.035] blur-2xl" />

                <div className="relative flex items-center gap-4">
                  <div
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] ${area.iconClass}`}
                  >
                    <Icon className="h-8 w-8" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-2xl font-black tracking-tight">{area.title}</h3>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${area.badgeClass}`}
                      >
                        {area.badge}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground">{area.subtitle}</p>
                  </div>

                  <span className="text-2xl text-muted-foreground transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </Link>
            )
          })}
        </section>
      </main>
{showPushModal && (
  <div className="fixed inset-0 z-[90] flex items-end bg-black/80 backdrop-blur-md">
    <div className="w-full rounded-t-[32px] border-t border-white/10 bg-gradient-to-b from-[#111111] to-[#070707] p-6 backdrop-blur-2xl">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] border border-emerald-400/20 bg-emerald-400/10">
        <Bell className="h-8 w-8 text-emerald-400" />
      </div>

      <h2 className="text-center text-2xl font-bold">
        {pushEnabled ? "Push ist aktiv" : "Benachrichtigungen aktivieren?"}
      </h2>

      <p className="mx-auto mt-3 max-w-[320px] text-center text-sm text-muted-foreground">
        {pushEnabled
          ? "Dieses Gerät ist bereits registriert."
          : "CycleGuard kann dich an Dosen, Training, Low Stock und Cycle-Ende erinnern."}
      </p>

      <div className="mt-7 space-y-3">
        {!pushEnabled && (
          <button
            onClick={registerPush}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 py-4 font-bold text-black active:scale-[0.98]"
          >
            Push aktivieren
          </button>
        )}

        <button
          onClick={() => setShowPushModal(false)}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-4 font-semibold text-white active:scale-[0.98]"
        >
          {pushEnabled ? "Schließen" : "Später"}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  )

}