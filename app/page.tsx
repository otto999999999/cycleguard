"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle,
  Clock,
  LogOut,
  Package,
  PlayCircle,
  Plus,
  Settings,
  Syringe,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react"
import { motion } from "framer-motion"
import { WeekCalendar } from "@/components/week-calendar"
import { BottomNav } from "@/components/bottom-nav"
import { supabase } from "@/lib/supabase"
const ORAL_TYPES = ["Oral", "Medication", "AI (Aromatase Inhibitor)", "SARM", "PCT", "Supplement"]
const DAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
const READ_KEY = "cycleguard_read_notifications"

const dateKeyLocal = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const todayKey = () => dateKeyLocal(new Date())

export default function CycleGuardDashboard() {
  const [showSettings, setShowSettings] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMonthCalendar, setShowMonthCalendar] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
})
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [showPushModal, setShowPushModal] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)

  const [activeCycle, setActiveCycle] = useState<any>(null)
  const [compounds, setCompounds] = useState<any[]>([])
  const [doses, setDoses] = useState<any[]>([])
  const [missedDoses, setMissedDoses] = useState<any[]>([])
  const [readIds, setReadIds] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState(todayKey())

  const isOral = (c: any) => ORAL_TYPES.includes(c?.type)

useEffect(() => {
  const saved = localStorage.getItem(READ_KEY)
  if (saved) setReadIds(JSON.parse(saved))
  loadDashboard()
}, [])

