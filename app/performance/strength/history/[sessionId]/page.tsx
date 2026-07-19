"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  Clock,
  Dumbbell,
  Loader2,
  Trash2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function WorkoutHistoryDetailPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [day, setDay] = useState<any>(null)
  const [sets, setSets] = useState<any[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    loadWorkout()
  }, [sessionId])

  const parseNumberInput = (value: string) => {
    if (value.trim() === "") return 0

    const normalized = value.replace(",", ".")
    const number = Number(normalized)

    return Number.isNaN(number) ? 0 : number
  }

  const loadWorkout = async () => {
    setLoading(true)

    const { data: sessionData, error: sessionError } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !sessionData) {
      toast.error("Workout nicht gefunden.")
      setLoading(false)
      return
    }

    setSession(sessionData)

    const { data: dayData } = await supabase
      .from("training_days")
      .select("*")
      .eq("id", sessionData.training_day_id)
      .single()

    setDay(dayData || null)

    const { data: setsData } = await supabase
      .from("workout_sets")
      .select("*")
      .eq("session_id", sessionId)
      .eq("completed", true)
      .order("exercise_entry_id", { ascending: true })
      .order("set_number", { ascending: true })

    setSets(setsData || [])

    const entryIds = Array.from(
      new Set((setsData || []).map((set) => set.exercise_entry_id))
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
        .order("position", { ascending: true })

      setEntries(entriesData || [])
    }

    setLoading(false)
  }

