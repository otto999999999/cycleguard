"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ChevronLeft,
  BarChart3,
  Dumbbell,
  Clock,
  Flame,
  Trophy,
  CalendarDays,
  X,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import GymBottomNav from "@/components/gym-bottom-nav"

const formatDate = (value: string) => {
  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  })
}

const getDurationMinutes = (session: any) => {
  if (!session.started_at || !session.finished_at) return 0

  return Math.max(
    1,
    Math.round(
      (new Date(session.finished_at).getTime() -
        new Date(session.started_at).getTime()) /
        60000
    )
  )
}




const dateKeyLocal = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const getMonday = (date: Date) => {
  const copy = new Date(date)
  const dayIndex = (copy.getDay() + 6) % 7
  copy.setHours(0, 0, 0, 0)
  copy.setDate(copy.getDate() - dayIndex)
  return copy
}

export default function GymProgressPage() {
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<any[]>([])
  const [sets, setSets] = useState<any[]>([])
  const [days, setDays] = useState<any[]>([])
  const [showWeeksModal, setShowWeeksModal] = useState(false)
  useEffect(() => {
    loadProgress()
  }, [])
useEffect(() => {
  if (!showWeeksModal) return

  const oldOverflow = document.body.style.overflow
  document.body.style.overflow = "hidden"

  return () => {
    document.body.style.overflow = oldOverflow
  }
}, [showWeeksModal])
  const loadProgress = async () => {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const { data: sessionsData } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", user.id)
      .not("finished_at", "is", null)
      .is("cancelled_at", null)
      .order("finished_at", { ascending: false })
      .limit(500)

    const safeSessions = sessionsData || []
    setSessions(safeSessions)

    const sessionIds = safeSessions.map((session) => session.id)
    const dayIds = Array.from(
      new Set(safeSessions.map((session) => session.training_day_id).filter(Boolean))
    )

    if (sessionIds.length > 0) {
      const { data: setsData } = await supabase
        .from("workout_sets")
        .select("*")
        .in("session_id", sessionIds)
        .eq("completed", true)

      setSets(setsData || [])
    }

    if (dayIds.length > 0) {
      const { data: daysData } = await supabase
        .from("training_days")
        .select("*")
        .in("id", dayIds)

      setDays(daysData || [])
    }

    setLoading(false)
  }

  const stats = useMemo(() => {
    const totalWorkouts = sessions.length

    const totalMinutes = sessions.reduce(
      (sum, session) => sum + getDurationMinutes(session),
      0
    )

    const totalVolume = sets.reduce((sum, set) => {
      const kg = Number(set.weight_kg || 0)
      const reps = Number(set.reps_done || 0)
      return sum + kg * reps
    }, 0)

    const totalSets = sets.length

    const avgMinutes =
      totalWorkouts > 0 ? Math.round(totalMinutes / totalWorkouts) : 0

    return {
      totalWorkouts,
      totalMinutes,
      totalVolume,
      totalSets,
      avgMinutes,
    }
  }, [sessions, sets])

const weekDays = useMemo(() => {
  const today = new Date()
  const dayIndex = (today.getDay() + 6) % 7

  const monday = new Date(today)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(today.getDate() - dayIndex)

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)

    const key = dateKeyLocal(date)

    const daySessions = sessions.filter((session) => {
      const value = session.finished_at || session.started_at
      if (!value) return false

      return dateKeyLocal(new Date(value)) === key
    })

    return {
      key,
      label: date.toLocaleDateString("de-DE", { weekday: "short" }),
      count: daySessions.length,
      isToday: key === dateKeyLocal(new Date()),
    }
  })
}, [sessions])
const weeklyGoal = 5
const allWeeks = useMemo(() => {
  if (sessions.length === 0) return []

  const sessionDates = sessions
    .map((session) => new Date(session.finished_at || session.started_at))
    .filter((date) => !Number.isNaN(date.getTime()))

  if (sessionDates.length === 0) return []

  const firstDate = new Date(
    Math.min(...sessionDates.map((date) => date.getTime()))
  )

  const firstMonday = getMonday(firstDate)
  const currentMonday = getMonday(new Date())

  const weeks = []
  const cursor = new Date(firstMonday)

  while (cursor <= currentMonday) {
    const weekStart = new Date(cursor)

    const days = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + index)

      const key = dateKeyLocal(date)

      const daySessions = sessions.filter((session) => {
        const value = session.finished_at || session.started_at
        if (!value) return false

        return dateKeyLocal(new Date(value)) === key
      })

      return {
        key,
        label: date.toLocaleDateString("de-DE", { weekday: "short" }),
        count: daySessions.length,
      }
    })

    const completed = days.reduce((sum, day) => sum + day.count, 0)
    const progress = Math.min(100, Math.round((completed / weeklyGoal) * 100))

    weeks.push({
      key: dateKeyLocal(weekStart),
      title: `${weekStart.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
      })} - ${new Date(
        weekStart.getFullYear(),
        weekStart.getMonth(),
        weekStart.getDate() + 6
      ).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
      })}`,
      completed,
      progress,
      days,
    })

    cursor.setDate(cursor.getDate() + 7)
  }

  return weeks.reverse()
}, [sessions, weeklyGoal])


