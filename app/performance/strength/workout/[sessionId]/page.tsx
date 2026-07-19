"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ChevronLeft,
  Check,
  Dumbbell,
  Flag,
  Loader2,
  Minus,
Plus,
Pause,
Play,
Timer,
Trophy,
ChevronDown,
ChevronUp,
Circle,
CheckCircle2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function WorkoutPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [day, setDay] = useState<any>(null)
  const [sets, setSets] = useState<any[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [savingSetId, setSavingSetId] = useState<string | null>(null)
  const [openEntryId, setOpenEntryId] = useState<string | null>(null)
  const [restSeconds, setRestSeconds] = useState(0)
  const [showRestModal, setShowRestModal] = useState(false)
  const [workoutElapsedSeconds, setWorkoutElapsedSeconds] = useState(0)
  const [isRestRunning, setIsRestRunning] = useState(false)
  const restFinishedNotifiedRef = useRef(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null)
  useEffect(() => {
    loadWorkout()
  }, [sessionId])

useEffect(() => {
  if (!sessionId) return

  localStorage.setItem("cycleguard_active_workout_session", sessionId)

  return () => {
    // Nicht hier löschen, weil iOS/PWA die Seite nur neu laden kann.
    // Gelöscht wird nur bei Abbrechen oder Fertig.
  }
}, [sessionId])

useEffect(() => {
  if (!isRestRunning || !restEndsAt) return

  const tick = () => {
    const remaining = Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000))

    setRestSeconds(remaining)

    if (remaining <= 0) {
      setIsRestRunning(false)
      setRestEndsAt(null)
      localStorage.removeItem("cycleguard_rest_ends_at")

      if (!restFinishedNotifiedRef.current) {
        restFinishedNotifiedRef.current = true
        notifyRestFinished()
      }
    }
  }

  tick()

  const interval = setInterval(tick, 1000)

  return () => clearInterval(interval)
}, [isRestRunning, restEndsAt])

useEffect(() => {
  if (!session?.started_at) return

  const tick = () => {
    const elapsed = Math.max(
      0,
      Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
    )

    setWorkoutElapsedSeconds(elapsed)
  }

  tick()

  const interval = setInterval(tick, 1000)

  return () => clearInterval(interval)
}, [session?.started_at])

useEffect(() => {
  const savedEndsAt = localStorage.getItem("cycleguard_rest_ends_at")

  if (!savedEndsAt) return

  const endsAt = Number(savedEndsAt)
  const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))

  if (remaining > 0) {
    setRestEndsAt(endsAt)
    setRestSeconds(remaining)
    setIsRestRunning(true)
  } else {
    localStorage.removeItem("cycleguard_rest_ends_at")
  }
}, [])

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
      .order("exercise_entry_id", { ascending: true })
      .order("set_number", { ascending: true })

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
        
const sortedEntries = [...(entriesData || [])].sort((a, b) => {
  const aPos = Number(a.position ?? 9999)
  const bPos = Number(b.position ?? 9999)

  if (aPos !== bPos) return aPos - bPos

  return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
})

if (!openEntryId && sortedEntries.length > 0) {
  setOpenEntryId(sortedEntries[0].id)
}

const exerciseIds = Array.from(
  new Set(
    sortedEntries
      .map((entry: any) => entry.exercise_id)
      .filter(Boolean)
  )
)

const { data: oldSets } =
  exerciseIds.length > 0
    ? await supabase
        .from("workout_sets")
        .select(`
          *,
          workout_sessions!inner (
            id,
            started_at,
            finished_at,
            cancelled_at
          ),
          training_day_exercises!inner (
            id,
            exercise_id
          )
        `)
        .in("training_day_exercises.exercise_id", exerciseIds)
        .neq("session_id", sessionId)
        .eq("completed", true)
        .not("workout_sessions.finished_at", "is", null)
        .is("workout_sessions.cancelled_at", null)
    : { data: [] }

const lastWeightByExerciseAndSet = new Map<string, number>()