const deleteWorkout = async () => {
  if (!sessionId) return

  try {
    setDeleting(true)

    const { error: setsError } = await supabase
      .from("workout_sets")
      .delete()
      .eq("session_id", sessionId)

    if (setsError) throw setsError

    const { error: sessionError } = await supabase
      .from("workout_sessions")
      .delete()
      .eq("id", sessionId)

    if (sessionError) throw sessionError

    toast.success("Workout gelöscht.")
    router.push("/performance/strength")
  } catch (error: any) {
    toast.error("Workout konnte nicht gelöscht werden.")
    console.error(error)
  } finally {
    setDeleting(false)
  }
}

  const groupedExercises = useMemo(() => {
    return entries.map((entry) => ({
      entry,
      sets: sets.filter((set) => set.exercise_entry_id === entry.id),
    }))
  }, [entries, sets])

  const durationMinutes = useMemo(() => {
    if (!session?.started_at || !session?.finished_at) return 0

    return Math.max(
      1,
      Math.round(
        (new Date(session.finished_at).getTime() -
          new Date(session.started_at).getTime()) /
          60000
      )
    )
  }, [session])

  const totalVolume = useMemo(() => {
    return sets.reduce((sum, set) => {
      const kg = parseNumberInput(String(set.weight_kg ?? ""))
      const reps = Number(set.reps_done || 0)

      return sum + kg * reps
    }, 0)
  }, [sets])

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatTime = (value: string) => {
    return new Date(value).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

const isSecondsExercise = (entry: any) => {
  return entry?.tracking_type === "seconds"
}

const getRepsLabel = (entry: any) => {
  return isSecondsExercise(entry) ? "Sek." : "Wdh"
}

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] pb-24 text-white">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-80px] top-[-120px] h-[320px] w-[320px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[300px] w-[300px] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050505]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <Link
            href="/performance/strength"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>

          <div className="text-center">
            <h1 className="text-xl font-black">Workout</h1>
            <p className="text-xs text-muted-foreground">Zusammenfassung</p>
          </div>

          <div className="h-10 w-10" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pt-6">
        <section className="relative overflow-hidden rounded-[34px] border border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.14] via-white/[0.045] to-[#080808] p-6 shadow-[0_0_50px_rgba(52,211,153,0.12)] backdrop-blur-2xl">
          <div className="absolute right-[-50px] top-[-70px] h-[180px] w-[180px] rounded-full bg-emerald-400/15 blur-3xl" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[26px] bg-emerald-400 text-black shadow-[0_0_34px_rgba(52,211,153,0.38)]">
              <Dumbbell className="h-8 w-8" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
                Abgeschlossen
              </p>
              <h2 className="mt-1 truncate text-3xl font-black tracking-tight">
                {day?.name || "Workout"}
              </h2>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
              <div className="mb-2 flex items-center gap-2 text-emerald-300">
                <CalendarDays className="h-4 w-4" />
                <p className="text-xs font-black uppercase tracking-[0.18em]">
                  Datum
                </p>
              </div>
              <p className="text-sm font-bold">
                {formatDate(session.started_at)}
              </p>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
              <div className="mb-2 flex items-center gap-2 text-cyan-300">
                <Clock className="h-4 w-4" />
                <p className="text-xs font-black uppercase tracking-[0.18em]">
                  Uhrzeit
                </p>
              </div>
              <p className="text-sm font-bold">
                {formatTime(session.started_at)}
              </p>
            </div>
          </div>

            <div className="relative mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
                <p className="text-3xl font-black text-emerald-300">
                {durationMinutes}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Min</p>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
                <p className="truncate text-3xl font-black text-cyan-300">
                {Math.round(totalVolume).toLocaleString("de-DE")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">kg</p>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
                <p className="text-3xl font-black">
                {sets.length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Sets</p>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
                <p className="text-3xl font-black text-purple-300">
                {groupedExercises.length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Übungen</p>
            </div>
            </div>
        </section>

        <section className="mt-8 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black">Übungen</h2>

            <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-300">
              {sets.length} Sets
            </div>
          </div>

          {groupedExercises.map(({ entry, sets }) => {
            const exerciseVolume = sets.reduce((sum: number, set: any) => {
              const kg = parseNumberInput(String(set.weight_kg ?? ""))
              const reps = Number(set.reps_done || 0)
              return sum + kg * reps
            }, 0)

            return (
              <div
                key={entry.id}
                className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.025] shadow-2xl backdrop-blur-xl"
              >
                <div className="border-b border-white/10 p-5">
                  <h3 className="text-xl font-black">
                    {entry.exercise_library?.name || entry.name || "Übung"}
                  </h3>

                  <div className="mt-2 flex gap-3 text-sm text-muted-foreground">
                    <span>{sets.length} Sets</span>
                    <span>•</span>
                    <span>{Math.round(exerciseVolume).toLocaleString("de-DE")} kg Volumen</span>
                  </div>
                </div>

                <div className="space-y-2 p-4">
                  {sets.map((set: any) => (
                    <div
                      key={set.id}
                      className="grid grid-cols-[44px_1fr_1fr] items-center gap-2 rounded-[22px] border border-white/10 bg-black/35 p-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/10 text-sm font-black text-emerald-300">
                        {set.set_number}
                      </div>

                      <div className="rounded-[18px] border border-white/10 bg-black/40 px-3 py-3 text-center">
                        <p className="text-xs text-muted-foreground">kg</p>
                        <p className="text-lg font-black">
                          {String(set.weight_kg ?? "-").replace(".", ",")}
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-white/10 bg-black/40 px-3 py-3 text-center">
                        <p className="text-xs text-muted-foreground">
  {getRepsLabel(entry)}
</p>
                        <p className="text-lg font-black">
                          {set.reps_done ?? "-"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </section>
        <section className="mt-8">
  <button
    onClick={() => setShowDeleteConfirm(true)}
    className="mx-auto flex items-center justify-center gap-2 rounded-full border border-red-400/15 bg-red-500/10 px-5 py-3 text-sm font-black text-red-300 shadow-[0_0_20px_rgba(248,113,113,0.08)] active:scale-[0.98]"
  >
    <Trash2 className="h-4 w-4" />
    Workout aus Verlauf löschen
  </button>
</section>
      </main>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/80 px-4 pb-4 backdrop-blur-md sm:items-center sm:p-6">
          <div className="w-full max-w-md rounded-[32px] border border-red-400/15 bg-gradient-to-b from-[#141010] to-[#070707] p-6 shadow-2xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] border border-red-400/20 bg-red-500/10 text-red-300">
              <Trash2 className="h-8 w-8" />
            </div>

            <h2 className="text-center text-2xl font-black">
              Workout löschen?
            </h2>

            <p className="mx-auto mt-2 max-w-[320px] text-center text-sm leading-6 text-muted-foreground">
              Dieses Workout wird aus deinem Verlauf entfernt. Die Sätze und Statistiken davon werden danach nicht mehr gezählt.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="rounded-[22px] border border-white/10 bg-white/[0.05] py-4 font-black text-white/70 active:scale-[0.98] disabled:opacity-50"
              >
                Abbrechen
              </button>

              <button
                onClick={deleteWorkout}
                disabled={deleting}
                className="rounded-[22px] border border-red-400/20 bg-red-500/15 py-4 font-black text-red-300 active:scale-[0.98] disabled:opacity-50"
              >
                {deleting ? "Löscht..." : "Löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