useEffect(() => {
  const checkPushStatus = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return

    const registration = await navigator.serviceWorker.getRegistration("/sw.js")
    const subscription = await registration?.pushManager.getSubscription()

    setPushEnabled(!!subscription)
  }

  checkPushStatus()
}, [])
useEffect(() => {
  if (!showMonthCalendar) return

  const originalOverflow = document.body.style.overflow
  document.body.style.overflow = "hidden"

  return () => {
    document.body.style.overflow = originalOverflow
  }
}, [showMonthCalendar])
  const saveReadIds = (ids: string[]) => {
    setReadIds(ids)
    localStorage.setItem(READ_KEY, JSON.stringify(ids))
  }

  const loadDashboard = async () => {
    setLoading(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      window.location.href = "/login"
      return
    }

    setEmail(session.user.email || "")

  const { data: cycleData } = await supabase
    .from("cycles")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("active", true)
    .eq("plan_category", "cycle")
    .maybeSingle()

    const { data: compoundData } = await supabase
      .from("compounds")
      .select("*")
      .eq("user_id", session.user.id)
      .order("name")

    const { data: doseData } = await supabase
      .from("doses")
      .select("*")
      .eq("user_id", session.user.id)
      .order("datum", { ascending: false })
      .order("zeit", { ascending: false })

    const { data: missedData } = await supabase
      .from("missed_doses")
      .select("*")
      .eq("user_id", session.user.id)

    setActiveCycle(cycleData || null)
    setCompounds(compoundData || [])
    setDoses(doseData || [])
    setMissedDoses(missedData || [])
    setLoading(false)
  }

  const getDueForDate = (dateKey: string) => {
    if (!activeCycle) return []

    const stack = [...(activeCycle.main_stack || []), ...(activeCycle.pct_stack || [])]
    const date = new Date(dateKey)
    const dayShort = DAYS[date.getDay()]

    return stack.filter((item) => {
      if (!activeCycle.start_date) return false

      const startWeek = item.startWeek || 1
      const endWeek = item.endWeek || activeCycle.duration_weeks || 12
      const start = new Date(activeCycle.start_date)
      const diffDays = Math.floor((date.getTime() - start.getTime()) / 86400000)

      if (diffDays < 0) return false

      const currentWeek = Math.floor(diffDays / 7) + 1
      if (currentWeek < startWeek || currentWeek > endWeek) return false

      if (item.frequency === "Daily" || item.frequency === "Twice Daily") return true
      if (item.frequency === "Custom") return (item.customDays || []).includes(dayShort)
      if (item.frequency === "EOD") return diffDays % 2 === 0
      if (item.frequency === "E3D") return diffDays % 3 === 0
      if (item.frequency === "Weekly") return diffDays % 7 === 0

      return false
    })
  }

  const getWeekDates = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset)

    return Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      return dateKeyLocal(date)
    })
  }

  const getWeekMarkedDates = () => {
    return getWeekDates().filter((dateKey) => getDueForDate(dateKey).length > 0)
  }

  const isLogged = (item: any, dateKey: string) => {
    return doses.some((dose) => dose.compound_id === item.id && dose.datum === dateKey)
  }

  const isSkipped = (item: any, dateKey: string) => {
    return missedDoses.some(
      (m) =>
        m.cycle_id === activeCycle?.id &&
        m.compound_id === item.id &&
        m.planned_date === dateKey
    )
  }

  const isPastDate = (dateKey: string) => dateKey < todayKey()

  const getStatus = (item: any, dateKey: string) => {
    if (isLogged(item, dateKey)) return "done"
    if (isSkipped(item, dateKey)) return "skipped"
    if (isPastDate(dateKey)) return "missed"
    return "open"
  }

  const selectedDue = getDueForDate(selectedDate)
  const todayDue = getDueForDate(todayKey())

  const getThisWeekPlanned = () => {
    const dates = getWeekDates()
    return dates.flatMap((date) =>
      getDueForDate(date).map((item) => ({
        ...item,
        plannedDate: date,
        status: getStatus(item, date),
      }))
    )
  }

  const weekPlanned = getThisWeekPlanned()
  const weekDone = weekPlanned.filter((x) => x.status === "done").length
  const weekSkipped = weekPlanned.filter((x) => x.status === "skipped").length
  const weekMissed = weekPlanned.filter((x) => x.status === "missed").length
  const weekTotal = weekPlanned.length
  const adherencePercent = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0

  const getMissedOpen = () => {
    return weekPlanned.filter((x) => x.status === "missed")
  }

  const missedOpen = getMissedOpen()

  const markSkipped = async (item: any, dateKey: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session || !activeCycle) return

    const { error } = await supabase.from("missed_doses").upsert({
      user_id: session.user.id,
      cycle_id: activeCycle.id,
      compound_id: item.id,
      planned_date: dateKey,
      status: "skipped",
    })

    if (error) {
      alert("Fehler: " + error.message)
      return
    }

    await loadDashboard()
  }

  const getLowStock = () => {
    return compounds.filter((c) => {
      if (isOral(c)) {
        const remaining = c.remaining_pills ?? 0
        return remaining > 0 && remaining < 20
      }

      const qty = c.packaging === "Vial" ? c.current_vials ?? 0 : c.current_ampoules ?? 0
      return qty <= 1
    })
  }

  const lowStock = getLowStock()
  const recentLogs = doses.slice(0, 3)

  const getCycleTimeProgress = () => {
    if (!activeCycle?.start_date || !activeCycle?.duration_weeks) {
      return { week: 0, total: 0, percent: 0, endDate: null as string | null }
    }

    const start = new Date(activeCycle.start_date)
    const now = new Date()
    const diffDays = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000))
    const week = Math.min(activeCycle.duration_weeks, Math.floor(diffDays / 7) + 1)

    const end = new Date(start)
    end.setDate(start.getDate() + activeCycle.duration_weeks * 7)

    return {
      week,
      total: activeCycle.duration_weeks,
      percent: Math.min(100, Math.round((week / activeCycle.duration_weeks) * 100)),
      endDate: dateKeyLocal(end),
    }
  }

  const timeProgress = getCycleTimeProgress()

  const notifications = useMemo(() => {
    const items: any[] = []

    lowStock.forEach((c) => {
      items.push({
        id: `low-${c.id}-${isOral(c) ? c.remaining_pills : c.current_vials ?? c.current_ampoules}`,
        title: "Low Stock",
        message: `${c.name} ist niedrig: ${
          isOral(c)
            ? `${c.remaining_pills ?? 0} Pillen`
            : `${c.current_vials ?? c.current_ampoules ?? 0} ${c.packaging || "Einheiten"}`
        } übrig.`,
        type: "low-stock",
        href: "/einkauf",
      })
    })

    todayDue.forEach((d) => {
      if (getStatus(d, todayKey()) === "open") {
        items.push({
          id: `dose-${activeCycle?.id}-${d.id}-${todayKey()}`,
          title: "Heute fällig",
          message: `${d.name}: ${d.doseAmount} ${d.doseUnit} • ${d.frequency}`,
          type: "dose",
          href: "/logging",
        })
      }
    })

    missedOpen.forEach((m) => {
      items.push({
        id: `missed-${activeCycle?.id}-${m.id}-${m.plannedDate}`,
        title: "Dosis verpasst",
        message: `${m.name} war am ${m.plannedDate} geplant.`,
        type: "missed",
        href: "/logging",
      })
    })

    if (activeCycle && timeProgress.endDate) {
      const daysLeft = Math.ceil((new Date(timeProgress.endDate).getTime() - new Date().getTime()) / 86400000)
      if (daysLeft <= 7 && daysLeft >= 0) {
        items.push({
          id: `cycle-ending-${activeCycle.id}`,
          title: "Cycle endet bald",
          message: `${activeCycle.name} endet in ca. ${daysLeft} Tagen.`,
          type: "cycle",
          href: "/cycle",
        })
      }
    }

    return items
  }, [activeCycle, compounds, doses, missedDoses])

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length

  const markRead = (id: string) => {
    if (!readIds.includes(id)) saveReadIds([...readIds, id])
  }

  const markAllRead = () => {
    saveReadIds(notifications.map((n) => n.id))
  }

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