;(oldSets || [])
  .sort((a: any, b: any) => {
    const aTime = new Date(
      a.workout_sessions?.finished_at ||
        a.workout_sessions?.started_at ||
        0
    ).getTime()

    const bTime = new Date(
      b.workout_sessions?.finished_at ||
        b.workout_sessions?.started_at ||
        0
    ).getTime()

    return bTime - aTime
  })
  .forEach((set: any) => {
    const exerciseId = set.training_day_exercises?.exercise_id
    if (!exerciseId) return

    const key = `${exerciseId}-${set.set_number}`

    if (!lastWeightByExerciseAndSet.has(key) && set.weight_kg != null) {
      lastWeightByExerciseAndSet.set(key, set.weight_kg)
    }
  })

const preparedSets = (setsData || []).map((set: any) => {
  const entry = sortedEntries.find(
    (entry: any) => entry.id === set.exercise_entry_id
  )

  const key = `${entry?.exercise_id}-${set.set_number}`

  return {
    ...set,
    reps_done: set.reps_done ?? getTargetReps(entry),
    weight_kg: set.weight_kg ?? lastWeightByExerciseAndSet.get(key) ?? "",
  }
})

setSets(preparedSets)
      setEntries(sortedEntries)
      
    }

    setLoading(false)
  }

  const groupedExercises = useMemo(() => {
    return entries.map((entry) => ({
      entry,
      sets: sets.filter((set) => set.exercise_entry_id === entry.id),
    }))
  }, [entries, sets])

  const completedCount = sets.filter((set) => set.completed).length
  const totalCount = sets.length
  const progress =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const restTargetSeconds = Number(session?.rest_seconds ?? session?.rest_time ?? 120)
const notifyRestFinished = async () => {
  toast.success("Pause vorbei. Weiter trainieren!")

  if ("vibrate" in navigator) {
    navigator.vibrate([250, 120, 250])
  }

  if (!("Notification" in window)) return
  if (Notification.permission !== "granted") return

  const registration = await navigator.serviceWorker.getRegistration("/sw.js")

  if (registration) {
    registration.showNotification("Pause vorbei", {
      body: "Weiter trainieren 💪",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "rest-timer-finished",
    })
  } else {
    new Notification("Pause vorbei", {
      body: "Weiter trainieren 💪",
      icon: "/icon-192.png",
    })
  }
}

const formatWorkoutTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = String(seconds % 60).padStart(2, "0")

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${secs}`
  }

  return `${minutes}:${secs}`
}

const formatRestTime = (seconds: number) => {
  const min = Math.floor(seconds / 60)
  const sec = String(seconds % 60).padStart(2, "0")
  return `${min}:${sec}`
}

const parseNumberInput = (value: string) => {
  if (value.trim() === "") return null

  const normalized = value.replace(",", ".")
  const number = Number(normalized)

  return Number.isNaN(number) ? null : number
}

const startRestTimer = (seconds = restTargetSeconds) => {
  restFinishedNotifiedRef.current = false

  const endsAt = Date.now() + seconds * 1000

  setRestEndsAt(endsAt)
  setRestSeconds(seconds)
  setIsRestRunning(true)

  localStorage.setItem("cycleguard_rest_ends_at", String(endsAt))

  supabase.auth.getUser().then(({ data }) => {
    const userId = data.user?.id

    if (!userId) return

    supabase.from("rest_timers").insert({
      user_id: userId,
      session_id: sessionId,
      ends_at: new Date(endsAt).toISOString(),
    })
  })
}
const getTargetReps = (entry: any) => {
  const raw = String(entry?.reps || "").trim()

  if (!raw) return ""

  const match = raw.match(/\d+/)
  return match ? Number(match[0]) : ""
}

const isSecondsExercise = (entry: any) => {
  return entry?.tracking_type === "seconds"
}

const getRepsLabel = (entry: any) => {
  return isSecondsExercise(entry) ? "Sek." : "Wdh."
}

  const updateSet = async (setId: string, updates: any) => {
    setSavingSetId(setId)

    setSets((prev) =>
      prev.map((set) =>
        set.id === setId
          ? {
              ...set,
              ...updates,
            }
          : set
      )
    )

    const { error } = await supabase
      .from("workout_sets")
      .update(updates)
      .eq("id", setId)

    if (error) {
      toast.error("Satz konnte nicht gespeichert werden.")
      await loadWorkout()
    }

    setSavingSetId(null)
  }

const toggleSet = async (set: any) => {
  const willComplete = !set.completed

  await updateSet(set.id, {
    completed: willComplete,
weight_kg:
  set.weight_kg === "" || set.weight_kg == null
    ? null
    : parseNumberInput(String(set.weight_kg)),
    reps_done:
      set.reps_done === "" || set.reps_done == null
        ? null
        : Number(set.reps_done),
  })

  if (willComplete) {
    startRestTimer()
  }
}
const cancelWorkout = async () => {
  const { error } = await supabase
    .from("workout_sessions")
    .update({
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", sessionId)

  if (error) {
    toast.error("Workout konnte nicht abgebrochen werden.")
    return
  }
  localStorage.removeItem("cycleguard_active_workout_session")
  router.push("/performance/strength")
}
const getWorkoutSummaryMessage = async () => {
  const completedSets = sets.filter((set) => set.completed)

  const volume = completedSets.reduce((sum, set) => {
    const kg = Number(set.weight_kg || 0)
    const reps = Number(set.reps_done || 0)

    return sum + kg * reps
  }, 0)

  const bestTodayByExercise = new Map<string, any>()

  completedSets.forEach((set) => {
    const entry = entries.find((entry) => entry.id === set.exercise_entry_id)
    const exerciseId = entry?.exercise_id
    if (!exerciseId) return

    const weight = Number(set.weight_kg || 0)
    const current = bestTodayByExercise.get(exerciseId)

    if (!current || weight > Number(current.weight_kg || 0)) {
      bestTodayByExercise.set(exerciseId, {
        ...set,
        exerciseName: entry?.exercise_library?.name || "Übung",
        exerciseId,
      })
    }
  })

  const exerciseIds = Array.from(bestTodayByExercise.keys())

  if (exerciseIds.length === 0) {
    return `Workout abgeschlossen. ${completedSets.length} Sätze erledigt.`
  }

  const { data: oldSets } = await supabase
    .from("workout_sets")
    .select(`
      *,
      workout_sessions!inner (
        id,
        started_at,
        finished_at,
        cancelled_at
      ),
      training_day_exercises!inner (
        exercise_id,
        exercise_library (
          name
        )
      )
    `)
    .in("training_day_exercises.exercise_id", exerciseIds)
    .neq("session_id", sessionId)
    .eq("completed", true)
    .not("workout_sessions.finished_at", "is", null)
    .is("workout_sessions.cancelled_at", null)

  const previousBestByExercise = new Map<string, number>()

  ;(oldSets || []).forEach((set: any) => {
    const exerciseId = set.training_day_exercises?.exercise_id
    if (!exerciseId) return

    const weight = Number(set.weight_kg || 0)
    const current = previousBestByExercise.get(exerciseId) || 0

    if (weight > current) {
      previousBestByExercise.set(exerciseId, weight)
    }
  })

  const improvements = Array.from(bestTodayByExercise.values())
    .map((set: any) => {
      const previousBest = previousBestByExercise.get(set.exerciseId) || 0
      const todayWeight = Number(set.weight_kg || 0)
      const diff = todayWeight - previousBest

      return {
        exerciseName: set.exerciseName,
        todayWeight,
        previousBest,
        diff,
        reps: Number(set.reps_done || 0),
      }
    })
    .filter((item) => item.previousBest > 0 && item.diff > 0)
    .sort((a, b) => b.diff - a.diff)

  if (improvements.length > 0) {
    const best = improvements[0]

    return `Stark. ${best.exerciseName} +${best.diff} kg verbessert. Heute ${best.todayWeight} kg${
      best.reps > 0 ? ` × ${best.reps}` : ""
    }. Volumen: ${volume.toLocaleString("de-DE")} kg.`
  }

  return `Workout abgeschlossen. Keine neue Gewichtssteigerung erkannt. ${completedSets.length} Sätze, ${volume.toLocaleString(
    "de-DE"
  )} kg Volumen.`
}
  const finishWorkout = async () => {
    if (completedCount === 0) {
      toast.error("Logge mindestens einen Satz.")
      return
    }

    const { error } = await supabase
      .from("workout_sessions")
      .update({
        finished_at: new Date().toISOString(),
      })
      .eq("id", sessionId)

    if (error) {
      toast.error("Workout konnte nicht beendet werden.")
      return
    }

localStorage.removeItem("cycleguard_active_workout_session")

const summaryMessage = await getWorkoutSummaryMessage()

toast.success(summaryMessage, {
  duration: 7000,
})

router.push("/performance/strength")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] pb-32 text-white">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-80px] top-[-120px] h-[320px] w-[320px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

<header className="sticky top-0 z-50 border-b border-white/10 bg-[#050505]/80 backdrop-blur-2xl">
  <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
<button
  onClick={() => setShowCancelModal(true)}
  className="flex h-12 items-center gap-2 rounded-[22px] border border-red-400/15 bg-red-500/[0.08] px-4 text-sm font-black text-red-300 active:scale-95"
>
  <ChevronLeft className="h-5 w-5" />
  Abbrechen
</button>

    <div className="min-w-0 px-3 text-center">
      <h1 className="truncate text-lg font-black tracking-tight">
        {day?.name || "Workout"}
      </h1>
      <p className="text-xs text-muted-foreground">
        {completedCount}/{totalCount} Sätze
      </p>
    </div>

    <button
      onClick={finishWorkout}
      disabled={completedCount === 0}
      className={`rounded-[22px] border px-5 py-3 text-sm font-black active:scale-95 ${
        completedCount > 0
          ? "border-emerald-400/25 bg-emerald-400 text-black shadow-[0_0_24px_rgba(52,211,153,0.30)]"
          : "border-white/10 bg-white/[0.04] text-white/30"
      }`}
    >
      Fertig
    </button>
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
        Live Workout
      </p>
      <h2 className="mt-1 truncate text-3xl font-black tracking-tight">
        {day?.name || "Training"}
      </h2>
    </div>
  </div>

  <div className="relative mt-6 grid grid-cols-3 gap-2">
    <div className="rounded-[22px] border border-white/10 bg-black/25 p-3 text-center">
      <p className="text-2xl font-black text-emerald-300">{completedCount}</p>
      <p className="text-xs text-muted-foreground">Sets</p>
    </div>

    <div className="rounded-[22px] border border-white/10 bg-black/25 p-3 text-center">
      <p className="text-2xl font-black">{progress}%</p>
      <p className="text-xs text-muted-foreground">Fortschritt</p>
    </div>

    <div className="rounded-[22px] border border-white/10 bg-black/25 p-3 text-center">
      <p className="text-2xl font-black text-cyan-300">
        {sets.reduce((sum, set) => {
          const kg = parseNumberInput(String(set.weight_kg ?? "")) || 0
          const reps = Number(set.reps_done || 0)
          return sum + kg * reps
        }, 0).toLocaleString("de-DE")}
      </p>
      <p className="text-xs text-muted-foreground">Volumen</p>
    </div>
  </div>

  <div className="relative mt-5 h-3 overflow-hidden rounded-full bg-black/40">
    <div
      className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300 shadow-[0_0_18px_rgba(52,211,153,0.45)] transition-all duration-500"
      style={{ width: `${progress}%` }}
    />
  </div>
</section>
<section className="mt-5 overflow-hidden rounded-[30px] border border-emerald-400/20 bg-gradient-to-br from-emerald-500/[0.14] via-white/[0.04] to-[#101010] p-5 shadow-[0_0_36px_rgba(52,211,153,0.12)] backdrop-blur-xl">
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
        Workout läuft
      </p>

      <p className="mt-2 text-5xl font-black tracking-[-0.06em] text-white">
        {formatWorkoutTime(workoutElapsedSeconds)}
      </p>

      <p className="mt-2 text-sm font-bold text-muted-foreground">
        Seit Beginn dieses Trainings
      </p>
    </div>

    <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-emerald-400/20 bg-emerald-400/10">
      <Timer className="h-8 w-8 text-emerald-300" />
    </div>
  </div>
</section>
        <section className="mt-8 space-y-5">
          {groupedExercises.map(({ entry, sets }) => {
  const isOpen = openEntryId === entry.id
  const doneSets = sets.filter((set: any) => set.completed).length

  return (
            
<div
  key={entry.id}
  className={`overflow-hidden rounded-[34px] border shadow-2xl backdrop-blur-2xl transition-all duration-300 ${
  isOpen
    ? "border-emerald-400/20 bg-gradient-to-br from-white/[0.075] to-emerald-400/[0.045] shadow-[0_0_36px_rgba(52,211,153,0.10)]"
    : "border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.025]"
}`}
>
<button
  onClick={() => setOpenEntryId(isOpen ? null : entry.id)}
  className="flex w-full items-center justify-between gap-4 p-5 text-left active:scale-[0.99]"
>
  <div className="min-w-0">
<div className="flex items-start gap-2">
  <h3 className="min-w-0 flex-1 break-words text-xl font-black leading-tight tracking-tight">
    {entry.exercise_library?.name || entry.name || "Übung"}
  </h3>

  {sets.some((set: any) => set.completed) && (
    <div className="shrink-0 rounded-full bg-emerald-400/15 px-2 py-1">
      <Trophy className="h-4 w-4 text-amber-300" />
    </div>
  )}
</div>

    <p className="mt-1 text-sm text-muted-foreground">
      {entry.sets || 3} Sätze • {entry.reps || "--"}{" "}
      {isSecondsExercise(entry) ? "Sek." : "Wdh."}
      {entry.warmup_sets > 0 ? ` • ${entry.warmup_sets} Warmup` : ""}
    </p>
  </div>

  <div className="flex shrink-0 items-center gap-3">
    <p className="text-sm font-black text-muted-foreground">
      {doneSets}/{sets.length}
    </p>

    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
      {isOpen ? (
        <ChevronUp className="h-5 w-5 text-emerald-300" />
      ) : (
        <ChevronDown className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  </div>
</button>


              {isOpen && (
  <div className="space-y-3 p-4">
                {sets.map((set: any) => {
                  const isWarmup =
                    entry.warmup_sets > 0 &&
                    set.set_number <= entry.warmup_sets

                  return (
                    <div
                      key={set.id}
                      className={`grid grid-cols-[38px_1fr_1fr_46px] items-center gap-2 rounded-[22px] border p-3 transition-all duration-200 ${
                        set.completed
                          ? "border-emerald-400/25 bg-emerald-400/10"
                          : "border-white/10 bg-black/30"
                      }`}
                    >
                      <div>
                        <p className="text-center text-xs text-muted-foreground">
                          {isWarmup ? "W" : "S"}
                        </p>
                        <p className="text-center font-black">
                          {isWarmup
                            ? set.set_number
                            : set.set_number - (entry.warmup_sets || 0)}
                        </p>
                      </div>

<input
  inputMode="decimal"
  placeholder="kg"
  value={set.weight_kg ?? ""}
  onChange={(e) => {
    const value = e.target.value

    setSets((prev) =>
      prev.map((item) =>
        item.id === set.id
          ? {
              ...item,
              weight_kg: value,
            }
          : item
      )
    )
  }}
  className="min-w-0 rounded-[18px] border border-white/10 bg-black/45 px-3 py-3.5 text-center text-lg font-black outline-none placeholder:text-white/20 focus:border-emerald-400/40 focus:bg-black/60"
/>

                      <input
                        inputMode="numeric"
                        placeholder={getRepsLabel(entry)}
                        value={set.reps_done ?? ""}
                        onChange={(e) =>
                          updateSet(set.id, {
                            reps_done:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                        className="min-w-0 rounded-[18px] border border-white/10 bg-black/45 px-3 py-3.5 text-center text-lg font-black outline-none placeholder:text-white/20 focus:border-emerald-400/40 focus:bg-black/60"
                      />

                      <button
                        onClick={() => toggleSet(set)}
                        disabled={savingSetId === set.id}
                        className={`flex h-11 w-11 items-center justify-center rounded-xl active:scale-95 ${
                          set.completed
                            ? "bg-emerald-400 text-black"
                            : "bg-white/10 text-white/50"
                        }`}
                      >
                        {set.completed ? (
  <CheckCircle2 className="h-6 w-6" />
) : (
  <Circle className="h-6 w-6" />
)}
                      </button>
                    </div>
                    
                  )
                })}
              </div>
              )}
            </div>
            
            )
})}
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/80 p-4 backdrop-blur-2xl">
        <div className="mx-auto max-w-lg">
            <button
  onClick={() => setShowRestModal(true)}
  className="mb-3 flex w-full items-center justify-between rounded-[24px] border border-purple-400/20 bg-gradient-to-r from-purple-500/[0.18] to-white/[0.05] px-5 py-4 shadow-2xl backdrop-blur-xl active:scale-[0.98]"
>
  <div className="flex items-center gap-3">
    <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-purple-400/15">
      <Timer className="h-5 w-5 text-purple-300" />
    </div>

    <div className="text-left">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-300">
        Satzpause
      </p>
      <p className="text-sm font-bold text-muted-foreground">
        Tippen zum Bearbeiten
      </p>
    </div>
  </div>

  <p className="text-2xl font-black text-white">
    {formatRestTime(restSeconds)}
  </p>
</button>
          <button
            onClick={finishWorkout}
            className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-gradient-to-r from-emerald-400 to-emerald-500 py-4 text-base font-black text-black shadow-[0_0_30px_rgba(52,211,153,0.35)] active:scale-[0.98]"
          >
            <Flag className="h-5 w-5" />
            Workout beenden
          </button>
        </div>
      </div>
      {showCancelModal && (
  <div className="fixed inset-0 z-[90] flex items-end bg-black/80 backdrop-blur-md">
    <div className="w-full rounded-t-[34px] border-t border-white/10 bg-gradient-to-b from-[#151515] to-[#070707] p-6 shadow-2xl">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] border border-red-400/20 bg-red-500/10">
        <ChevronLeft className="h-8 w-8 text-red-400" />
      </div>

      <h2 className="text-center text-2xl font-black">
        Workout abbrechen?
      </h2>

      <p className="mx-auto mt-3 max-w-[320px] text-center text-sm text-muted-foreground">
        Dieses Workout wird als abgebrochen markiert und zählt nicht als abgeschlossenes Training.
      </p>

      <div className="mt-7 space-y-3">
        <button
          onClick={cancelWorkout}
          className="w-full rounded-[22px] border border-red-400/20 bg-red-500/15 py-4 font-black text-red-300 active:scale-[0.98]"
        >
          Ja, abbrechen
        </button>

        <button
          onClick={() => setShowCancelModal(false)}
          className="w-full rounded-[22px] border border-white/10 bg-white/[0.05] py-4 font-black text-white active:scale-[0.98]"
        >
          Weiter trainieren
        </button>
      </div>
    </div>
  </div>
)}
{showRestModal && (
  <div className="fixed inset-0 z-[95] flex items-end bg-black/80 backdrop-blur-md">
    <div className="w-full rounded-t-[34px] border-t border-white/10 bg-gradient-to-b from-[#151515] to-[#070707] p-6 shadow-2xl">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] border border-purple-400/20 bg-purple-500/10">
        <Timer className="h-8 w-8 text-purple-300" />
      </div>

      <h2 className="text-center text-2xl font-black">Satzpause</h2>

      <p className="mt-3 text-center text-6xl font-black tracking-[-0.07em]">
        {formatRestTime(restSeconds)}
      </p>

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-black/40">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-400 to-emerald-400 transition-all duration-500"
          style={{
            width: `${restTargetSeconds > 0 ? (restSeconds / restTargetSeconds) * 100 : 0}%`,
          }}
        />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {[60, 120, 180].map((seconds) => (
          <button
            key={seconds}
            onClick={() => startRestTimer(seconds)}
            className="rounded-2xl border border-white/10 bg-white/[0.04] py-3 text-sm font-black text-white/80 active:scale-95"
          >
            {seconds / 60} min
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
            onClick={() => {
            if (restSeconds <= 0) {
                startRestTimer()
                return
            }

            if (isRestRunning) {
                setIsRestRunning(false)
                setRestEndsAt(null)
                localStorage.removeItem("cycleguard_rest_ends_at")
                return
            }

            startRestTimer(restSeconds)
            }}
          className={`rounded-[22px] py-4 font-black active:scale-[0.98] ${
            isRestRunning
              ? "bg-orange-400/15 text-orange-300"
              : "bg-emerald-400 text-black"
          }`}
        >
          {restSeconds <= 0 ? "Start" : isRestRunning ? "Pausieren" : "Weiter"}
        </button>

        <button
          onClick={() => {
            setRestSeconds(0)
            setIsRestRunning(false)
            setRestEndsAt(null)
            localStorage.removeItem("cycleguard_rest_ends_at")
          }}
          className="rounded-[22px] border border-white/10 bg-white/[0.05] py-4 font-black text-white active:scale-[0.98]"
        >
          Reset
        </button>
      </div>

      <button
        onClick={() => setShowRestModal(false)}
        className="mt-3 w-full rounded-[22px] border border-white/10 bg-white/[0.04] py-4 font-black text-muted-foreground active:scale-[0.98]"
      >
        Schließen
      </button>
    </div>
  </div>
)}
    </div>
  )
}