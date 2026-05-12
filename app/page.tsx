"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Bell,
  Settings,
  Plus,
  Syringe,
  PlayCircle,
  User,
  LogOut,
  AlertTriangle,
  Check,
  Package,
  CalendarDays,
  X,
} from "lucide-react"
import { WeekCalendar } from "@/components/week-calendar"
import { BottomNav } from "@/components/bottom-nav"
import { supabase } from "@/lib/supabase"

const ORAL_TYPES = ["Oral", "AI (Aromatase Inhibitor)", "SARM", "PCT", "Supplement"]
const DAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
const READ_KEY = "cycleguard_read_notifications"

type NotificationItem = {
  id: string
  title: string
  message: string
  type: "low-stock" | "dose" | "cycle" | "info"
  href?: string
}

export default function CycleGuardDashboard() {
  const [showSettings, setShowSettings] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)

  const [activeCycle, setActiveCycle] = useState<any>(null)
  const [compounds, setCompounds] = useState<any[]>([])
  const [readIds, setReadIds] = useState<string[]>([])

  useEffect(() => {
    const saved = localStorage.getItem(READ_KEY)
    if (saved) setReadIds(JSON.parse(saved))
    loadDashboard()
  }, [])

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
      .maybeSingle()

    const { data: compoundData } = await supabase
      .from("compounds")
      .select("*")
      .eq("user_id", session.user.id)
      .order("name")

    setActiveCycle(cycleData || null)
    setCompounds(compoundData || [])
    setLoading(false)
  }

  const isOral = (c: any) => ORAL_TYPES.includes(c.type)

  const getQuantity = (c: any) => {
    if (isOral(c)) return c.remaining_pills ?? 0
    if (c.packaging === "Vial") return c.current_vials ?? 0
    return c.current_ampoules ?? 0
  }

  const getLowStock = () => {
    return compounds.filter((c) => {
      const qty = getQuantity(c)
      if (isOral(c)) return qty > 0 && qty < 20
      return qty <= 1
    })
  }

  const todayShort = DAYS[new Date().getDay()]

  const isDoseDueToday = (item: any) => {
    if (!activeCycle?.start_date) return false

    if (item.frequency === "Daily" || item.frequency === "Twice Daily") return true
    if (item.frequency === "Custom") return (item.customDays || []).includes(todayShort)

    const start = new Date(activeCycle.start_date)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - start.getTime()) / 86400000)

    if (item.frequency === "EOD") return diffDays % 2 === 0
    if (item.frequency === "E3D") return diffDays % 3 === 0
    if (item.frequency === "Weekly") return diffDays % 7 === 0

    return false
  }

  const dueToday = useMemo(() => {
    if (!activeCycle) return []
    const stack = [...(activeCycle.main_stack || []), ...(activeCycle.pct_stack || [])]
    return stack.filter(isDoseDueToday)
  }, [activeCycle])

  const notifications: NotificationItem[] = useMemo(() => {
    const items: NotificationItem[] = []

    getLowStock().forEach((c) => {
      items.push({
        id: `low-${c.id}-${getQuantity(c)}`,
        title: "Low Stock",
        message: `${c.name} ist niedrig: ${getQuantity(c)} ${isOral(c) ? "Pillen" : c.packaging || "Einheiten"} übrig.`,
        type: "low-stock",
        href: "/einkauf",
      })
    })

    dueToday.forEach((d) => {
      items.push({
        id: `dose-${activeCycle?.id}-${d.id}-${todayShort}`,
        title: "Heute fällig",
        message: `${d.name}: ${d.doseAmount} ${d.doseUnit} • ${d.frequency}`,
        type: "dose",
        href: "/logging",
      })
    })

    if (activeCycle) {
      items.push({
        id: `cycle-${activeCycle.id}`,
        title: "Aktiver Cycle",
        message: `${activeCycle.name} läuft aktuell.`,
        type: "cycle",
        href: "/cycle",
      })
    }

    return items
  }, [compounds, dueToday, activeCycle])

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length

  const markRead = (id: string) => {
    if (!readIds.includes(id)) saveReadIds([...readIds, id])
  }

  const markAllRead = () => {
    saveReadIds(notifications.map((n) => n.id))
  }

  const activeCompounds = activeCycle
    ? [...(activeCycle.main_stack || []), ...(activeCycle.pct_stack || [])]
    : []

  return (
    <div className="min-h-screen bg-[#050505] text-foreground pb-24">
      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-lg border-b border-border/20">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tighter">CycleGuard</h1>
            <p className="text-xs text-muted-foreground -mt-1">Dein Protokoll Manager</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNotifications(true)}
              className="relative w-10 h-10 rounded-2xl bg-[#0A0A0A] flex items-center justify-center border border-border/30"
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
              className="w-10 h-10 rounded-2xl bg-[#0A0A0A] flex items-center justify-center border border-border/30"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-6">
        <WeekCalendar />

        <div className="mt-6">
          {loading ? (
            <div className="bg-[#0A0A0A] rounded-3xl p-8 text-center text-muted-foreground">
              Lade Dashboard...
            </div>
          ) : activeCycle ? (
            <div className="bg-[#0A0A0A] rounded-3xl p-6 border border-emerald-500/30">
              <p className="text-sm text-emerald-400 mb-1">Aktiver Cycle</p>
              <h2 className="text-3xl font-bold">{activeCycle.name}</h2>
              <p className="text-muted-foreground mt-2">
                {activeCycle.duration_weeks} Wochen • Start: {activeCycle.start_date}
              </p>

              <Link href="/cycle" className="mt-5 inline-flex bg-primary px-5 py-3 rounded-2xl font-medium">
                Cycle öffnen
              </Link>
            </div>
          ) : (
            <div className="bg-[#0A0A0A] rounded-3xl p-8 text-center border border-border/30">
              <div className="mx-auto w-16 h-16 bg-[#111111] rounded-2xl flex items-center justify-center mb-5">
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
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Heute fällig</h2>
            <Link href="/logging" className="text-sm text-primary hover:underline">
              Loggen
            </Link>
          </div>

          {dueToday.length === 0 ? (
            <div className="bg-[#0A0A0A] rounded-3xl p-6 text-center text-muted-foreground border border-border/30">
              Heute keine geplanten Einträge.
            </div>
          ) : (
            <div className="space-y-3">
              {dueToday.map((d) => (
                <Link key={d.id} href="/logging" className="block bg-[#0A0A0A] rounded-3xl p-5 border border-primary/20">
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {d.doseAmount} {d.doseUnit} • {d.frequency}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-8 mb-4">
          <h2 className="text-lg font-semibold">Aktive Substanzen</h2>
          <Link href="/compounds" className="text-sm text-primary hover:underline">
            Alle verwalten
          </Link>
        </div>

        {activeCompounds.length === 0 ? (
          <div className="bg-[#0A0A0A] rounded-3xl p-8 text-center border border-border/30">
            <div className="mx-auto w-16 h-16 bg-[#111111] rounded-2xl flex items-center justify-center mb-4">
              <Syringe className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Keine aktiven Substanzen</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-[260px] mx-auto">
              Füge Substanzen hinzu oder starte einen Cycle.
            </p>
            <Link href="/compounds" className="bg-primary px-6 py-3 rounded-2xl font-medium inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Substanz hinzufügen
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {activeCompounds.map((c) => (
              <div key={c.id} className="bg-[#0A0A0A] rounded-3xl p-5 border border-border/30">
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Woche {c.startWeek}–{c.endWeek} • {c.doseAmount} {c.doseUnit} • {c.frequency}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-6">
          <Link href="/logging" className="bg-primary rounded-2xl py-4 text-sm font-semibold flex items-center justify-center gap-2">
            <Syringe className="w-4 h-4" />
            Dosis eintragen
          </Link>

          <Link href="/compounds" className="bg-[#0A0A0A] border border-border/50 rounded-2xl py-4 text-sm font-semibold flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Substanz hinzufügen
          </Link>
        </div>
      </main>

      <BottomNav />

      {showNotifications && (
        <div className="fixed inset-0 bg-black/90 z-[80] flex items-end">
          <div className="bg-[#0A0A0A] w-full rounded-t-3xl p-6 max-h-[88vh] overflow-y-auto">
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
              <button onClick={markAllRead} className="w-full bg-[#111111] py-3 rounded-2xl mb-4 font-medium flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                Alle als gelesen markieren
              </button>
            )}

            {notifications.length === 0 ? (
              <div className="bg-[#111111] rounded-3xl p-8 text-center text-muted-foreground">
                Keine Benachrichtigungen.
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => {
                  const read = readIds.includes(n.id)
                  const Icon = n.type === "low-stock" ? AlertTriangle : n.type === "dose" ? CalendarDays : Package

                  return (
                    <div key={n.id} className={`bg-[#111111] rounded-3xl p-4 border ${read ? "border-white/5 opacity-60" : "border-primary/30"}`}>
                      <div className="flex gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>

                        <div className="flex-1">
                          <p className="font-semibold">{n.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{n.message}</p>

                          <div className="flex gap-2 mt-4">
                            {n.href && (
                              <Link
                                href={n.href}
                                onClick={() => markRead(n.id)}
                                className="flex-1 bg-primary py-2.5 rounded-xl text-sm font-medium text-center"
                              >
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

      {showSettings && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-end">
          <div className="bg-[#0A0A0A] w-full rounded-t-3xl p-6 max-h-[88vh] overflow-y-auto">
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

              <div
                className="bg-[#111111] rounded-2xl p-5 flex items-center gap-4 cursor-pointer active:scale-[0.985]"
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