const completedThisWeek = weekDays.reduce((sum, day) => sum + day.count, 0)
const weeklyProgress = Math.min(
  100,
  Math.round((completedThisWeek / weeklyGoal) * 100)
)

const getTrainingDayName = (session: any) => {
    const day = days.find((day) => day.id === session.training_day_id)
    return day?.name || "Workout"
  }

  return (
    <div className="min-h-screen bg-[#050505] pb-36 text-white">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-emerald-500/10 blur-[140px]" />
        <div className="absolute bottom-[-120px] right-[-120px] h-[360px] w-[360px] rounded-full bg-cyan-500/10 blur-[140px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <Link
            href="/performance/strength"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] active:scale-95"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>

          <div className="text-center">
            <h1 className="text-xl font-black">Fortschritt</h1>
            <p className="text-xs text-muted-foreground">Gym-Statistik</p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
            <BarChart3 className="h-6 w-6" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pt-6">
        {loading ? (
          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 text-muted-foreground">
            Lade Fortschritt...
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-[34px] border border-emerald-400/20 bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.16),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] p-6 shadow-[0_0_45px_rgba(52,211,153,0.10)] backdrop-blur-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">
                Übersicht
              </p>

              <h2 className="mt-2 text-4xl font-black">
                {stats.totalWorkouts}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                abgeschlossene Workouts
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
                  <Clock className="mb-3 h-5 w-5 text-cyan-300" />
                  <p className="text-2xl font-black">{stats.avgMinutes || "--"} min</p>
                  <p className="text-xs text-muted-foreground">Ø Dauer</p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
                  <Dumbbell className="mb-3 h-5 w-5 text-emerald-300" />
                  <p className="text-2xl font-black">{stats.totalSets}</p>
                  <p className="text-xs text-muted-foreground">Sätze</p>
                </div>

                <div className="col-span-2 rounded-[24px] border border-cyan-400/15 bg-cyan-400/[0.06] p-4">
                  <Flame className="mb-3 h-5 w-5 text-cyan-300" />
                  <p className="text-3xl font-black text-cyan-300">
                    {stats.totalVolume > 0
                      ? `${stats.totalVolume.toLocaleString("de-DE")} kg`
                      : "--"}
                  </p>
                  <p className="text-xs text-muted-foreground">Gesamtvolumen</p>
                </div>
              </div>
            </section>

<section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-xl">
  <div className="mb-6 flex items-center justify-between">
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
        Wochenziel
      </p>
      <h2 className="mt-1 text-2xl font-black">Aktuelle Woche</h2>
    </div>

    <button
  type="button"
  onClick={() => setShowWeeksModal(true)}
  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 active:scale-95"
