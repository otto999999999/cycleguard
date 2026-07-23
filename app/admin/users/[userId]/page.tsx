"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  Crown,
  Dumbbell,
  Loader2,
  Package,
  Pill,
  Shield,
  Syringe,
  UserCog,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function AdminUserDetailPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "gym" | "substances" | "logs">("overview")
const [openWorkoutId, setOpenWorkoutId] = useState<string | null>(null)
const [openPlanId, setOpenPlanId] = useState<string | null>(null)
const [openDayId, setOpenDayId] = useState<string | null>(null)
const [openCompoundId, setOpenCompoundId] = useState<string | null>(null)
const [openCycleId, setOpenCycleId] = useState<string | null>(null)

  useEffect(() => {
    loadUser()
  }, [userId])

  const loadUser = async () => {
    setLoading(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      router.replace("/login")
      return
    }

    const res = await fetch(`/api/admin/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    if (!res.ok) {
      const error = await res.json().catch(() => null)
      alert(error?.message || "User konnte nicht geladen werden.")
      router.replace("/admin")
      return
    }

    const json = await res.json()
    setData(json)
    setLoading(false)
  }
const confirmUserEmail = async () => {
  if (!data?.authUser?.id) return

  if (!confirm("E-Mail dieses Users wirklich bestätigen?")) return

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    alert("Nicht eingeloggt.")
    return
  }

  const res = await fetch("/api/admin/confirm-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      userId: data.authUser.id,
    }),
  })

  const json = await res.json()

  if (!res.ok) {
    alert(json.error || "Konnte E-Mail nicht bestätigen.")
    return
  }

  alert("E-Mail bestätigt.")
  await loadUser()
}

  const recentLogs = useMemo(() => {
    return data?.substances?.doses?.slice(0, 30) || []
  }, [data])

const recentWorkouts = useMemo(() => {
  return (data?.gym?.workoutSessions || [])
    .filter((workout: any) => workout.finished_at)
    .slice(0, 30)
}, [data])

const getTrainingDayName = (workout: any) => {
  const day = data?.gym?.trainingDays?.find(
    (trainingDay: any) => trainingDay.id === workout.training_day_id
  )

  return day?.name || workout.name || "Workout"
}

const formatDate = (value: any) => {
  if (!value) return "Kein Datum"

  return new Date(value).toLocaleDateString("de-DE")
}

const getCycleStatus = (cycle: any) => {
  if (cycle.active) return "Aktiv"
  if (cycle.completed_at || cycle.finished_at || cycle.end_date) return "Beendet"
  return "Inaktiv"
}

const getCycleDuration = (cycle: any) => {
  const start = cycle.start_date || cycle.started_at
  const end = cycle.end_date || cycle.finished_at || cycle.completed_at

  if (!start) return "Keine Dauer"

  const startDate = new Date(start)
  const endDate = end ? new Date(end) : new Date()

  const days = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000)
  )

  if (days < 7) return `${days} Tage`

  const weeks = Math.floor(days / 7)
  const restDays = days % 7

  return restDays > 0 ? `${weeks} Wochen ${restDays} Tage` : `${weeks} Wochen`
}

const parseStackItems = (value: any) => {
  if (!value) return []

  if (Array.isArray(value)) return value

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

const getCycleStack = (cycle: any) => {
  return parseStackItems(cycle.main_stack || cycle.stack || cycle.compounds)
}

const getCyclePctStack = (cycle: any) => {
  return parseStackItems(cycle.pct_stack || cycle.pct)
}

const getStackItemName = (item: any) => {
  return (
    item.name ||
    item.compound_name ||
    item.compound?.name ||
    item.title ||
    "Unbekannt"
  )
}

const getStackItemDose = (item: any) => {
  const amount =
    item.doseAmount ??
    item.dose_amount ??
    item.amount ??
    item.dosage ??
    null

  const unit = item.doseUnit || item.dose_unit || item.unit || "mg"

  if (amount === null || amount === undefined || amount === "") {
    return "Keine Dosierung"
  }

  return `${amount} ${unit}`
}

const getStackItemFrequency = (item: any) => {
  return (
    item.frequency ||
    item.schedule ||
    item.days ||
    item.interval ||
    "Kein Schema"
  )
}

const getWorkoutDuration = (workout: any) => {
  if (!workout.started_at || !workout.finished_at) return "Keine Zeit"

  const start = new Date(workout.started_at).getTime()
  const end = new Date(workout.finished_at).getTime()
  const minutes = Math.max(0, Math.round((end - start) / 60000))

  if (minutes < 60) return `${minutes} Min.`

  const h = Math.floor(minutes / 60)
  const m = minutes % 60

  return `${h} Std. ${m} Min.`
}

const getPlanDays = (planId: string) => {
  return (data?.gym?.trainingDays || [])
    .filter((day: any) => day.plan_id === planId)
    .sort((a: any, b: any) => {
      const aIndex = getFirstWeekdayIndex(a.weekdays)
      const bIndex = getFirstWeekdayIndex(b.weekdays)

      if (aIndex !== bIndex) return aIndex - bIndex

      return String(a.name || "").localeCompare(String(b.name || ""))
    })
}

const getDayExercises = (dayId: string) => {
  return (data?.gym?.trainingDayExercises || [])
    .filter((entry: any) => entry.training_day_id === dayId)
    .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
}

const getLastWeightForExercise = (exerciseId: string) => {
  const sessionsById = new Map(
    (data?.gym?.workoutSessions || []).map((session: any) => [
      session.id,
      session,
    ])
  )

const entriesById = new Map<string, any>(
  (data?.gym?.trainingDayExercises || []).map((entry: any) => [
    String(entry.id),
    entry,
  ])
)

  const matchingSets = (data?.gym?.workoutSets || [])
    .map((set: any) => {
      const entry =
        entriesById.get(set.exercise_entry_id) ||
        entriesById.get(set.training_day_exercise_id)

      const session = sessionsById.get(set.session_id)

      return {
        ...set,
        entry,
        session,
      }
    })
    .filter((set: any) => {
      const entryExerciseId =
        set.entry?.exercise_id || set.entry?.exercise_library?.id

      return (
        entryExerciseId === exerciseId &&
        set.completed &&
        set.weight_kg !== null &&
        set.weight_kg !== undefined &&
        set.weight_kg !== ""
      )
    })
    .sort((a: any, b: any) => {
      const aTime = new Date(
        a.session?.finished_at || a.session?.started_at || 0
      ).getTime()

      const bTime = new Date(
        b.session?.finished_at || b.session?.started_at || 0
      ).getTime()

      return bTime - aTime
    })

  const last = matchingSets[0]

  if (!last) return null

  return {
    weight: last.weight_kg,
    reps: last.reps_done ?? last.reps,
    setNumber: last.set_number,
    date: last.session?.finished_at || last.session?.started_at,
  }
}

const getDayWorkouts = (dayId: string) => {
  return (data?.gym?.workoutSessions || []).filter(
    (workout: any) =>
      workout.training_day_id === dayId && workout.finished_at
  )
}

const weekdayOrder = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

const getFirstWeekdayIndex = (weekdays: any) => {
  if (!Array.isArray(weekdays) || weekdays.length === 0) return 999

  const normalized = String(weekdays[0] || "").slice(0, 2)
  const index = weekdayOrder.indexOf(normalized)

  return index === -1 ? 999 : index
}

const formatWeekdays = (weekdays: any) => {
  if (!weekdays || !Array.isArray(weekdays) || weekdays.length === 0) {
    return "Keine Wochentage"
  }

  return weekdays.join(", ")
}

const getEntryForSet = (set: any) => {
  return (data?.gym?.trainingDayExercises || []).find(
    (entry: any) => entry.id === set.exercise_entry_id
  )
}

const normalizeText = (value: any) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

const getWorkoutSets = (workoutId: string) => {
  return (data?.gym?.workoutSets || [])
    .filter((set: any) => set.session_id === workoutId)
    .sort((a: any, b: any) => (a.set_number || 0) - (b.set_number || 0))
}

const getWorkoutDay = (workout: any) => {
  const days = data?.gym?.trainingDays || []

  const byId = days.find((day: any) => day.id === workout.training_day_id)
  if (byId) return byId

  const byName = days.find(
    (day: any) => normalizeText(day.name) === normalizeText(workout.name)
  )
  if (byName) return byName

  return null
}

const getWorkoutExerciseGroups = (workout: any) => {
  const allEntries = data?.gym?.trainingDayExercises || []
  const allSets = getWorkoutSets(workout.id)

  const workoutDay = getWorkoutDay(workout)

  if (!workoutDay) {
    return []
  }

const entriesById = new Map<string, any>(
  allEntries.map((entry: any) => [String(entry.id), entry])
)

  const setsWithEntry = allSets.map((set: any) => {
    const setEntry =
  entriesById.get(String(set.exercise_entry_id || "")) ||
  entriesById.get(String(set.training_day_exercise_id || ""))

    return {
      ...set,
      setEntry,
      setExerciseId:
        setEntry?.exercise_id ||
        setEntry?.exercise_library?.id ||
        set.exercise_id,
    }
  })



  const dayEntries = allEntries
    .filter((entry: any) => entry.training_day_id === workoutDay.id)
    .sort((a: any, b: any) => {
      const aPos = Number(a.position ?? 9999)
      const bPos = Number(b.position ?? 9999)

      if (aPos !== bPos) return aPos - bPos

      return String(a.id).localeCompare(String(b.id))
    })

  return dayEntries
    .map((entry: any) => {
      const entryExerciseId =
        entry.exercise_id ||
        entry.exercise_library?.id

      const entrySets = setsWithEntry
        .filter((set: any) => {
          return (
            set.exercise_entry_id === entry.id ||
            set.training_day_exercise_id === entry.id ||
            set.setExerciseId === entryExerciseId
          )
        })
        .sort((a: any, b: any) => (a.set_number || 0) - (b.set_number || 0))

      return {
        entryId: entry.id,
        position: Number(entry.position ?? 9999),
        name: entry.exercise_library?.name || "Übung",
        category: entry.exercise_library?.category || "Keine Kategorie",
        muscle: entry.exercise_library?.muscle_group || "Keine Muskelgruppe",
        trackingType:
          entry.tracking_type ||
          entry.exercise_library?.tracking_type ||
          "reps",
        sets: entrySets,
      }
    })
    .filter((exercise: any) => exercise.sets.length > 0)
}

const getCompoundStock = (compound: any) => {
  const type = String(compound.type || "").toLowerCase()

  if (type.includes("inject")) {
    const vials = compound.current_vials ?? compound.vials ?? compound.vials_in_stock
    const ampoules =
      compound.current_ampoules ?? compound.ampoules ?? compound.ampoules_in_stock
    const ml = compound.remaining_ml ?? compound.current_ml ?? compound.ml_remaining

    if (vials !== null && vials !== undefined && vials !== "") {
      return `${vials} Vial${Number(vials) === 1 ? "" : "s"}`
    }

    if (ampoules !== null && ampoules !== undefined && ampoules !== "") {
      return `${ampoules} Ampulle${Number(ampoules) === 1 ? "" : "n"}`
    }

    if (ml !== null && ml !== undefined && ml !== "") {
      return `${ml} ml`
    }
  }

  if (type.includes("supplement") && compound.supplement_form === "Powder") {
    return `${compound.remaining_pills ?? compound.remaining_amount ?? "?"} ${
      compound.pill_unit || compound.unit || "g"
    }`
  }

  return (
    compound.remaining_pills ??
    compound.current_bottles ??
    compound.current_vials ??
    compound.current_ampoules ??
    compound.remaining_ml ??
    compound.remaining_amount ??
    compound.stock ??
    "?"
  )
}

const getCompoundDoseLabel = (compound: any) => {
  const type = String(compound.type || "").toLowerCase()

  if (type.includes("inject")) {
    const mgPerMl =
      compound.mg_per_ml ??
      compound.concentration_mg_ml ??
      compound.concentration ??
      null

    const doseAmount =
      compound.dose_amount ??
      compound.default_dose ??
      compound.dosage ??
      null

    if (doseAmount) {
      return `${doseAmount} ${compound.dose_unit || "mg"}`
    }

    if (mgPerMl) {
      return `${mgPerMl} mg/ml`
    }

    return "Keine Dosierung"
  }

  const amount =
    compound.mg_per_pill ??
    compound.pill_mg ??
    compound.pill_dose ??
    compound.pill_strength ??
    compound.dose_per_pill ??
    compound.amount_per_unit ??
    compound.dose_amount ??
    compound.dosage ??
    compound.mg_per_ml ??
    null

  const unit =
    compound.pill_unit ||
    compound.dose_unit ||
    compound.unit ||
    "mg"

  if (amount === null || amount === undefined || amount === "") {
    return "Keine Dosierung"
  }

  return `${amount} ${unit}`
}

const getCompoundLogs = (compound: any) => {
  return (data?.substances?.doses || []).filter((log: any) => {
    return (
      log.compound_id === compound.id ||
      String(log.name || "").toLowerCase() === String(compound.name || "").toLowerCase()
    )
  })
}

const getCompoundCycles = (compound: any) => {
  const allPlans = [
    ...(data?.substances?.cycles || []),
    ...(data?.substances?.supplementPlans || []),
  ]

  return allPlans.filter((cycle: any) => {
    const stackText = JSON.stringify([
      cycle.main_stack,
      cycle.pct_stack,
      cycle.stack,
      cycle.compounds,
    ]).toLowerCase()

    return (
      stackText.includes(String(compound.id).toLowerCase()) ||
      stackText.includes(String(compound.name).toLowerCase())
    )
  })
}

const getWorkoutVolume = (workoutId: string) => {
  return getWorkoutSets(workoutId).reduce((sum: number, set: any) => {
    const weight = Number(set.weight_kg || 0)
    const reps = Number(set.reps_done || set.reps || 0)

    return sum + weight * reps
  }, 0)
}

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-9 w-9 animate-spin text-yellow-200" />
          <p className="text-sm text-muted-foreground">User-Daten werden geladen...</p>
        </div>
      </div>
    )
  }

  const user = data.authUser
  const profile = data.profile
  const stats = data.stats

  return (
    <div className="min-h-screen bg-[#050505] pb-20 text-white">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-80px] top-[-120px] h-[340px] w-[340px] rounded-full bg-yellow-300/10 blur-3xl" />
        <div className="absolute right-[-120px] top-[220px] h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <Link
            href="/admin"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="text-center">
            <h1 className="text-xl font-black tracking-tight">User Details</h1>
            <p className="text-xs text-muted-foreground">{user?.email || "Keine E-Mail"}</p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-300/20 bg-yellow-300/10 text-yellow-200">
            <Crown className="h-5 w-5" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pt-6">
        <section className="relative overflow-hidden rounded-[36px] border border-yellow-300/20 bg-gradient-to-br from-yellow-300/[0.12] via-white/[0.035] to-white/[0.015] p-6 shadow-2xl backdrop-blur-xl">
          <div className="absolute right-[-70px] top-[-70px] h-[180px] w-[180px] rounded-full bg-yellow-300/10 blur-3xl" />

          <div className="relative">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1.5 text-xs font-black text-yellow-200">
              <UserCog className="h-3.5 w-3.5" />
              {profile?.role || "normal"}
            </div>

            <h2 className="text-4xl font-black tracking-tight">
              {profile?.display_name || profile?.username || "Unbenannt"}
            </h2>

            <p className="mt-3 break-all text-sm leading-6 text-muted-foreground">
              {user?.email}
            </p>

            <p className="mt-2 break-all text-xs text-white/35">
              {user?.id}
            </p>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3">
          <StatCard icon={Dumbbell} value={stats.finishedWorkouts} label="Workouts" color="text-cyan-300" />
          <StatCard icon={Package} value={stats.compounds} label="Substanzen" color="text-emerald-300" />
          <StatCard icon={Syringe} value={stats.doses} label="Logs" color="text-red-300" />
          <StatCard icon={Shield} value={stats.activeCycles} label="Aktiv" color="text-yellow-200" />
        </section>

        <section className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.035] p-2">
          <div className="grid grid-cols-4 gap-1">
            <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>Info</TabButton>
            <TabButton active={activeTab === "gym"} onClick={() => setActiveTab("gym")}>Gym</TabButton>
            <TabButton active={activeTab === "substances"} onClick={() => setActiveTab("substances")}>Stoffe</TabButton>
            <TabButton active={activeTab === "logs"} onClick={() => setActiveTab("logs")}>Logs</TabButton>
            
          </div>
        </section>

        {activeTab === "overview" && (
          <section className="mt-5 space-y-3">
            <InfoCard title="E-Mail" value={user?.email || "Keine E-Mail"} />
            <InfoCard title="Name" value={profile?.display_name || "Nicht gesetzt"} />
            <InfoCard title="Username" value={profile?.username || "Nicht gesetzt"} />
            <InfoCard title="Rolle" value={profile?.role || "normal"} />
            <InfoCard title="Erstellt" value={user?.created_at ? new Date(user.created_at).toLocaleString("de-DE") : "Unbekannt"} />
            <InfoCard title="Letzter Login" value={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("de-DE") : "Noch nie"} />
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
    E-Mail bestätigt
  </p>

  <p className="mt-2 break-all font-bold text-white/80">
    {user?.email_confirmed_at ? "Ja" : "Nein"}
  </p>

  {!user?.email_confirmed_at && (
    <button
      type="button"
      onClick={confirmUserEmail}
      className="mt-4 flex w-full items-center justify-center rounded-[20px] bg-yellow-300 py-3 text-sm font-black text-black active:scale-[0.98]"
    >
      E-Mail bestätigen
    </button>
  )}
</div>
            <InfoCard title="Push Geräte" value={String(stats.pushDevices)} />
          </section>
        )}

        {activeTab === "gym" && (
          <section className="mt-5 space-y-5">
            <Group title="Training">
  <MiniStat label="Trainingspläne" value={stats.trainingPlans} />
  <MiniStat label="Trainingstage" value={stats.trainingDays} />
  <MiniStat label="Workouts abgeschlossen" value={stats.finishedWorkouts} />
  <MiniStat label="Workout Sets" value={stats.workoutSets} />
</Group>

<Group title="Trainingspläne">
  {data.gym.trainingPlans.length === 0 ? (
    <p className="text-sm text-muted-foreground">Keine Trainingspläne.</p>
  ) : (
    data.gym.trainingPlans.map((plan: any) => {
      const isOpen = openPlanId === plan.id
      const days = getPlanDays(plan.id)

      return (
        <div
          key={plan.id}
          className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.035]"
        >
          <button
            type="button"
            onClick={() => setOpenPlanId(isOpen ? null : plan.id)}
            className="w-full p-4 text-left active:scale-[0.99]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-black">
                  {plan.name || "Trainingsplan"}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {days.length} Trainingstage •{" "}
                  {plan.created_at
                    ? new Date(plan.created_at).toLocaleDateString("de-DE")
                    : "Kein Datum"}
                </p>
              </div>

              <div className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-xs font-black text-yellow-200">
                {isOpen ? "Zu" : "Details"}
              </div>
            </div>
          </button>

          {isOpen && (
            <div className="space-y-3 border-t border-white/10 p-4">
              {days.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Keine Trainingstage in diesem Plan.
                </p>
              ) : (
                days.map((day: any) => {
                  const dayOpen = openDayId === day.id
                  const dayWorkouts = getDayWorkouts(day.id)

                  return (
                    <div
                      key={day.id}
                      className="overflow-hidden rounded-[22px] border border-white/10 bg-black/20"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenDayId(dayOpen ? null : day.id)}
                        className="w-full p-4 text-left active:scale-[0.99]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-black">{day.name || "Trainingstag"}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatWeekdays(day.weekdays)} • {dayWorkouts.length} abgeschlossene Workouts
                            </p>
                          </div>

                          <span className="text-xs font-black text-yellow-200">
                            {dayOpen ? "Zu" : "Öffnen"}
                          </span>
                        </div>
                      </button>

                      {dayOpen && (
                        <div className="space-y-2 border-t border-white/10 p-4">
{getDayExercises(day.id).length === 0 ? (
  <p className="text-sm text-muted-foreground">
    Keine Übungen in diesem Trainingstag.
  </p>
) : (
  getDayExercises(day.id).map((entry: any) => {
    const exercise = entry.exercise_library
    const lastWeight = getLastWeightForExercise(exercise?.id)

    return (
      <div
        key={entry.id}
        className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-black">
              {exercise?.name || "Übung"}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {exercise?.category || "Keine Kategorie"} •{" "}
              {exercise?.muscle_group || "Keine Muskelgruppe"}
            </p>
          </div>

          <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-black text-white/60">
            {exercise?.tracking_type === "seconds" ? "Zeit" : "Reps"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl border border-white/10 bg-black/20 p-2">
            <p className="font-black text-white">
              {entry.sets || entry.set_count || "-"}
            </p>
            <p className="text-muted-foreground">Sätze</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-2">
            <p className="font-black text-white">
              {entry.reps || entry.target_reps || entry.duration_seconds || "-"}
            </p>
            <p className="text-muted-foreground">
              {exercise?.tracking_type === "seconds" ? "Sek." : "Reps"}
            </p>
          </div>

          <div className="rounded-xl border border-yellow-300/15 bg-yellow-300/10 p-2">
            <p className="font-black text-yellow-200">
              {lastWeight ? `${lastWeight.weight} kg` : "-"}
            </p>
            <p className="text-muted-foreground">Letztes Gewicht</p>
          </div>
        </div>

        {lastWeight && (
          <p className="mt-2 text-xs text-white/35">
            Letzter Satz: {lastWeight.weight} kg
            {lastWeight.reps ? ` × ${lastWeight.reps}` : ""}
          </p>
        )}
      </div>
    )
  })
)}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      )
    })
  )}
</Group>

<Group title="Abgeschlossene Workouts">
  {recentWorkouts.length === 0 ? (
    <p className="text-sm text-muted-foreground">Keine abgeschlossenen Workouts.</p>
  ) : (
    recentWorkouts.map((workout: any) => {
      const isOpen = openWorkoutId === workout.id
      const exerciseGroups = getWorkoutExerciseGroups(workout)
      const volume = getWorkoutVolume(workout.id)

      return (
        <div
          key={workout.id}
          className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.035]"
        >
          <button
            type="button"
            onClick={() => setOpenWorkoutId(isOpen ? null : workout.id)}
            className="w-full p-4 text-left active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-black">
                  {getTrainingDayName(workout)}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {workout.started_at
                    ? new Date(workout.started_at).toLocaleString("de-DE")
                    : "Kein Start"}{" "}
                  • {getWorkoutDuration(workout)}
                </p>
              </div>

              <div className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-xs font-black text-yellow-200">
                {isOpen ? "Zu" : "Details"}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="font-black text-white">{exerciseGroups.length}</p>
                <p className="text-muted-foreground">Übungen</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="font-black text-white">{getWorkoutSets(workout.id).length}</p>
                <p className="text-muted-foreground">Sätze</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="font-black text-white">
                  {Math.round(volume).toLocaleString("de-DE")}
                </p>
                <p className="text-muted-foreground">Volumen</p>
              </div>
            </div>
          </button>

          {isOpen && (
            <div className="space-y-3 border-t border-white/10 p-4">
              {exerciseGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Keine Satzdaten gefunden.
                </p>
              ) : (
                exerciseGroups.map((exercise: any) => (
                  <div
                    key={exercise.entryId}
                    className="rounded-[22px] border border-white/10 bg-black/20 p-4"
                  >
                    <p className="font-black">{exercise.name}</p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {exercise.category} • {exercise.muscle}
                    </p>

                    <div className="mt-4 space-y-2">
                      {exercise.sets.map((set: any) => (
                        <div
                          key={set.id}
                          className="grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs"
                        >
                          <div>
                            <p className="text-white/35">Satz</p>
                            <p className="font-black">{set.set_number || "-"}</p>
                          </div>

                          <div>
                            <p className="text-white/35">Gewicht</p>
                            <p className="font-black">
                              {set.weight_kg != null && set.weight_kg !== ""
                                ? `${set.weight_kg} kg`
                                : "-"}
                            </p>
                          </div>

                          <div>
                            <p className="text-white/35">Reps</p>
                            <p className="font-black">
                              {set.reps_done ?? set.reps ?? "-"}
                            </p>
                          </div>

                          <div>
                            <p className="text-white/35">Status</p>
                            <p
                              className={`font-black ${
                                set.completed
                                  ? "text-emerald-300"
                                  : "text-white/45"
                              }`}
                            >
                              {set.completed ? "Done" : "Offen"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )
    })
  )}
</Group>
          </section>
        )}

        {activeTab === "substances" && (
          <section className="mt-5 space-y-5">
            <Group title="Stats">
              <MiniStat label="Substanzen" value={stats.compounds} />
              <MiniStat label="Cycles" value={stats.cycles} />
              <MiniStat label="Supplement-Pläne" value={stats.supplementPlans} />
              <MiniStat label="Aktive Pläne" value={stats.activeCycles} />
            </Group>

            <Group title="Substanzen & Vorrat">
{data.substances.compounds.map((c: any) => {
  const isOpen = openCompoundId === c.id
  const compoundLogs = getCompoundLogs(c)
  const compoundCycles = getCompoundCycles(c)

  return (
    <div
      key={c.id}
      className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.035]"
    >
      <button
        type="button"
        onClick={() => setOpenCompoundId(isOpen ? null : c.id)}
        className="w-full p-4 text-left active:scale-[0.99]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-black">{c.name}</p>

            <p className="mt-1 text-xs text-muted-foreground">
              {c.type || "Typ unbekannt"} • Vorrat: {getCompoundStock(c)}
            </p>
          </div>

          <span className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-xs font-black text-yellow-200">
            {isOpen ? "Zu" : "Details"}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="space-y-3 border-t border-white/10 p-4">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-white/35">Typ</p>
              <p className="mt-1 font-black">{c.type || "-"}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-white/35">Vorrat</p>
              <p className="mt-1 font-black">{getCompoundStock(c)}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-white/35">Dosierung</p>
              <p className="mt-1 font-black">{getCompoundDoseLabel(c)}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-white/35">Logs</p>
              <p className="mt-1 font-black">{compoundLogs.length}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
              ID
            </p>
            <p className="mt-2 break-all text-xs text-white/60">{c.id}</p>
          </div>



          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-white/35">
              Verwendet in Plänen
            </p>

            {compoundCycles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                In keinem Plan gefunden.
              </p>
            ) : (
              <div className="space-y-2">
                {compoundCycles.map((cycle: any) => (
                  <div
                    key={cycle.id}
                    className="rounded-xl border border-white/10 bg-white/[0.035] p-3"
                  >
                    <p className="font-black">{cycle.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {cycle.plan_category || "cycle"} •{" "}
                      {cycle.active ? "Aktiv" : "Inaktiv"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-white/35">
              Letzte Logs
            </p>

            {compoundLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keine Logs für diese Substanz.
              </p>
            ) : (
              <div className="space-y-2">
                {compoundLogs.slice(0, 10).map((log: any) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-white/10 bg-white/[0.035] p-3"
                  >
                    <p className="font-black">
                      {log.menge} {log.dose_unit || "mg"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {log.datum} {log.zeit || ""} • {log.methode || "-"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
})}
              
            </Group>

<Group title="Cycles & Supplement-Pläne">
  {[...data.substances.cycles, ...data.substances.supplementPlans].length === 0 ? (
    <p className="text-sm text-muted-foreground">Keine Pläne.</p>
  ) : (
    [...data.substances.cycles, ...data.substances.supplementPlans].map((cycle: any) => {
      const isOpen = openCycleId === cycle.id
      const stack = getCycleStack(cycle)
      const pctStack = getCyclePctStack(cycle)
      const status = getCycleStatus(cycle)

      return (
        <div
          key={cycle.id}
          className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.035]"
        >
          <button
            type="button"
            onClick={() => setOpenCycleId(isOpen ? null : cycle.id)}
            className="w-full p-4 text-left active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-black">{cycle.name || "Plan"}</p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {cycle.plan_category === "supplement" ? "Supplement-Plan" : "Cycle"} •{" "}
                  {status} • {formatDate(cycle.start_date || cycle.started_at)}
                </p>
              </div>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-black ${
                  cycle.active
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                    : "border-yellow-300/20 bg-yellow-300/10 text-yellow-200"
                }`}
              >
                {isOpen ? "Zu" : "Details"}
              </span>
            </div>
          </button>

          {isOpen && (
            <div className="space-y-3 border-t border-white/10 p-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="text-white/35">Status</p>
                  <p className="mt-1 font-black">{status}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="text-white/35">Typ</p>
                  <p className="mt-1 font-black">
                    {cycle.plan_category === "supplement" ? "Supplement" : "Cycle"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="text-white/35">Start</p>
                  <p className="mt-1 font-black">
                    {formatDate(cycle.start_date || cycle.started_at)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="text-white/35">Dauer</p>
                  <p className="mt-1 font-black">{getCycleDuration(cycle)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
                  ID
                </p>
                <p className="mt-2 break-all text-xs text-white/60">{cycle.id}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-white/35">
                  Stack
                </p>

                {stack.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Kein Stack gefunden.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {stack.map((item: any, index: number) => (
                      <div
                        key={`${cycle.id}-stack-${index}`}
                        className="rounded-xl border border-white/10 bg-white/[0.035] p-3"
                      >
                        <p className="font-black">{getStackItemName(item)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {getStackItemDose(item)} • {getStackItemFrequency(item)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {pctStack.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-white/35">
                    PCT Stack
                  </p>

                  <div className="space-y-2">
                    {pctStack.map((item: any, index: number) => (
                      <div
                        key={`${cycle.id}-pct-${index}`}
                        className="rounded-xl border border-white/10 bg-white/[0.035] p-3"
                      >
                        <p className="font-black">{getStackItemName(item)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {getStackItemDose(item)} • {getStackItemFrequency(item)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )
    })
  )}
</Group>
          </section>
        )}

        {activeTab === "logs" && (
          <section className="mt-5 space-y-3">
            {recentLogs.length === 0 ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-center text-sm text-muted-foreground">
                Keine Logs vorhanden.
              </div>
            ) : (
              recentLogs.map((log: any) => (
                <div key={log.id} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-red-500/10 text-red-300">
                      <Pill className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black">{log.name || "Log"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {log.menge} {log.dose_unit || "mg"} • {log.datum} {log.zeit || ""}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>
        )}


      </main>
    </div>
  )
}

function StatCard({ icon: Icon, value, label, color }: any) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
      <Icon className={`mb-3 h-6 w-6 ${color}`} />
      <p className="text-2xl font-black">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function TabButton({ active, onClick, children }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[18px] px-2 py-3 text-[10px] font-black transition active:scale-95 ${
        active ? "bg-yellow-300 text-black" : "text-white/45 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {children}
    </button>
  )
}

function InfoCard({ title, value }: any) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">{title}</p>
      <p className="mt-2 break-all font-bold text-white/80">{value}</p>
    </div>
  )
}

function Group({ title, children }: any) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
      <h3 className="mb-4 font-black">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function MiniStat({ label, value }: any) {
  return (
    <div className="flex items-center justify-between rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  )
}

