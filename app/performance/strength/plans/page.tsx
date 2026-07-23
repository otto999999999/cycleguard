"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Loader2,
  Plus,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function TrainingPlansPage() {
  const router = useRouter()
  const [showCreatePlan, setShowCreatePlan] = useState(false)
  const [showImportPlan, setShowImportPlan] = useState(false)
  const [importCode, setImportCode] = useState("")
  const [newPlanName, setNewPlanName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [plans, setPlans] = useState<any[]>([])

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.replace("/login")
      return
    }

    const { data, error } = await supabase
      .from("training_plans")
      .select(`
        *,
        training_days (
          id,
          name,
          weekdays
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      alert(error.message)
    } else {
      setPlans(data || [])
    }

    setLoading(false)
  }

  const activatePlan = async (planId: string) => {
    setSaving(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.replace("/login")
      return
    }

    const { error: deactivateError } = await supabase
      .from("training_plans")
      .update({ active: false })
      .eq("user_id", user.id)

    if (deactivateError) {
      alert(deactivateError.message)
      setSaving(false)
      return
    }

    const { error: activateError } = await supabase
      .from("training_plans")
      .update({ active: true })
      .eq("id", planId)
      .eq("user_id", user.id)

    if (activateError) {
      alert(activateError.message)
    } else {
      setPlans((prev) =>
        prev.map((plan) => ({
          ...plan,
          active: plan.id === planId,
        }))
      )
    }

    setSaving(false)
  }


const importPlanFromCode = async () => {
  const code = importCode.trim().toUpperCase()

  if (!code) {
    alert("Code eingeben.")
    return
  }

  setSaving(true)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    router.replace("/login")
    return
  }

  const { data: shareData, error: shareError } = await supabase
    .from("training_plan_share_codes")
    .select("*")
    .eq("code", code)
    .maybeSingle()

  if (shareError || !shareData) {
    alert("Code nicht gefunden.")
    setSaving(false)
    return
  }

  const snapshot = shareData.snapshot

  if (!snapshot?.plan || !Array.isArray(snapshot?.trainingDays)) {
    alert("Dieser Code ist ungültig.")
    setSaving(false)
    return
  }

  const shouldBeActive = plans.length === 0

  const { data: newPlan, error: planError } = await supabase
    .from("training_plans")
    .insert({
      user_id: user.id,
      name: `${snapshot.plan.name || "Importierter Plan"} Kopie`,
      active: shouldBeActive,
    })
    .select("*")
    .single()

  if (planError || !newPlan) {
    alert(planError?.message || "Plan konnte nicht erstellt werden.")
    setSaving(false)
    return
  }

  for (const day of snapshot.trainingDays) {
    const { data: newDay, error: dayError } = await supabase
      .from("training_days")
      .insert({
        user_id: user.id,
        plan_id: newPlan.id,
        name: day.name || "Trainingstag",
        weekdays: day.weekdays || [],
      })
      .select("*")
      .single()

    if (dayError || !newDay) {
      alert(dayError?.message || "Trainingstag konnte nicht importiert werden.")
      continue
    }

    const exercises = Array.isArray(day.exercises) ? day.exercises : []

    if (exercises.length > 0) {
const orderedExercises = [...exercises].sort((a: any, b: any) => {
  const aPos = Number(a.position ?? 9999)
  const bPos = Number(b.position ?? 9999)

  if (aPos !== bPos) return aPos - bPos

  return 0
})

const rows = orderedExercises.map((entry: any, index: number) => ({
  user_id: user.id,
  training_day_id: newDay.id,
  exercise_id: entry.exercise_id,
  sets: entry.sets || 3,
  reps: entry.reps || 10,
  warmup_sets: entry.warmup_sets || 0,
  tracking_type: entry.tracking_type || "reps",
  position: index,
}))

      const { error: exercisesError } = await supabase
        .from("training_day_exercises")
        .insert(rows)

      if (exercisesError) {
        alert(exercisesError.message)
      }
    }
  }

  setImportCode("")
  setShowImportPlan(false)
  setShowCreatePlan(false)
  await loadPlans()

  setSaving(false)
}

const createPlan = async () => {
  const name = newPlanName.trim()

  if (!name) {
    alert("Planname fehlt.")
    return
  }

  setSaving(true)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    router.replace("/login")
    return
  }

  const shouldBeActive = plans.length === 0

  const { data, error } = await supabase
    .from("training_plans")
    .insert({
      user_id: user.id,
      name,
      active: shouldBeActive,
    })
    .select(`
      *,
      training_days (
        id,
        name,
        weekdays
      )
    `)
    .single()

  if (error) {
    alert(error.message)
  } else {
    setPlans((prev) => [...prev, data])
    setNewPlanName("")
    setShowCreatePlan(false)
  }

  setSaving(false)
}

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-9 w-9 animate-spin text-emerald-300" />
          <p className="text-sm text-muted-foreground">Trainingspläne werden geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] pb-20 text-white">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-80px] top-[-120px] h-[340px] w-[340px] rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute right-[-100px] top-[220px] h-[300px] w-[300px] rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <Link
            href="/performance/strength"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="text-center">
            <h1 className="text-xl font-black tracking-tight">Trainingspläne</h1>
            <p className="text-xs text-muted-foreground">Aktiven Plan auswählen</p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreatePlan(true)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pt-6">
        <section className="relative overflow-hidden rounded-[36px] border border-emerald-400/20 bg-gradient-to-br from-emerald-400/[0.12] via-white/[0.035] to-white/[0.015] p-6 shadow-2xl backdrop-blur-xl">
          <div className="absolute right-[-70px] top-[-70px] h-[180px] w-[180px] rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-black text-emerald-300">
              <Dumbbell className="h-3.5 w-3.5" />
              Plan Auswahl
            </div>

            <h2 className="text-4xl font-black tracking-tight">
              Wähle deinen
              <span className="block text-emerald-300">aktiven Plan.</span>
            </h2>

            <p className="mt-4 max-w-[330px] text-sm leading-6 text-muted-foreground">
              Nur ein Trainingsplan kann aktiv sein. Dieser Plan wird auf der Gym-Startseite für heutiges Training benutzt.
            </p>
          </div>
        </section>

        <section className="mt-6 space-y-3">
          {plans.length === 0 ? (
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 text-center">
              <p className="font-black">Noch keine Trainingspläne</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Erstelle zuerst einen Plan auf der Gym-Seite.
              </p>
            </div>
          ) : (
            plans.map((plan) => {
              const active = Boolean(plan.active)
              const daysCount = plan.training_days?.length || 0

              return (
                <div
                  key={plan.id}
                  className={`overflow-hidden rounded-[30px] border p-4 ${
                    active
                      ? "border-emerald-400/25 bg-emerald-400/10 shadow-[0_0_30px_rgba(52,211,153,0.12)]"
                      : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => router.push(`/performance/strength/plan/${plan.id}`)}
                      className="min-w-0 flex-1 text-left active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-xl font-black">
                          {plan.name || "Trainingsplan"}
                        </h3>

                        {active && (
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                            Aktiv
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {daysCount} Trainingstage
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => activatePlan(plan.id)}
                      disabled={saving || active}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border active:scale-95 disabled:opacity-70 ${
                        active
                          ? "border-emerald-400/20 bg-emerald-400/15 text-emerald-300"
                          : "border-white/10 bg-white/[0.05] text-white/60"
                      }`}
                    >
                      {active ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </section>
      </main>
      {showCreatePlan && (
  <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/80 px-4 pb-4 backdrop-blur-md sm:items-center sm:p-6">
    <div className="w-full max-w-md rounded-[34px] border border-white/10 bg-gradient-to-b from-[#111111] to-[#070707] p-5 shadow-2xl shadow-black/50">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
            Neuer Plan
          </div>

          <h2 className="text-2xl font-black tracking-tight">
            Trainingsplan erstellen
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Erstelle einen neuen Plan. Aktivieren kannst du ihn danach über den Haken.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
  setShowCreatePlan(false)
  setShowImportPlan(false)
  setImportCode("")
}}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/60 active:scale-95"
        >
          ✕
        </button>
      </div>

      <input
        value={newPlanName}
        onChange={(e) => setNewPlanName(e.target.value)}
        placeholder="z.B. Push Pull Legs"
        className="w-full rounded-[22px] border border-white/10 bg-black/30 px-4 py-4 text-sm font-bold outline-none placeholder:text-white/25"
      />

      <button
        type="button"
        onClick={createPlan}
        disabled={saving}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-[22px] bg-emerald-400 py-4 font-black text-black shadow-[0_0_24px_rgba(52,211,153,0.20)] active:scale-[0.98] disabled:opacity-50"
      >
        <Plus className="h-5 w-5" />
        Plan erstellen
      </button>
      <button
  type="button"
  onClick={() => setShowImportPlan(!showImportPlan)}
  className="mt-5 w-full text-center text-sm font-black text-emerald-300 active:scale-[0.98]"
>
  Plan importieren
</button>

{showImportPlan && (
  <div className="mt-4 rounded-[24px] border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
    <p className="mb-3 text-sm font-black text-white">
      Share-Code einfügen
    </p>

    <input
      value={importCode}
      onChange={(e) => setImportCode(e.target.value.toUpperCase())}
      placeholder="z.B. CG-8K2LM9QA"
      className="w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold uppercase tracking-wider outline-none placeholder:text-white/25"
    />

    <button
      type="button"
      onClick={importPlanFromCode}
      disabled={saving}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-[20px] bg-white py-3 font-black text-black active:scale-[0.98] disabled:opacity-50"
    >
      Plan importieren
    </button>
  </div>
)}
    </div>
  </div>
)}
    </div>
  )
}