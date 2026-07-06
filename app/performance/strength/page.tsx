"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronLeft,
  Dumbbell,
  Plus,
  Check,
  X,
  Play,
  CalendarDays,
  BarChart3,
Clock,
ChevronRight,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
export default function StrengthPage() {
  const [showCreatePlan, setShowCreatePlan] = useState(false)
  const [planName, setPlanName] = useState("")
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [trainingDays, setTrainingDays] = useState<any[]>([])
const [dayExercises, setDayExercises] = useState<any[]>([])
const [finishedSessions, setFinishedSessions] = useState<any[]>([])
const [recentSessions, setRecentSessions] = useState<any[]>([])
const [selectedDayId, setSelectedDayId] = useState<string | null>(null)

const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
const formatSessionDate = (value: string) => {
  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

const formatSessionTime = (value: string) => {
  return new Date(value).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
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

const getTrainingDayName = (session: any) => {
  const day = trainingDays.find((day) => day.id === session.training_day_id)
  return day?.name || "Workout"
}
const todayIndex = (new Date().getDay() + 6) % 7
const todayShort = weekDays[todayIndex]

const getExercisesForDay = (dayId: string) => {
  return dayExercises.filter((entry) => entry.training_day_id === dayId)
}

const isDayCompleted = (weekday: string) => {
  return finishedSessions.some((session) => {
    const day = trainingDays.find((d) => d.id === session.training_day_id)
    return day?.weekdays?.includes(weekday)
  })
}

const hasWorkoutOnWeekday = (weekday: string) => {
  return trainingDays.some((day) => day.weekdays?.includes(weekday))
}

const getWeekdayStatus = (weekday: string, index: number) => {
  const completed = isDayCompleted(weekday)
  const planned = hasWorkoutOnWeekday(weekday)
  const isPast = index < todayIndex
  const isToday = index === todayIndex

  if (completed) return "done"
  if (planned && isPast) return "missed"
  if (planned && isToday) return "today"
  if (planned) return "planned"

  return "empty"
}

const selectedDay =
  trainingDays.find((day) => day.id === selectedDayId) ||
  trainingDays.find((day) => day.weekdays?.includes(todayShort)) ||
  trainingDays[0]


useEffect(() => {
  loadPlan()
}, [])


const startWorkout = async (day: any) => {
  const exercises = getExercisesForDay(day.id)

  if (exercises.length === 0) {
    toast.error("Dieser Trainingstag hat noch keine Übungen.")
    return
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      training_day_id: day.id,
    })
    .select()
    .single()

  if (sessionError || !session) {
    toast.error("Workout konnte nicht gestartet werden.")
    return
  }

  const setsToInsert = exercises.flatMap((entry) => {
    const totalSets = (entry.warmup_sets || 0) + (entry.sets || 3)

    return Array.from({ length: totalSets }).map((_, index) => ({
      user_id: user.id,
      session_id: session.id,
      exercise_entry_id: entry.id,
      set_number: index + 1,
      completed: false,
    }))
  })

  const { error: setsError } = await supabase
    .from("workout_sets")
    .insert(setsToInsert)

  if (setsError) {
    toast.error("Workout-Sätze konnten nicht erstellt werden.")
    return
  }

  router.push(`/performance/strength/workout/${session.id}`)
}

async function loadPlan() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    setLoading(false)
    return
  }

  const { data: plansData } = await supabase
    .from("training_plans")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  setPlans(plansData || [])

  const planIds = (plansData || []).map((plan) => plan.id)

  if (planIds.length > 0) {
    const { data: daysData } = await supabase
      .from("training_days")
      .select("*")
      .in("plan_id", planIds)
      .order("created_at", { ascending: true })

const safeDaysData = daysData || []

setTrainingDays(safeDaysData)

const dayIds = safeDaysData.map((day) => day.id)

    if (dayIds.length > 0) {
      const { data: exercisesData } = await supabase
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
        .in("training_day_id", dayIds)
        .order("position", { ascending: true })

      setDayExercises(exercisesData || [])

      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - todayIndex)
      weekStart.setHours(0, 0, 0, 0)

      const { data: sessionsData } = await supabase
        .from("workout_sessions")
        .select("*")
        .in("training_day_id", dayIds)
        .gte("started_at", weekStart.toISOString())
        .not("finished_at", "is", null)
.is("cancelled_at", null)

      setFinishedSessions(sessionsData || [])
const { data: recentSessionsData } = await supabase
  .from("workout_sessions")
  .select("*")
  .in("training_day_id", dayIds)
  .not("finished_at", "is", null)
  .is("cancelled_at", null)
  .order("finished_at", { ascending: false })
  .limit(10)

setRecentSessions(recentSessionsData || [])
const todayDay = safeDaysData.find((day) =>
  day.weekdays?.includes(todayShort)
)

if (todayDay) {
  setSelectedDayId(todayDay.id)
} else if (safeDaysData.length > 0) {
  setSelectedDayId(safeDaysData[0].id)
}
    }
  }

  setLoading(false)
}
const createPlan = async () => {
  const finalName = planName.trim() || "Mein Trainingsplan"

  const existingPlan = plans.find(
 (p) => p.name.trim().toLowerCase() === finalName.trim().toLowerCase()
    )
     if (existingPlan) {
    toast.error("Ein Trainingsplan mit diesem Namen existiert bereits.")
return
    
    }
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const { error } = await supabase
    .from("training_plans")
    .insert({
      user_id: user.id,
      name: finalName,
    })

  if (error) {
    console.error(error)
    return
  }

  await loadPlan()
  setShowCreatePlan(false)
  setPlanName("")
  toast.success("Trainingsplan erstellt.")
}

  return (
    <div className="min-h-screen bg-[#050505] text-foreground pb-20">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-120px] left-[-80px] h-[320px] w-[320px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] active:scale-95">
            <ChevronLeft className="h-5 w-5" />
          </Link>

          <div className="text-center">
            <h1 className="text-xl font-bold">Strength</h1>
            <p className="text-xs text-muted-foreground">Training Plans</p>
          </div>

          <div className="h-10 w-10" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pt-6">
        {!loading && plans.length === 0 ? (
          <section className="flex min-h-[70vh] flex-col items-center justify-center text-center">
            <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-[36px] bg-emerald-400/10 text-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.18)]">
              <Dumbbell className="h-16 w-16" />
            </div>

            <h2 className="text-5xl font-black tracking-tight">Strength</h2>

            <p className="mt-5 max-w-[340px] text-lg leading-7 text-muted-foreground">
              Erstelle deinen ersten Trainingsplan, füge Übungen hinzu und verfolge deine Fortschritte.
            </p>

            <button
              onClick={() => setShowCreatePlan(true)}
              className="mt-10 flex w-full max-w-[360px] items-center justify-center gap-2 rounded-[28px] bg-gradient-to-r from-emerald-400 to-emerald-500 py-5 text-lg font-bold text-black shadow-[0_0_35px_rgba(52,211,153,0.35)] active:scale-[0.98]"
            >
              <Plus className="h-5 w-5" />
              Trainingsplan erstellen
            </button>
          </section>
) : (
  <div className="space-y-8">
    <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">Diese Woche</h2>
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300">
          Woche
        </div>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-1">
  {weekDays.map((day, index) => {
    const status = getWeekdayStatus(day, index)
    const isToday = index === todayIndex

    return (
      <div key={day} className="flex flex-col items-center gap-2">
        <p
          className={`text-sm font-bold ${
            isToday ? "text-emerald-300" : "text-muted-foreground"
          }`}
        >
          {day}
        </p>

<div
  className={`flex h-10 w-10 items-center justify-center rounded-full border ${
            isToday
              ? "border-emerald-400 bg-emerald-400/10 shadow-[0_0_24px_rgba(52,211,153,0.25)]"
              : "border-white/10 bg-white/[0.03]"
          }`}
        >
          {status === "done" && (
            <Check className="h-5 w-5 text-emerald-300" />
          )}

          {status === "missed" && (
            <X className="h-5 w-5 text-red-400" />
          )}

          {(status === "today" || status === "planned") && (
            <Dumbbell className="h-5 w-5 text-emerald-300" />
          )}
        </div>
      </div>
    )
  })}
</div>
    </section>

    <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-xl">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
          Diese Woche
        </p>

        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-300">
          Stats
        </span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
        <div>
          <p className="text-3xl font-black text-emerald-300">0</p>
          <p className="mt-1 text-sm text-muted-foreground">Einheiten</p>
        </div>

        <div>
          <p className="text-3xl font-black text-white">--</p>
          <p className="mt-1 text-sm text-muted-foreground">Ø Dauer</p>
        </div>

        <div>
          <p className="text-3xl font-black text-cyan-300">0 kg</p>
          <p className="mt-1 text-sm text-muted-foreground">Volumen</p>
        </div>
      </div>
    </section>

<section>
  <h2 className="mb-4 text-2xl font-black">Heutiges Training</h2>

  {trainingDays.length > 0 ? (
    <>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 py-3 pr-16 scrollbar-hide">
        {trainingDays.map((day) => (
          <button
            key={day.id}
            onClick={() => setSelectedDayId(day.id)}
            className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-black transition-all ${
              selectedDay?.id === day.id
                ? "bg-emerald-400 text-black shadow-[0_0_25px_rgba(52,211,153,0.3)]"
                : "bg-white/10 text-white/70"
            }`}
          >
            {day.weekdays?.[0]} {day.name}
          </button>
        ))}
      </div>

      {selectedDay && (
        <div className="mt-4 rounded-[34px] border border-emerald-400/20 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.6),0_0_40px_rgba(16,185,129,0.1)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
<h3 className="text-[24px] font-black leading-tight">
  {selectedDay.name}
</h3>

              <p className="mt-1 text-sm font-semibold text-white/45">
                {getExercisesForDay(selectedDay.id).length} Übungen
              </p>
            </div>

            <button
              onClick={() => startWorkout(selectedDay)}
              disabled={getExercisesForDay(selectedDay.id).length === 0}
              className="flex items-center gap-2 rounded-[22px] bg-emerald-400 px-5 py-3.5 text-base font-black text-black shadow-[0_0_28px_rgba(52,211,153,0.35)] active:scale-95 disabled:bg-white/10 disabled:text-white/30 disabled:shadow-none"
            >
              <Play className="h-5 w-5 fill-black" />
              Starten
            </button>
          </div>
        </div>
      )}
    </>
  ) : (
    <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 text-center text-muted-foreground">
      Noch keine Einheit geplant.
    </div>
  )}
</section>

    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-black">Meine Pläne</h2>

        <button
          onClick={() => setShowCreatePlan(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400 text-black shadow-[0_0_24px_rgba(52,211,153,0.35)] active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

<div className="space-y-3">
  {plans.map((plan) => (
    <Link
      key={plan.id}
      href={`/performance/strength/plan/${plan.id}`}
      className="block rounded-[30px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-xl active:scale-[0.98]"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black">{plan.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {trainingDays.filter((day) => day.plan_id === plan.id).length} Trainingseinheiten
          </p>
        </div>

        <span className="text-3xl text-muted-foreground">›</span>
      </div>
    </Link>
  ))}
</div>
    </section>

    <section>
  <h2 className="mb-4 text-2xl font-black">Letzte Workouts</h2>

  {recentSessions.length === 0 ? (
    <div className="rounded-[30px] border border-white/10 bg-white/[0.05] p-6 text-muted-foreground shadow-2xl backdrop-blur-xl">
      Noch keine Workouts abgeschlossen.
    </div>
  ) : (
    <div className="space-y-3">
      {recentSessions.map((session) => (
        <Link
          key={session.id}
          href={`/performance/strength/history/${session.id}`}
          className="block rounded-[30px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.025] p-5 shadow-2xl backdrop-blur-xl active:scale-[0.98]"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate text-xl font-black">
                {getTrainingDayName(session)}
              </h3>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4 text-emerald-300" />
                  {formatSessionDate(session.started_at)}
                </span>

                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-cyan-300" />
                  {formatSessionTime(session.started_at)}
                </span>

                <span className="font-bold text-emerald-300">
                  {getDurationMinutes(session)} min
                </span>
              </div>
            </div>

            <ChevronRight className="h-6 w-6 shrink-0 text-muted-foreground" />
          </div>
        </Link>
      ))}
    </div>
  )}
</section>
  </div>
)}
      </main>

      {showCreatePlan && (
        <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md">
          <div className="mx-auto min-h-screen max-w-lg px-5 pt-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowCreatePlan(false)}
                className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-300 active:scale-95"
              >
                Abbrechen
              </button>

              <h2 className="text-xl font-bold">Neuer Plan</h2>

              <button
                onClick={() => setShowCreatePlan(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <section className="mt-16 text-center">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-emerald-400 text-black shadow-[0_0_45px_rgba(52,211,153,0.35)]">
                <Dumbbell className="h-14 w-14" />
              </div>

              <h1 className="mt-10 text-4xl font-black tracking-tight">
                Erstelle deinen Plan
              </h1>

              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Gib deinem Trainingsplan einen Namen. Danach kannst du Tage und Übungen hinzufügen.
              </p>
            </section>

            <section className="mt-10">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
                <p className="mb-3 text-sm font-semibold text-emerald-300">Name</p>
                <input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="z.B. Push Pull Legs"
                  className="w-full bg-transparent text-2xl font-semibold outline-none placeholder:text-white/20"
                />
              </div>

              <button
                onClick={createPlan}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-[28px] border border-dashed border-emerald-400/40 bg-emerald-400/10 py-5 text-lg font-bold text-emerald-300 shadow-[0_0_28px_rgba(52,211,153,0.15)] active:scale-[0.98]"
              >
                <Plus className="h-5 w-5" />
                Plan erstellen
              </button>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}