"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  CalendarPlus,
  ChevronLeft,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  
} from "lucide-react"
import { toast } from "sonner"

import { supabase } from "@/lib/supabase"

function SortableExerciseCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: any
  onEdit: () => void
  onDelete: (e: any) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onEdit}
      className={`group flex cursor-grab touch-none items-center justify-between gap-3 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all active:scale-[0.985] hover:border-emerald-400/20 hover:shadow-[0_0_30px_rgba(16,185,129,0.08)] ${
        isDragging ? "z-50 scale-[1.03] border-emerald-400/40 opacity-80" : ""
      }`}
    >
      <div>
        <p className="font-bold">
          {entry.exercise_library?.name}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {entry.exercise_library?.muscle_group}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
            {entry.sets || 3} Sätze
          </span>

          <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
            {entry.reps || 10} {entry.tracking_type === "seconds" ? "Sek." : "Reps"}
          </span>

          <span className="rounded-full border border-orange-400/15 bg-orange-400/10 px-3 py-1 text-xs font-bold text-orange-300">
            {entry.warmup_sets || 0} Warmup
          </span>
        </div>
      </div>

<button
  onPointerDown={(e) => e.stopPropagation()}
  onClick={onDelete}
  className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400 active:scale-95"
>
  <Trash2 className="h-4 w-4" />
</button>
    </div>
  )
}

export default function StrengthPlanPage() {
  const params = useParams()
  const router = useRouter()
  const planId = params.id as string

  const [plan, setPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
const [showDeletePlanModal, setShowDeletePlanModal] = useState(false)
  const [showCreateDay, setShowCreateDay] = useState(false)
  const [dayName, setDayName] = useState("")
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([])
  const [restTimer, setRestTimer] = useState("90s")
  const [trainingDays, setTrainingDays] = useState<any[]>([])
  const [editingDay, setEditingDay] = useState<any>(null)
const [deleteDayId, setDeleteDayId] = useState<string | null>(null)
const [deleteExerciseId, setDeleteExerciseId] = useState<string | null>(null)
  const [exerciseLibrary, setExerciseLibrary] = useState<any[]>([])
  const [dayExercises, setDayExercises] = useState<any[]>([])
  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false)
  const [exerciseTargetDay, setExerciseTargetDay] = useState<any>(null)
  const [exerciseSearch, setExerciseSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState<any>(null)
const [exerciseSets, setExerciseSets] = useState(3)
const [exerciseReps, setExerciseReps] = useState(10)
const [exerciseWarmups, setExerciseWarmups] = useState(0)
const [editingExerciseEntry, setEditingExerciseEntry] = useState<any>(null)
  const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
  const restOptions = ["30s", "60s", "90s", "2 min", "3 min", "5 min"]
  const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      delay: 180,
      tolerance: 6,
    },
  })
)

const handleExerciseDragEnd = async (dayId: string, event: any) => {
  const { active, over } = event

  if (!over || active.id === over.id) return

  const exercisesForDay = getExercisesForDay(dayId)
  const oldIndex = exercisesForDay.findIndex((entry) => entry.id === active.id)
  const newIndex = exercisesForDay.findIndex((entry) => entry.id === over.id)

  if (oldIndex === -1 || newIndex === -1) return

  const reordered = arrayMove(exercisesForDay, oldIndex, newIndex)

  setDayExercises((prev) => {
    const others = prev.filter((entry) => entry.training_day_id !== dayId)

    return [
      ...others,
      ...reordered.map((entry, index) => ({
        ...entry,
        position: index,
      })),
    ]
  })

  await Promise.all(
    reordered.map((entry, index) =>
      supabase
        .from("training_day_exercises")
        .update({ position: index })
        .eq("id", entry.id)
    )
  )
}
const isSecondsExercise = (exercise: any) => {
  return exercise?.tracking_type === "seconds"
}

