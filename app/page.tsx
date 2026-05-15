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
} from "lucide-react"

import { WeekCalendar } from "@/components/week-calendar"
import { BottomNav } from "@/components/bottom-nav"
import { supabase } from "@/lib/supabase"

const ORAL_TYPES = ["Oral", "AI (Aromatase Inhibitor)", "SARM", "PCT", "Supplement"]
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
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)

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

  const selectedDateLabel = new Date(selectedDate).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  })

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
        <WeekCalendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          markedDates={getWeekMarkedDates()}
        />

        <section className="mt-6">
          {loading ? (
            <div className="bg-[#0A0A0A] rounded-3xl p-8 text-center text-muted-foreground">
              Lade Dashboard...
            </div>
          ) : activeCycle ? (
            <div className="bg-[#0A0A0A] rounded-3xl p-6 border border-emerald-500/30">
              <p className="text-sm text-emerald-400 mb-1">Aktiver Cycle</p>
              <h2 className="text-3xl font-bold">{activeCycle.name}</h2>

              <div className="mt-5">
                <div className="flex justify-between text-sm mb-2">
                  <span>Zeit: Woche {timeProgress.week} von {timeProgress.total}</span>
                  <span>{timeProgress.percent}%</span>
                </div>
                <div className="h-2.5 bg-[#181818] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${timeProgress.percent}%` }} />
                </div>
              </div>

              <div className="mt-5">
                <div className="flex justify-between text-sm mb-2">
                  <span>Diese Woche erledigt</span>
                  <span>{weekDone}/{weekTotal} • {adherencePercent}%</span>
                </div>
                <div className="h-2.5 bg-[#181818] rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${adherencePercent}%` }} />
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
                  <div className="bg-[#111111] rounded-2xl p-3">
                    <p className="text-emerald-400 font-semibold">{weekDone}</p>
                    <p className="text-muted-foreground">Erledigt</p>
                  </div>
                  <div className="bg-[#111111] rounded-2xl p-3">
                    <p className="text-orange-400 font-semibold">{weekMissed}</p>
                    <p className="text-muted-foreground">Verpasst</p>
                  </div>
                  <div className="bg-[#111111] rounded-2xl p-3">
                    <p className="text-blue-400 font-semibold">{weekSkipped}</p>
                    <p className="text-muted-foreground">Nicht genommen</p>
                  </div>
                </div>
              </div>

              {timeProgress.endDate && (
                <p className="text-xs text-muted-foreground mt-4">
                  Ende ca. {timeProgress.endDate}
                </p>
              )}

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
        </section>

        {missedOpen.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Verpasst
            </h2>

            <div className="space-y-3">
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

        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{selectedDateLabel} anstehend</h2>
            <Link href="/logging" className="text-sm text-primary hover:underline">
              Öffnen
            </Link>
          </div>

          {selectedDue.length === 0 ? (
            <div className="bg-[#0A0A0A] rounded-3xl p-6 text-center text-muted-foreground border border-border/30">
              {activeCycle ? "An diesem Tag ist nichts geplant." : "Noch kein aktiver Cycle."}
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDue.map((item) => {
                const status = getStatus(item, selectedDate)

                return (
                  <Link
                    key={item.id}
                    href="/logging"
                    className={`block rounded-3xl p-5 border ${
                      status === "done"
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : status === "skipped"
                          ? "bg-blue-500/10 border-blue-500/30"
                          : status === "missed"
                            ? "bg-orange-500/10 border-orange-500/30"
                            : "bg-[#0A0A0A] border-primary/20"
                    }`}
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">
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
          <section className="mt-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Low Stock
            </h2>

            <div className="space-y-3">
              {lowStock.slice(0, 3).map((c) => (
                <Link key={c.id} href="/einkauf" className="block bg-orange-500/10 border border-orange-500/30 rounded-3xl p-5">
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

        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Letzte Logs
          </h2>

          {recentLogs.length === 0 ? (
            <div className="bg-[#0A0A0A] rounded-3xl p-6 text-center text-muted-foreground border border-border/30">
              Noch keine Logs.
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((dose) => (
                <Link key={dose.id} href="/logging" className="block bg-[#0A0A0A] rounded-3xl p-5 border border-border/30">
                  <p className="font-semibold">{dose.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {dose.menge} mg • {dose.datum} {dose.zeit}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-2 gap-3 mt-8">
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
              <button onClick={markAllRead} className="w-full bg-[#111111] py-3 rounded-2xl mb-4 font-medium">
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