>
  <CalendarDays className="h-6 w-6" />
</button>
  </div>

  <div className="rounded-[26px] border border-emerald-400/15 bg-emerald-400/[0.06] p-5">
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-4xl font-black text-emerald-300">
          {completedThisWeek}/{weeklyGoal}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Einheiten erledigt
        </p>
      </div>

      <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-300">
        {weeklyProgress}%
      </div>
    </div>

    <div className="mt-5 h-3 overflow-hidden rounded-full bg-black/40">
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300 shadow-[0_0_18px_rgba(52,211,153,0.35)]"
        style={{ width: `${weeklyProgress}%` }}
      />
    </div>
  </div>

  <div className="mt-5 grid grid-cols-7 gap-1.5">
    {weekDays.map((day) => {
      const done = day.count > 0

      return (
        <div
          key={day.key}
          className={`rounded-2xl border px-1 py-3 text-center ${
            done
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
              : "border-white/10 bg-white/[0.035] text-white/35"
          }`}
        >
          <p className="text-[10px] font-black uppercase">
            {day.label}
          </p>

          <p className="mt-2 text-lg font-black">
            {done ? "✓" : "–"}
          </p>
        </div>
      )
    })}
  </div>
</section>

            <section>
              <h2 className="mb-4 text-2xl font-black">Letzte Workouts</h2>

              {sessions.length === 0 ? (
                <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 text-muted-foreground">
                  Noch keine abgeschlossenen Workouts.
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.slice(0, 8).map((session) => (
                    <Link
                      key={session.id}
                      href={`/performance/strength/history/${session.id}`}
                      className="block rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5 shadow-2xl backdrop-blur-xl active:scale-[0.98]"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="truncate text-xl font-black">
                            {getTrainingDayName(session)}
                          </h3>

                          <p className="mt-2 text-sm text-muted-foreground">
                            {formatDate(session.finished_at || session.started_at)} ·{" "}
                            {getDurationMinutes(session)} min
                          </p>
                        </div>

                        <Trophy className="h-6 w-6 shrink-0 text-emerald-300" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
{showWeeksModal && (
  <div className="fixed inset-0 z-[90] overflow-hidden bg-black/80 backdrop-blur-md">
    <div className="mx-auto flex h-dvh max-w-lg flex-col px-5 pt-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowWeeksModal(false)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="text-center">
          <h2 className="text-xl font-black">Alle Wochen</h2>
          <p className="text-xs text-muted-foreground">
            Seit deinem ersten Workout
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowWeeksModal(false)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="scrollbar-hide mt-6 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-28 [-webkit-overflow-scrolling:touch]">
        {allWeeks.length === 0 ? (
          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 text-center text-muted-foreground">
            Noch keine Wochen gefunden.
          </div>
        ) : (
          allWeeks.map((week) => (
            <section
              key={week.key}
              className="rounded-[30px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl backdrop-blur-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
                    Woche
                  </p>
                  <h3 className="mt-1 text-lg font-black">{week.title}</h3>
                </div>

                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-black text-emerald-300">
                  {week.progress}%
                </div>
              </div>

              <div className="rounded-[24px] border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-3xl font-black text-emerald-300">
                      {week.completed}/{weeklyGoal}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Einheiten erledigt
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/40">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300 shadow-[0_0_18px_rgba(52,211,153,0.35)]"
                    style={{ width: `${week.progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-1.5">
                {week.days.map((day) => {
                  const done = day.count > 0

                  return (
                    <div
                      key={day.key}
                      className={`rounded-2xl border px-1 py-3 text-center ${
                        done
                          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                          : "border-white/10 bg-white/[0.035] text-white/35"
                      }`}
                    >
                      <p className="text-[10px] font-black uppercase">
                        {day.label}
                      </p>

                      <p className="mt-2 text-lg font-black">
                        {done ? "✓" : "–"}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  </div>
)}
      <GymBottomNav active="progress" />
    </div>
  )
}