const getRepsSetupLabel = (exercise: any) => {
  return isSecondsExercise(exercise) ? "Sekunden" : "Reps"
}
  useEffect(() => {
    loadPlan()
  }, [])

  async function loadPlan() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    const { data, error } = await supabase
      .from("training_plans")
      .select("*")
      .eq("id", planId)
      .eq("user_id", user.id)
      .single()

    if (error || !data) {
      toast.error("Trainingsplan nicht gefunden.")
      router.push("/performance/strength")
      return
    }

    setPlan(data)

    const { data: dayData } = await supabase
      .from("training_days")
      .select("*")
      .eq("plan_id", planId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })

    setTrainingDays(dayData || [])

    const { data: exercisesData } = await supabase
  .from("exercise_library")
  .select("*")
  .eq("archived", false)
  .order("name")

    setExerciseLibrary(exercisesData || [])

    const { data: dayExerciseData } = await supabase
    .from("training_day_exercises")
    .select(`
        *,
        exercise_library (
        name,
        category,
        muscle_group
        )
    `)
    .eq("user_id", user.id)

    setDayExercises(dayExerciseData || [])
    setLoading(false)
  }

  const isWeekdayUsed = (day: string) => {
    return trainingDays.some((trainingDay) => {
      if (editingDay?.id === trainingDay.id) return false
      return (trainingDay.weekdays || []).includes(day)
    })
  }

  const toggleWeekday = (day: string) => {
    if (isWeekdayUsed(day)) return

    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const resetDayForm = () => {
    setShowCreateDay(false)
    setEditingDay(null)
    setDayName("")
    setSelectedWeekdays([])
    setRestTimer("90s")
  }

  const createTrainingDay = async () => {
    const finalName = dayName.trim() || "Trainingstag"

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { error } = await supabase.from("training_days").insert({
      user_id: user.id,
      plan_id: planId,
      name: finalName,
      weekdays: selectedWeekdays,
      rest_timer: restTimer,
    })

    if (error) {
      toast.error("Trainingstag konnte nicht erstellt werden.")
      return
    }

    await loadPlan()
    resetDayForm()
    toast.success("Trainingstag hinzugefügt.")
  }

  const openEditDay = (day: any) => {
    setEditingDay(day)
    setDayName(day.name || "")
    setSelectedWeekdays(day.weekdays || [])
    setRestTimer(day.rest_timer || "90s")
    setShowCreateDay(true)
  }

  const saveTrainingDay = async () => {
    if (!editingDay) return

    const finalName = dayName.trim() || "Trainingstag"

    const { error } = await supabase
      .from("training_days")
      .update({
        name: finalName,
        weekdays: selectedWeekdays,
        rest_timer: restTimer,
      })
      .eq("id", editingDay.id)

    if (error) {
      toast.error("Trainingstag konnte nicht gespeichert werden.")
      return
    }

    await loadPlan()
    resetDayForm()
    toast.success("Trainingstag gespeichert.")
  }

const reallyDeleteTrainingDay = async (dayId: string) => {
  const { error } = await supabase
    .from("training_days")
    .delete()
    .eq("id", dayId)

  if (error) {
    toast.error("Trainingstag konnte nicht gelöscht werden.")
    return
  }

  await loadPlan()
  toast.success("Trainingstag gelöscht.")
}
const reallyDeleteExercise = async (entryId: string) => {
  const { error } = await supabase
    .from("training_day_exercises")
    .delete()
    .eq("id", entryId)

  if (error) {
    toast.error("Übung konnte nicht gelöscht werden.")
    return
  }

  await loadPlan()
  toast.success("Übung entfernt.")
}
const saveExerciseSettings = async () => {
  if (!editingExerciseEntry) return

  const { error } = await supabase
    .from("training_day_exercises")
    .update({
      sets: exerciseSets,
      reps: exerciseReps,
      warmup_sets: exerciseWarmups,
    })
    .eq("id", editingExerciseEntry.id)

  if (error) {
    toast.error("Übung konnte nicht gespeichert werden.")
    return
  }

  await loadPlan()
  setEditingExerciseEntry(null)
  setSelectedExerciseToAdd(null)
  toast.success("Übung gespeichert.")
}
  const deletePlan = async () => {
    

    const { error } = await supabase.from("training_plans").delete().eq("id", planId)

    if (error) {
      toast.error("Plan konnte nicht gelöscht werden.")
      return
    }

    toast.success("Trainingsplan gelöscht.")
    router.push("/performance/strength")
  }

  const exerciseCategories = Array.from(
    new Set(exerciseLibrary.map((exercise) => exercise.category))
  )

  const visibleExercises = exerciseLibrary.filter((exercise) => {
const matchesCategory =
  selectedCategory && selectedCategory !== "Alle"
    ? exercise.category === selectedCategory
    : true

    const matchesSearch = exercise.name
      .toLowerCase()
      .includes(exerciseSearch.toLowerCase())

    return matchesCategory && matchesSearch
  })

  const openExerciseLibrary = (day: any) => {
    setExerciseTargetDay(day)
    setSelectedCategory(null)
    setExerciseSearch("")
    setShowExerciseLibrary(true)
  }

  const addExerciseToDay = async (exercise: any) => {
    if (!exerciseTargetDay) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

const { error } = await supabase.from("training_day_exercises").insert({
  user_id: user.id,
  training_day_id: exerciseTargetDay.id,
  exercise_id: exercise.id,
  position: getExercisesForDay(exerciseTargetDay.id).length,
  sets: exerciseSets,
  reps: exerciseReps,
  warmup_sets: exerciseWarmups,
  tracking_type: exercise.tracking_type || "reps",
})

    if (error) {
      toast.error("Übung konnte nicht hinzugefügt werden.")
      return
    }

    toast.success(`${exercise.name} hinzugefügt.`)
    await loadPlan()
    setShowExerciseLibrary(false)
    setExerciseTargetDay(null)
    setSelectedCategory(null)
    setExerciseSearch("")
  }
const getExercisesForDay = (dayId: string) => {
  return dayExercises
    .filter((entry) => entry.training_day_id === dayId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}




const testNotification = async () => {
  if (!("Notification" in window)) {
    toast.error("Benachrichtigungen werden nicht unterstützt.")
    return
  }

  const permission = await Notification.requestPermission()

  if (permission !== "granted") {
    toast.error("Benachrichtigungen nicht erlaubt.")
    return
  }

  new Notification("CycleGuard Test", {
    body: "Push-Benachrichtigung funktioniert.",
    icon: "/icon-192.png",
  })

  toast.success("Test-Benachrichtigung gesendet.")
}






const deleteExerciseFromDay = async (entryId: string) => {
    setDeleteExerciseId(entryId)
return
  const { error } = await supabase
    .from("training_day_exercises")
    .delete()
    .eq("id", entryId)

  if (error) {
    toast.error("Übung konnte nicht gelöscht werden.")
    return
  }

  await loadPlan()
  toast.success("Übung entfernt.")
}

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-foreground">
        <p className="text-muted-foreground">Lade Plan...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-foreground pb-20">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-120px] left-[-80px] h-[360px] w-[360px] rounded-full bg-emerald-500/20 blur-[140px]" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[340px] w-[340px] rounded-full bg-emerald-500/15 blur-[140px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <Link
            href="/performance/strength"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] active:scale-95"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>

          <h1 className="max-w-[230px] truncate text-center text-xl font-black">
            {plan?.name}
          </h1>

<div className="h-10 w-10" />
        </div>

      </header>

      <main className="mx-auto max-w-lg px-5 pt-8 animate-in fade-in duration-500">
        {trainingDays.length === 0 ? (
<section className="relative overflow-hidden rounded-[34px] border border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.12] via-white/[0.045] to-[#070707] px-6 py-8 text-center shadow-[0_0_45px_rgba(52,211,153,0.10)]">
  <div className="absolute right-[-70px] top-[-80px] h-[190px] w-[190px] rounded-full bg-emerald-400/15 blur-3xl" />

  <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] border border-emerald-400/20 bg-emerald-400/10 shadow-[0_0_28px_rgba(52,211,153,0.12)]">
    <CalendarPlus className="h-10 w-10 text-emerald-300" />
  </div>

  <div className="relative">
    <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
      Plan ist leer
    </p>

    <h2 className="text-3xl font-black tracking-tight">
      Erstelle deinen ersten Trainingstag
    </h2>

    <p className="mx-auto mt-3 max-w-[330px] text-sm leading-6 text-muted-foreground">
      Wähle Wochentage aus, lege deinen Split an und füge danach Übungen mit Sätzen, Reps und Warmups hinzu.
    </p>

    <button
      onClick={() => setShowCreateDay(true)}
      className="mx-auto mt-7 flex w-full max-w-[340px] items-center justify-center gap-2 rounded-[22px] bg-emerald-400 px-7 py-4 font-black text-black shadow-[0_0_28px_rgba(52,211,153,0.22)] active:scale-[0.98]"
    >
      <Plus className="h-5 w-5" />
      Trainingstag hinzufügen
    </button>

    <div className="mt-6 grid grid-cols-3 gap-2 text-xs">
      <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-3">
        <CalendarPlus className="mx-auto mb-2 h-4 w-4 text-emerald-300" />
        <p className="font-bold text-white/80">Tage</p>
      </div>

      <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-3">
        <Plus className="mx-auto mb-2 h-4 w-4 text-emerald-300" />
        <p className="font-bold text-white/80">Übungen</p>
      </div>

      <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-3">
        <Pencil className="mx-auto mb-2 h-4 w-4 text-emerald-300" />
        <p className="font-bold text-white/80">Sätze</p>
      </div>
    </div>
  </div>
</section>
        ) : (
          <div className="space-y-6">
            <section className="flex items-center justify-between rounded-[36px] grid grid-cols-2 gap-4 rounded-[36px] border border-emerald-400/15 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.55),0_0_40px_rgba(16,185,129,0.10)] backdrop-blur-2xl"
>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 text-center">
                <p className="text-3xl font-black text-emerald-300">
                  {trainingDays.length}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {trainingDays.length === 1 ? "Tag" : "Tage"}
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 text-center">
                <p className="text-3xl font-black text-emerald-300">
                {dayExercises.length}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Übungen</p>
              </div>
            </section>

            <div className="space-y-4">
              {trainingDays.map((day) => (
                <div
                  key={day.id}
                  className="rounded-[34px] border border-emerald-400/15 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.075),rgba(255,255,255,0.035))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.55),0_0_35px_rgba(16,185,129,0.08)] backdrop-blur-2xl transition-all hover:border-emerald-400/20"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                        {(day.weekdays || []).length > 0
                          ? (day.weekdays || []).join(" & ")
                          : "Flexibel"}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {getExercisesForDay(day.id).length} Übungen
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditDay(day)}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/10 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.12)] transition-all active:scale-95"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>

                      <button
                        onClick={() => setDeleteDayId(day.id)}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-500/15 bg-red-500/10 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.10)] transition-all active:scale-95"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-1 flex items-center justify-between">
  <h3 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white to-white/75 bg-clip-text text-transparent">
    {day.name}
  </h3>

  <div className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1">
    <p className="text-xs font-bold text-emerald-300">
      {getExercisesForDay(day.id).length} Übungen
    </p>
  </div>
</div>

                  <div className="mt-5 border-t border-white/10 pt-4">
                    {getExercisesForDay(day.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Noch keine Übungen hinzugefügt.
                    </p>
                    ) : (
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={(event) => handleExerciseDragEnd(day.id, event)}
>
  <SortableContext
    items={getExercisesForDay(day.id).map((entry) => entry.id)}
    strategy={verticalListSortingStrategy}
  >
    <div className="space-y-3">
      {getExercisesForDay(day.id).map((entry) => (
        <SortableExerciseCard
          key={entry.id}
          entry={entry}
          onEdit={() => {
            setEditingExerciseEntry(entry)
            setSelectedExerciseToAdd(entry.exercise_library)
            setExerciseSets(entry.sets || 3)
            setExerciseReps(entry.reps || 10)
            setExerciseWarmups(entry.warmup_sets || 0)
          }}
          onDelete={(e) => {
            e.stopPropagation()
            deleteExerciseFromDay(entry.id)
          }}
        />
      ))}
    </div>
  </SortableContext>
</DndContext>
                    )}

                    <button
                      onClick={() => openExerciseLibrary(day)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-[24px] border border-emerald-400/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(16,185,129,0.08))] py-4 text-sm font-bold text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.10)] transition-all active:scale-[0.98]"
                    >
                      <Plus className="h-4 w-4" />
                      Übung hinzufügen
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowCreateDay(true)}
              className="flex w-full items-center justify-center gap-2 rounded-[28px] border border-dashed border-emerald-400/40 bg-emerald-400/10 py-5 text-lg font-black text-emerald-300 shadow-[0_0_28px_rgba(52,211,153,0.14)] active:scale-[0.98]"
            >
              <Plus className="h-5 w-5" />
              Trainingstag hinzufügen
            </button>
          </div>
        )}

        <button
          onClick={() => setShowDeletePlanModal(true)}
          className="mx-auto mt-6 flex items-center justify-center gap-2 rounded-full border border-red-400/15 bg-red-500/10 px-5 py-3 text-sm font-black text-red-300 shadow-[0_0_20px_rgba(248,113,113,0.08)] active:scale-[0.98]"
        >
          <Trash2 className="h-5 w-5" />
          Plan löschen
        </button>
      </main>

      {showCreateDay && (
        <div className="fixed inset-0 z-[95] bg-black/85 backdrop-blur-md">
          <div className="mx-auto min-h-screen max-w-lg px-5 pt-6">
            <div className="flex items-center justify-between">
              <button
                onClick={resetDayForm}
                className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-300 active:scale-95"
              >
                Abbrechen
              </button>

              <h2 className="max-w-[160px] truncate text-xl font-black">
                {editingDay ? "Tag bearbeiten" : "Trainingstag"}
              </h2>

              <button
                onClick={editingDay ? saveTrainingDay : createTrainingDay}
                className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-300 active:scale-95"
              >
                {editingDay ? "Speichern" : "Hinzufügen"}
              </button>
            </div>

            <section className="mt-10 rounded-[32px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl backdrop-blur-xl">
              <p className="text-lg font-black">Wochentage</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Wähle aus, wann dieser Trainingstag geplant ist.
              </p>

              <div className="mt-6 grid grid-cols-7 gap-2">
                {weekdays.map((day) => {
                  const active = selectedWeekdays.includes(day)
                  const used = isWeekdayUsed(day)

                  return (
                    <div key={day} className="text-center">
                      <button
                        onClick={() => toggleWeekday(day)}
                        disabled={used}
                        className={`w-full rounded-2xl py-4 text-sm font-bold transition-all active:scale-95 ${
                          used
                            ? "cursor-not-allowed bg-white/[0.025] text-white/20"
                            : active
                              ? "bg-emerald-400 text-black shadow-[0_0_24px_rgba(52,211,153,0.28)]"
                              : "bg-white/[0.05] text-muted-foreground"
                        }`}
                      >
                        {day}
                      </button>

                      {used && (
                        <p className="mt-1 text-[10px] font-medium text-white/25">
                          belegt
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="mt-6 rounded-[32px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl backdrop-blur-xl">
              <p className="mb-3 text-sm font-semibold text-emerald-300">
                Name des Trainingstags
              </p>

              <input
                value={dayName}
                onChange={(e) => setDayName(e.target.value)}
                placeholder="z.B. Push, Pull, Beine ..."
                className="w-full bg-transparent text-2xl font-semibold outline-none placeholder:text-white/20"
              />
            </section>

            <section className="mt-6 rounded-[32px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl backdrop-blur-xl">
              <p className="text-lg font-black">Pausentimer</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Automatisch nach jedem Satz
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {restOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setRestTimer(option)}
                    className={`rounded-2xl py-3 text-sm font-bold transition-all active:scale-95 ${
                      restTimer === option
                        ? "bg-emerald-400 text-black shadow-[0_0_22px_rgba(52,211,153,0.26)]"
                        : "bg-white/[0.05] text-muted-foreground"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

{showExerciseLibrary && (
  <div className="fixed inset-0 z-[100] overflow-hidden bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
    <div className="mx-auto flex h-dvh max-w-lg flex-col px-5 pt-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setShowExerciseLibrary(false)
                  setExerciseTargetDay(null)
                }}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-xl font-black">Übung auswählen</h2>

              <div className="w-11" />
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] px-5 py-4 shadow-[0_15px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
              <Search className="h-5 w-5 text-emerald-300" />

              <input
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                placeholder="Übung suchen..."
                className="w-full bg-transparent text-base font-medium outline-none placeholder:text-white/25"
              />
            </div>

{!selectedCategory ? (
  <div className="mt-6 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-28 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]">
                <button
  onClick={() => setSelectedCategory("Alle")}
  className="w-full rounded-[28px] border border-emerald-400/20 bg-emerald-400/10 p-5 text-left"
>
  <p className="text-xl font-black text-emerald-300">Alle Übungen</p>
  <p className="mt-1 text-sm text-muted-foreground">
    {exerciseLibrary.length} Übungen
  </p>
</button>
                {exerciseCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className="w-full rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-5 text-left shadow-[0_15px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all active:scale-[0.985]"
                  >
                    <div className="flex items-center justify-between">
  <p className="text-xl font-black">{category}</p>

  <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
    {
      exerciseLibrary.filter(
        (exercise) => exercise.category === category
      ).length
    }
  </span>
</div>
                  </button>
                ))}
              </div>
            ) : (
               <div className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-28 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="mb-4 text-sm font-bold text-emerald-300"
                >
                  ← Kategorien
                </button>

                <div className="space-y-3">
                  {visibleExercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => {
  setSelectedExerciseToAdd(exercise)
  setExerciseSets(3)
  setExerciseReps(10)
  setExerciseWarmups(0)
}}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-left"
                    >
                      <p className="font-bold">{exercise.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {exercise.muscle_group}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {deleteDayId && (

  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md">
    <div className="mx-5 w-full max-w-sm rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.12),transparent_40%),linear-gradient(180deg,rgba(18,18,18,0.98),rgba(8,8,8,0.98))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.75),0_0_35px_rgba(239,68,68,0.10)] backdrop-blur-2xl animate-in zoom-in-95 fade-in duration-200">
      <h3 className="text-xl font-black">
        Trainingstag löschen?
      </h3>

      <p className="mt-2 text-sm text-muted-foreground">
        Dieser Trainingstag und alle Übungen darin werden gelöscht.
      </p>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => setDeleteDayId(null)}
          className="flex-1 rounded-2xl border border-white/10 py-3"
        >
          Abbrechen
        </button>

        <button
          onClick={async () => {
            await reallyDeleteTrainingDay(deleteDayId)
            setDeleteDayId(null)
          }}
          className="flex-1 rounded-2xl bg-red-500/15 py-3 font-bold text-red-400"
        >
          Löschen
        </button>
      </div>
    </div>
  </div>
)}
{deleteExerciseId && (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md">
    <div className="mx-5 w-full max-w-sm rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.12),transparent_40%),linear-gradient(180deg,rgba(18,18,18,0.98),rgba(8,8,8,0.98))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.75),0_0_35px_rgba(239,68,68,0.10)] backdrop-blur-2xl animate-in zoom-in-95 fade-in duration-200">
      <h3 className="text-xl font-black">
        Übung entfernen?
      </h3>

      <p className="mt-2 text-sm text-muted-foreground">
        Diese Übung wird aus dem Trainingstag entfernt.
      </p>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => setDeleteExerciseId(null)}
          className="flex-1 rounded-2xl border border-white/10 py-3"
        >
          Abbrechen
        </button>

        <button
          onClick={async () => {
            await reallyDeleteExercise(deleteExerciseId)
            setDeleteExerciseId(null)
          }}
          className="flex-1 rounded-2xl bg-red-500/15 py-3 font-bold text-red-400"
        >
          Entfernen
        </button>
      </div>
    </div>
  </div>
)}
{selectedExerciseToAdd && (
  <div className="fixed inset-0 z-[210] flex items-end bg-black/70 backdrop-blur-md">
    <div className="w-full rounded-t-[38px] border-t border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_38%),linear-gradient(180deg,rgba(18,18,18,0.98),rgba(8,8,8,0.98))] p-6 shadow-[0_-30px_90px_rgba(0,0,0,0.75),0_0_45px_rgba(16,185,129,0.12)] backdrop-blur-2xl animate-in slide-in-from-bottom-6 duration-300">
      <h3 className="text-2xl font-black">
        {selectedExerciseToAdd.name}
      </h3>

      <p className="mt-1 text-sm text-muted-foreground">
        {selectedExerciseToAdd.muscle_group}
      </p>

      <div className="mt-6 space-y-4">
{[
  ["Sätze", exerciseSets, setExerciseSets],
  [getRepsSetupLabel(selectedExerciseToAdd), exerciseReps, setExerciseReps],
  ["Warmup", exerciseWarmups, setExerciseWarmups],
].map(([label, value, setter]: any) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/[0.05] p-4"
          >
            <p className="font-bold">{label}</p>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setter(Math.max(0, value - 1))}
                className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.06] text-xl text-white/80 shadow-inner active:scale-90"
              >
                -
              </button>

              <p className="min-w-[48px] text-center text-3xl font-black text-emerald-300">
                {value}
              </p>

              <button
                onClick={() => setter(value + 1)}
                className="h-10 w-10 rounded-full bg-emerald-400 text-xl font-black text-black shadow-[0_0_22px_rgba(52,211,153,0.35)] active:scale-90"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => {
  setSelectedExerciseToAdd(null)
  setEditingExerciseEntry(null)
}}
          className="flex-1 rounded-2xl border border-white/10 py-4 font-bold"
        >
          Abbrechen
        </button>

        <button
          onClick={async () => {
            if (editingExerciseEntry) {
  await saveExerciseSettings()
} else {
  await addExerciseToDay(selectedExerciseToAdd)
  setSelectedExerciseToAdd(null)
}
          }}
          className="flex-1 rounded-2xl bg-emerald-400 py-4 font-black text-black"
        >
          {editingExerciseEntry ? "Speichern" : "Hinzufügen"}
        </button>
      </div>
    </div>
  </div>
)}
{showDeletePlanModal && (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md">
    <div className="mx-5 w-full max-w-sm rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.12),transparent_40%),linear-gradient(180deg,rgba(18,18,18,0.98),rgba(8,8,8,0.98))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
      <h3 className="text-xl font-black">
        Trainingsplan löschen?
      </h3>

      <p className="mt-2 text-sm text-muted-foreground">
        Der komplette Trainingsplan wird gelöscht.
      </p>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => setShowDeletePlanModal(false)}
          className="flex-1 rounded-2xl border border-white/10 py-3"
        >
          Abbrechen
        </button>

        <button
          onClick={async () => {
            await deletePlan()
            setShowDeletePlanModal(false)
          }}
          className="flex-1 rounded-2xl bg-red-500/15 py-3 font-bold text-red-400"
        >
          Löschen
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  )
}