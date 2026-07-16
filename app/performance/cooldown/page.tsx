"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, Clock, Dumbbell, Flame, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import GymBottomNav from "@/components/gym-bottom-nav"
import MuscleBodyMap from "@/components/muscle-body-map"

type Status = "fresh" | "recovery" | "ready"

const getHoursAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime()
  return Math.max(0, Math.round(diff / (1000 * 60 * 60)))
}

const getStatusFromHours = (hours: number): Status => {
  if (hours <= 24) return "fresh"
  if (hours <= 72) return "recovery"
  return "ready"
}

const getStatusLabel = (status: Status) => {
  if (status === "fresh") return "Frisch"
  if (status === "recovery") return "Erholung"
  return "Bereit"
}

const getStatusText = (status: Status) => {
  if (status === "fresh") return "Hohe Belastung"
  if (status === "recovery") return "Mittlere Belastung"
  return "Geringe Belastung"
}

const getStatusClass = (status: Status) => {
  if (status === "fresh") return "bg-cyan-400 text-black border-cyan-300"
  if (status === "recovery") return "bg-blue-500/15 text-blue-300 border-blue-400/25"
  return "bg-white/10 text-cyan-100 border-cyan-100/20"
}

const getDotClass = (status: Status) => {
  if (status === "fresh") return "bg-cyan-300"
  if (status === "recovery") return "bg-blue-400"
  return "bg-cyan-100"
}

const getTimeText = (hours: number) => {
  if (hours < 1) return "gerade eben"
  if (hours < 24) return `vor ${hours}h trainiert`

  const days = Math.round(hours / 24)
  return days === 1 ? "vor 1 Tag trainiert" : `vor ${days} Tagen trainiert`
}

export default function CooldownPage() {
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<any[]>([])
  const [sets, setSets] = useState<any[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [days, setDays] = useState<any[]>([])

  useEffect(() => {
    loadCooldown()
  }, [])

  const loadCooldown = async () => {
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
      .limit(8)

    const safeSessions = sessionsData || []
    setSessions(safeSessions)

    const dayIds = Array.from(
      new Set(safeSessions.map((session) => session.training_day_id).filter(Boolean))
    )

    if (dayIds.length > 0) {
      const { data: daysData } = await supabase
        .from("training_days")
        .select("*")
        .in("id", dayIds)

      setDays(daysData || [])
    }

    const sessionIds = safeSessions.map((session) => session.id)

    if (sessionIds.length > 0) {
      const { data: setsData } = await supabase
        .from("workout_sets")
        .select("*")
        .in("session_id", sessionIds)
        .eq("completed", true)

      const safeSets = setsData || []
      setSets(safeSets)

      const entryIds = Array.from(
        new Set(safeSets.map((set) => set.exercise_entry_id).filter(Boolean))
      )

      if (entryIds.length > 0) {
        const { data: entriesData } = await supabase
          .from("training_day_exercises")
          .select(`
            *,
            exercise_library (
              id,
              name,
              category,
              muscle_group
            )
          `)
          .in("id", entryIds)

        setEntries(entriesData || [])
      }
    }

    setLoading(false)
  }

const normalizeMuscleGroup = (group: string) => {
  if (group === "Hamstrings") return "Quadrizeps"
  return group
}

  const recentTrainingDays = useMemo(() => {
    return sessions.map((session) => {
      const relatedDay = days.find((day) => day.id === session.training_day_id)
      const sessionSets = sets.filter((set) => set.session_id === session.id)

const muscleGroups = Array.from(
  new Set(
    sessionSets
      .map((set) => {
        const entry = entries.find((entry) => entry.id === set.exercise_entry_id)
        return entry?.exercise_library?.muscle_group
      })
      .filter(Boolean)
      .map((group) => normalizeMuscleGroup(group as string))
  )
)

      const hours = getHoursAgo(session.finished_at || session.started_at)
      const status = getStatusFromHours(hours)

      return {
        id: session.id,
        name: relatedDay?.name || "Workout",
        hours,
        status,
        muscleGroups,
      }
    })
  }, [sessions, sets, entries, days])

  const activeMuscles = useMemo(() => {
    const map: Record<string, Status> = {}

    recentTrainingDays.forEach((item) => {
      item.muscleGroups.forEach((muscle: string) => {
        const current = map[muscle]

        if (!current) {
          map[muscle] = item.status
          return
        }

        if (current === "ready" && item.status !== "ready") map[muscle] = item.status
        if (current === "recovery" && item.status === "fresh") map[muscle] = item.status
      })
    })

    return map
  }, [recentTrainingDays])

const getStatusForGroup = (group: string): Status => {
  return activeMuscles[group] || "ready"
}

  return (
    <div className="min-h-screen bg-[#050505] pb-44 text-white">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-100px] top-[-120px] h-[360px] w-[360px] rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute bottom-[-120px] right-[-100px] h-[360px] w-[360px] rounded-full bg-blue-500/10 blur-[140px]" />
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
            <h1 className="text-xl font-black">Cooldown</h1>
            <p className="text-xs text-muted-foreground">Muskel-Erholung</p>
          </div>

          <div className="h-12 w-12" />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-6">
        <section className="rounded-[34px] border border-cyan-400/20 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-5 shadow-[0_0_45px_rgba(34,211,238,0.10)] backdrop-blur-2xl">
<div className="grid grid-cols-2 gap-3">
<MuscleBodyMap side="front" getStatusForGroup={getStatusForGroup} />

<MuscleBodyMap side="back" getStatusForGroup={getStatusForGroup} />
</div>

<div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
  {[
    ["fresh", "Frisch", "hoch"],
    ["recovery", "Erholung", "mittel"],
    ["ready", "Bereit", "gering"],
  ].map(([status, title, sub]: any) => (
    <div key={status} className="text-center">
      <div className={`mx-auto h-3 w-3 rounded-full ${getDotClass(status)}`} />
      <p className="mt-2 text-xs font-black">{title}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  ))}
</div>
        </section>

        <section className="mt-8 pb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black">Letzte Trainingstage</h2>

            <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300">
              Recovery
            </div>
          </div>

          {loading ? (
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 text-muted-foreground">
              Lade Erholung...
            </div>
          ) : recentTrainingDays.length === 0 ? (
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 text-muted-foreground">
              Noch keine abgeschlossenen Workouts.
            </div>
          ) : (
            <div className="space-y-3">
              {recentTrainingDays.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5 shadow-2xl backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-cyan-400/20 bg-cyan-400/10">
                        <Dumbbell className="h-7 w-7 text-cyan-300" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-xl font-black">{item.name}</h3>

                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {getTimeText(item.hours)}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black ${getStatusClass(
                        item.status
                      )}`}
                    >
                      {getStatusLabel(item.status)}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.muscleGroups.length > 0 ? (
                      item.muscleGroups.map((muscle: string) => (
                        <span
                          key={muscle}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/65"
                        >
                          {muscle}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Keine Muskelgruppen gefunden
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    {item.status === "ready" ? (
                      <CheckCircle2 className="h-4 w-4 text-cyan-200" />
                    ) : (
                      <Flame className="h-4 w-4 text-cyan-300" />
                    )}
                    {getStatusText(item.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <GymBottomNav active="cooldown" />
    </div>
  )
}