const registration = await navigator.serviceWorker.register("/sw.js")

const readyRegistration = await navigator.serviceWorker.ready

const existingSubscription =
  await readyRegistration.pushManager.getSubscription()

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

const getMonthDays = () => {
  const base = calendarMonth
  const year = base.getFullYear()
  const month = base.getMonth()
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)

  const startOffset = first.getDay() === 0 ? 6 : first.getDay() - 1

  const days: (string | null)[] = Array.from({ length: startOffset }, () => null)

  for (let d = 1; d <= last.getDate(); d++) {
    days.push(dateKeyLocal(new Date(year, month, d)))
  }

  return days
}

const monthDays = getMonthDays()
const changeMonth = (direction: number) => {
  setCalendarMonth((prev) => {
    const next = new Date(prev)
    next.setMonth(prev.getMonth() + direction)
    return new Date(next.getFullYear(), next.getMonth(), 1)
  })
}
const hasLogOnDate = (dateKey: string) => {
  return doses.some((dose) => dose.datum === dateKey)
}

const hasPlanOnDate = (dateKey: string) => {
  return getDueForDate(dateKey).length > 0
}

const selectedDateLogs = doses.filter((dose) => dose.datum === selectedDate)
const deleteDoseFromCalendar = async (doseId: string) => {
  if (!confirm("Diesen Log wirklich löschen?")) return

  const { error } = await supabase
    .from("doses")
    .delete()
    .eq("id", doseId)

  if (error) {
    alert("Fehler beim Löschen: " + error.message)
    return
  }

  await loadDashboard()
}
  const selectedDateLabel = new Date(selectedDate).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  })

  return (
    <div className="min-h-screen bg-[#050505] text-foreground pb-32">
      <div className="fixed inset-0 -z-10 overflow-hidden">
  <div className="absolute top-[-120px] left-[-80px] w-[320px] h-[320px] bg-emerald-500/10 rounded-full blur-3xl" />

  <div className="absolute top-[140px] right-[-100px] w-[260px] h-[260px] bg-blue-500/10 rounded-full blur-3xl" />

  <div className="absolute bottom-[-120px] left-[20%] w-[280px] h-[280px] bg-purple-500/10 rounded-full blur-3xl" />
</div>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-2xl">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tighter">CycleGuard</h1>
            <p className="text-xs text-muted-foreground -mt-1">Dein Protokoll Manager</p>
          </div>

          <div className="flex items-center gap-3">
            <button
  onClick={() => setShowMonthCalendar(true)}
  className="w-10 h-10 rounded-2xl bg-[#0A0A0A] flex items-center justify-center border border-border/30 transition-all duration-200 hover:scale-105 active:scale-95"
>
  <CalendarDays className="w-5 h-5" />
</button>
            <button
              onClick={() => setShowNotifications(true)}
              className="relative w-10 h-10 rounded-2xl bg-[#0A0A0A] flex items-center justify-center border border-border/30 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-xs flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 rounded-2xl bg-[#0A0A0A] flex items-center justify-center border border-border/30 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-6">
        <WeekCalendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          markedDates={getWeekMarkedDates()}
        />

        <section className="mt-10">
          {loading ? (
            <div className="bg-[#0A0A0A] rounded-3xl p-8 text-center text-muted-foreground">
              Lade Dashboard...
            </div>
          ) : activeCycle ? (
            <div className="relative overflow-hidden rounded-[32px] border border-emerald-400/15 bg-gradient-to-br from-emerald-500/[0.10] to-[#080808] p-6 shadow-[0_0_40px_rgba(52,211,153,0.10)] backdrop-blur-xl">
              <div className="absolute top-[-60px] right-[-40px] w-[180px] h-[180px] rounded-full bg-emerald-400/10 blur-3xl" />
              <p className="text-sm text-emerald-400 mb-1">Aktiver Cycle</p>
              <h2 className="text-3xl font-bold">{activeCycle.name}</h2>

              <div className="mt-5">
                <div className="flex justify-between text-sm mb-2">
                  <span>Zeit: Woche {timeProgress.week} von {timeProgress.total}</span>
                  <span>{timeProgress.percent}%</span>
                </div>
                <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 backdrop-blur-sm">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.45)]" style={{ width: `${timeProgress.percent}%` }} />
                </div>
              </div>

              <div className="mt-5">
                <div className="flex justify-between text-sm mb-2">
                  <span>Diese Woche erledigt</span>
                  <span>{weekDone}/{weekTotal} • {adherencePercent}%</span>
                </div>
                <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 backdrop-blur-sm">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.45)]" style={{ width: `${adherencePercent}%` }} />
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
                  <div className="rounded-[22px] border border-white/5 bg-white/[0.04] p-3 shadow-xl backdrop-blur-md">
                    <p className="text-emerald-400 font-bold text-lg">{weekDone}</p>
                    <p className="text-muted-foreground">Erledigt</p>
                  </div>
                  <div className="rounded-[22px] border border-white/5 bg-white/[0.04] p-3 shadow-xl backdrop-blur-md">
                    <p className="text-orange-400 font-bold text-lg">{weekMissed}</p>
                    <p className="text-muted-foreground">Verpasst</p>
                  </div>
                  <div className="rounded-[22px] border border-white/5 bg-white/[0.04] p-3 shadow-xl backdrop-blur-md">
                    <p className="text-blue-400 font-bold text-lg">{weekSkipped}</p>
                    <p className="text-muted-foreground">Nicht genommen</p>
                  </div>
                </div>
              </div>

              {timeProgress.endDate && (
                <p className="text-xs text-muted-foreground mt-4">
                  Ende ca. {timeProgress.endDate}
                </p>
              )}

              <Link href="/cycle" className="mt-5 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-5 py-3 font-bold text-black shadow-[0_0_24px_rgba(52,211,153,0.25)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
                Cycle öffnen
              </Link>
            </div>
          ) : (
            <div className="bg-[#0A0A0A] rounded-3xl p-8 text-center border border-border/30">
              <div className="mx-auto w-20 h-20 rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-md shadow-xl flex items-center justify-center mb-6">
                <PlayCircle className="w-9 h-9 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium mb-2">Kein aktiver Cycle</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-[280px] mx-auto">
                Starte oder erstelle einen Cycle, um Fortschritt und Planung zu tracken.
              </p>
              <Link href="/cycle" className="bg-primary px-6 py-3.5 rounded-2xl font-medium inline-flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Cycle verwalten
              </Link>
            </div>
          )}
        </section>

        {missedOpen.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Verpasst
            </h2>

            <div className="space-y-4">
              {missedOpen.map((m) => (
                <div key={`${m.id}-${m.plannedDate}`} className="bg-orange-500/10 border border-orange-500/30 rounded-3xl p-5">
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-sm text-orange-300 mt-1">
                    Geplant am {m.plannedDate} • {m.doseAmount} {m.doseUnit}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <Link href="/logging" className="bg-primary rounded-2xl py-3 text-center font-medium">
                      Nachtragen
                    </Link>

                    <button
                      onClick={() => markSkipped(m, m.plannedDate)}
                      className="bg-[#111111] rounded-2xl py-3 font-medium"
                    >
                      Nicht genommen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
  <CalendarDays className="w-5 h-5 text-emerald-400" />
  {selectedDateLabel} anstehend
</h2>
            <Link href="/logging" className="text-sm text-primary hover:underline">
              Öffnen
            </Link>
          </div>

          {selectedDue.length === 0 ? (
            <div className="rounded-[28px] border border-emerald-400/10 bg-gradient-to-br from-emerald-500/[0.06] to-[#101010] p-6 text-center text-muted-foreground backdrop-blur-xl shadow-xl">
              {activeCycle ? "An diesem Tag ist nichts geplant." : "Noch kein aktiver Cycle."}
            </div>
          ) : (
            <div className="space-y-4">
              {selectedDue.map((item) => {
                const status = getStatus(item, selectedDate)

                return (
                  <Link
                    key={item.id}
                    href="/logging"
                    className={`group relative block overflow-hidden rounded-3xl border p-5 transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] ${
                      status === "done"
                        ? "border-emerald-400/25 bg-emerald-400/10 shadow-[0_0_24px_rgba(52,211,153,0.08)]"
                        : status === "skipped"
                          ? "border-blue-400/25 bg-blue-400/10 shadow-[0_0_24px_rgba(96,165,250,0.08)]"
                          : status === "missed"
                            ? "border-orange-400/25 bg-orange-400/10 shadow-[0_0_24px_rgba(251,146,60,0.08)]"
                            : "border-emerald-400/10 bg-gradient-to-br from-emerald-500/[0.06] to-[#101010] shadow-2xl backdrop-blur-xl"
                    }`}
                  >
                    <div
  className={`absolute left-0 top-0 h-full w-1 ${
    status === "done"
      ? "bg-emerald-400"
      : status === "skipped"
        ? "bg-blue-400"
        : status === "missed"
          ? "bg-orange-400"
          : "bg-primary"
  }`}
/>
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="text-base font-bold tracking-tight">{item.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.doseAmount} {item.doseUnit} • {item.frequency}
                        </p>
                      </div>

                      {status === "done" && (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Erledigt
                        </span>
                      )}

                      {status === "skipped" && <span className="text-xs text-blue-400">Nicht genommen</span>}
                      {status === "missed" && <span className="text-xs text-orange-400">Verpasst</span>}
                      {status === "open" && <span className="text-xs text-primary">Offen</span>}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {lowStock.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Low Stock
            </h2>

            <div className="space-y-4">
              {lowStock.slice(0, 3).map((c) => (
                <Link key={c.id} href="/einkauf" className="group relative block overflow-hidden rounded-3xl border border-orange-400/25 bg-orange-400/10 p-5 shadow-[0_0_24px_rgba(251,146,60,0.08)] transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]">
                  <div className="absolute left-0 top-0 h-full w-1 bg-orange-400" />
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-sm text-orange-300 mt-1">
                    {isOral(c)
                      ? `${c.remaining_pills ?? 0} Pillen übrig`
                      : `${c.current_vials ?? c.current_ampoules ?? 0} ${c.packaging || "Einheiten"} übrig`}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Letzte Logs
          </h2>

          {recentLogs.length === 0 ? (
            <div className="rounded-[28px] border border-emerald-400/10 bg-gradient-to-br from-emerald-500/[0.06] to-[#101010] p-6 text-center text-muted-foreground backdrop-blur-xl shadow-xl">
              Noch keine Logs.
            </div>
          ) : (
            <div className="space-y-4">
              {recentLogs.map((dose) => (
                <Link key={dose.id} href="/logging" className={`group relative block overflow-hidden rounded-[28px] border p-5 shadow-2xl backdrop-blur-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] ${
  isOral(dose)
    ? "border-blue-400/10 bg-gradient-to-br from-blue-500/[0.06] to-[#101010]"
    : "border-emerald-400/10 bg-gradient-to-br from-emerald-500/[0.06] to-[#101010]"
}`}>
                  <div
  className={`absolute left-0 top-0 h-full w-1 ${
    isOral(dose)
      ? "bg-blue-400"
      : "bg-emerald-400"
  }`}
/>
                  <p className="font-semibold">{dose.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {dose.menge} mg • {dose.datum} {dose.zeit}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="mt-10">
        <Link
          href="/logging"
          className="bg-gradient-to-r from-emerald-400 to-emerald-500 text-black rounded-2xl py-4 text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(52,211,153,0.25)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Syringe className="w-4 h-4" />
          Dosis eintragen
        </Link>


      </div>
      </main>

      <BottomNav />
{showMonthCalendar && (
  <div className="fixed inset-0 z-[75] flex items-end overflow-hidden bg-black/80 backdrop-blur-md overscroll-none">
    <div className="w-full rounded-t-[32px] border-t border-white/10 bg-gradient-to-b from-[#111111] to-[#070707] p-6 max-h-[90vh] overflow-y-auto overscroll-contain backdrop-blur-md">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Kalender</h2>
          <div className="mt-1 flex items-center gap-3">
  <button
    onClick={() => changeMonth(-1)}
    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] text-emerald-300 transition-all duration-300 hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:shadow-[0_0_20px_rgba(52,211,153,0.25)] active:scale-95"
  >
    <ChevronLeft className="h-4 w-4" />
  </button>

  <motion.p
  key={`${calendarMonth.getFullYear()}-${calendarMonth.getMonth()}`}
  initial={{ opacity: 0, y: 6 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2 }}
  className="min-w-[120px] text-center text-sm font-medium text-emerald-200 capitalize"
>
    {calendarMonth.toLocaleDateString("de-DE", {
      month: "long",
      year: "numeric",
    })}
  </motion.p>

  <button
    onClick={() => changeMonth(1)}
    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] text-emerald-300 transition-all duration-300 hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:shadow-[0_0_20px_rgba(52,211,153,0.25)] active:scale-95"
  >
    <ChevronRight className="h-4 w-4" />
  </button>
</div>
        </div>

        <button
          onClick={() => setShowMonthCalendar(false)}
          className="w-10 h-10 rounded-xl bg-[#111111] flex items-center justify-center text-muted-foreground hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground mb-3">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {monthDays.map((dateKey, index) => {
          if (!dateKey) return <div key={`empty-${index}`} />

          const day = new Date(dateKey).getDate()
          const isSelected = dateKey === selectedDate
          const logged = hasLogOnDate(dateKey)
          const planned = hasPlanOnDate(dateKey)

          return (
            <button
              key={dateKey}
              onClick={() => setSelectedDate(dateKey)}
              className={`relative min-h-[54px] rounded-2xl border text-sm font-semibold transition-all duration-300 active:scale-95 ${
                isSelected
                  ? "border-emerald-400 bg-emerald-400 text-black shadow-[0_0_28px_rgba(52,211,153,0.35)]"
                  : logged
                    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200 shadow-[0_0_20px_rgba(52,211,153,0.16)]"
                    : planned
                      ? "border-blue-400/20 bg-blue-400/10 text-blue-200"
                      : "border-white/5 bg-white/[0.03] text-white/70"
              }`}
            >
              {day}

              {logged && !isSelected && (
                <span className="absolute inset-0 rounded-2xl bg-emerald-400/5 blur-[1px]" />
              )}

              {planned && (
                <span
                  className={`absolute bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                    logged || isSelected ? "bg-black/70" : "bg-blue-400"
                  }`}
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
        <p className="text-sm text-muted-foreground mb-1">Ausgewählter Tag</p>
        <h3 className="text-lg font-semibold mb-5">
          {new Date(selectedDate).toLocaleDateString("de-DE", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
          })}
        </h3>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold mb-3">Geplant</p>

            {selectedDue.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine geplanten Dosen.</p>
            ) : (
              <div className="space-y-2">
                {selectedDue.map((item) => {
                  const status = getStatus(item, selectedDate)

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/5 bg-black/30 p-4"
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.doseAmount} {item.doseUnit} • {item.frequency}
                          </p>
                        </div>

                        <span
                          className={`text-xs ${
                            status === "done"
                              ? "text-emerald-400"
                              : status === "skipped"
                                ? "text-blue-400"
                                : status === "missed"
                                  ? "text-orange-400"
                                  : "text-muted-foreground"
                          }`}
                        >
                          {status === "done"
                            ? "Erledigt"
                            : status === "skipped"
                              ? "Nicht genommen"
                              : status === "missed"
                                ? "Verpasst"
                                : "Offen"}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold mb-3">Logs</p>

            {selectedDateLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch nichts geloggt.</p>
            ) : (
              <div className="space-y-2">
                {selectedDateLogs.map((dose) => (
<div
  key={dose.id}
  className="flex items-center gap-3"
>
  <Link
    href={`/logging?dose=${dose.id}`}
    className="block flex-1 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.06] p-4 shadow-[0_0_20px_rgba(52,211,153,0.08)] transition-all active:scale-[0.98]"
  >
    <p className="font-medium">{dose.name}</p>
    <p className="text-xs text-muted-foreground mt-1">
      {dose.menge} mg • {dose.zeit || "--:--"}
      {dose.stelle ? ` • ${dose.stelle}` : ""}
    </p>
  </Link>

  <button
    onClick={() => deleteDoseFromCalendar(dose.id)}
    className="self-stretch px-5 rounded-2xl border border-red-400/20 bg-red-500/10 text-red-400 flex items-center justify-center active:scale-95"
  >
    <Trash2 className="w-5 h-5" />
  </button>
</div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Link
          href="/logging"
          className="mt-5 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 py-3 font-bold text-black"
        >
          Für diesen Tag loggen
        </Link>
      </div>
    </div>
  </div>
)}
      {showNotifications && (
        <div className="fixed inset-0 z-[80] flex items-end bg-black/80 backdrop-blur-md">
          <div className="w-full rounded-t-[32px] border-t border-white/10 bg-gradient-to-b from-[#111111] to-[#070707] p-6 max-h-[88vh] overflow-y-auto backdrop-blur-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Benachrichtigungen</h2>
                <p className="text-sm text-muted-foreground">{unreadCount} ungelesen</p>
              </div>
              <button onClick={() => setShowNotifications(false)} className="w-10 h-10 rounded-xl bg-[#111111] flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            {notifications.length > 0 && (
              <button onClick={markAllRead} className="mb-4 w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 font-medium backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.07]">
                Alle als gelesen markieren
              </button>
            )}

            {notifications.length === 0 ? (
              <div className="bg-[#111111] rounded-3xl p-8 text-center text-muted-foreground">
                Keine Benachrichtigungen.
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((n) => {
                  const read = readIds.includes(n.id)
                  const Icon = n.type === "low-stock" ? AlertTriangle : n.type === "dose" ? CalendarDays : Package

                  return (
                    <div key={n.id} className={`rounded-3xl border p-4 backdrop-blur-sm transition-all duration-200 ${read ? "border-white/5 bg-white/[0.03] opacity-60" : "border-emerald-400/20 bg-emerald-400/[0.06] shadow-[0_0_24px_rgba(52,211,153,0.06)]"}`}>
                      <div className="flex gap-3">
                        <div className="w-11 h-11 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>

                        <div className="flex-1">
                          <p className="font-semibold">{n.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>

                          <div className="flex gap-2 mt-4">
                            {n.href && (
                              <Link href={n.href} onClick={() => markRead(n.id)} className="flex-1 bg-primary py-2.5 rounded-xl text-sm font-medium text-center">
                                Öffnen
                              </Link>
                            )}

                            {!read && (
                              <button onClick={() => markRead(n.id)} className="flex-1 bg-[#181818] py-2.5 rounded-xl text-sm font-medium">
                                Gelesen
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
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
          ? "Dieses Gerät ist bereits registriert. Du bekommst Erinnerungen für Dosen, Training, Low Stock und Cycle-Ende."
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
      {showSettings && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/80 backdrop-blur-md">
          <div className="w-full rounded-t-[32px] border-t border-white/10 bg-gradient-to-b from-[#111111] to-[#070707] p-6 max-h-[88vh] overflow-y-auto backdrop-blur-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-semibold">Einstellungen</h2>
              <button onClick={() => setShowSettings(false)} className="text-3xl text-muted-foreground hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-[#111111] rounded-3xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Mein Account</p>
                    <p className="text-sm text-muted-foreground">Verwalte dein Profil</p>
                  </div>
                </div>

                <div className="py-4 border-t border-border/30">
                  <p className="text-xs text-muted-foreground mb-1">E-Mail Adresse</p>
                  <p className="font-medium text-lg">{email || "Wird geladen..."}</p>
                </div>
              </div>


            </div>
<button
  onClick={() => setShowPushModal(true)}
  className="mt-4 w-full rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.08] p-5 flex items-center gap-4 active:scale-[0.985]"
>
  <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center">
    <Bell className="w-6 h-6 text-emerald-400" />
  </div>

  <div className="text-left">
<p className="font-medium text-emerald-400">
  {pushEnabled ? "Benachrichtigungen aktiv" : "Benachrichtigungen"}
</p>
<p className="text-xs text-muted-foreground">
  {pushEnabled
    ? "Dieses Gerät ist für Push registriert"
    : "Push-Erinnerungen auf diesem Gerät aktivieren"}
</p>
  </div>
</button>

<Link
  href="/performance"
  className="mt-4 bg-[#111111] rounded-2xl p-5 flex items-center gap-4 border border-white/5 active:scale-[0.985]"
>
  <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center">
    <span className="text-emerald-400 text-xl">🏋️</span>
  </div>

  <div>
    <p className="font-medium text-emerald-400">Performance</p>
    <p className="text-xs text-muted-foreground">
      Strength, Combat & Cardio
    </p>
  </div>
</Link>

<div
  className="mt-4 bg-[#111111] rounded-2xl p-5 flex items-center gap-4 cursor-pointer active:scale-[0.985]"
  onClick={async () => {
    if (confirm("Wirklich ausloggen?")) {
      await supabase.auth.signOut()
      window.location.href = "/login"
    }
  }}
>
  <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
    <LogOut className="w-6 h-6 text-red-400" />
  </div>

  <p className="font-medium text-red-400">Ausloggen</p>
</div>
<div className="mt-10 text-center text-xs text-muted-foreground">
              CycleGuard v0.1 • cycleguard.xyz
            </div>
          </div>
        </div>
      )}
    </div>
  )
}