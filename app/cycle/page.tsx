"use client"

import { useEffect, useState } from "react"
import { Edit, PlayCircle, Loader2, Plus, Square, Trash2, CalendarDays, X } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
const daysShort = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
const DAY_KEYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
const ORAL_TYPES = ["Oral", "Medication", "AI (Aromatase Inhibitor)", "SARM", "PCT", "Supplement"]
const getBaseUnit = (unit: string) => {
  const lower = String(unit || "").toLowerCase()

  if (lower.includes("mcg")) return "mcg"
  if (lower.includes("mg")) return "mg"
  if (lower.includes("g")) return "g"
  if (lower.includes("ml")) return "ml"

  return "mg"
}

const getOralUnitLabel = (compound: any, count?: number) => {
  const unit = String(compound?.pill_unit || "").toLowerCase()
  const single = count === 1

  if (compound?.type !== "Supplement") return single ? "Pille" : "Pillen"
  if (unit.includes("drop")) return "Tropfen"
  if (unit.includes("ml")) return single ? "Portion" : "Portionen"
  if (unit.includes("scoop") || unit.includes("portion")) return single ? "Einheit" : "Einheiten"

  return single ? "Pille" : "Pillen"
}

const dateKeyLocal = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
const haptic = () => {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(12)
  }
}
const todayKey = () => dateKeyLocal(new Date())

export default function CyclePage() {
  const [cycles, setCycles] = useState<any[]>([])
  const [userCompounds, setUserCompounds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [trainingDays, setTrainingDays] = useState<any[]>([])
  const [showCycleModal, setShowCycleModal] = useState(false)
  const [showCompoundModal, setShowCompoundModal] = useState(false)
  const [showPCTModal, setShowPCTModal] = useState(false)
  const [showDosingModal, setShowDosingModal] = useState(false)

  const [editingCycle, setEditingCycle] = useState<any>(null)
  const [savingCycle, setSavingCycle] = useState(false)
  const [selectedCompoundForDosing, setSelectedCompoundForDosing] = useState<any>(null)

  const [cycleName, setCycleName] = useState("")
  const [cycleType, setCycleType] = useState<"normal" | "trt">("normal")
  const [planCategory, setPlanCategory] = useState<"cycle" | "supplement">("cycle")
  const [durationWeeks, setDurationWeeks] = useState(12)
  const [description, setDescription] = useState("")
  const [mainStack, setMainStack] = useState<any[]>([])
  const [pctStack, setPctStack] = useState<any[]>([])

  const isOral = (c: any) => ORAL_TYPES.includes(c.type)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      return
    }

    const { data: cyclesData, error: cyclesError } = await supabase
      .from("cycles")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (cyclesError) alert("Fehler beim Laden der Cycles: " + cyclesError.message)
    setCycles(cyclesData || [])

    const { data: compoundsData, error: compoundsError } = await supabase
      .from("compounds")
      .select("*")
      .eq("user_id", session.user.id)
      .order("name")

if (compoundsError) alert("Fehler beim Laden der Substanzen: " + compoundsError.message)
setUserCompounds(compoundsData || [])

const { data: trainingDaysData } = await supabase
  .from("training_days")
  .select("id, name, weekdays")
  .eq("user_id", session.user.id)

setTrainingDays(trainingDaysData || [])

setLoading(false)
  }

  const resetForm = () => {
    setEditingCycle(null)
    setCycleName("")
    setCycleType("normal")
    setPlanCategory("cycle")
    setDurationWeeks(12)
    setDescription("")
    setMainStack([])
    setPctStack([])
  }

  const openCreateModal = () => {
    resetForm()
    setShowCycleModal(true)
  }

  const openEditModal = (cycle: any) => {
    setEditingCycle(cycle)
    setCycleName(cycle.name || "")
    setCycleType(cycle.cycle_type || (cycle.indefinite ? "trt" : "normal"))
    setPlanCategory(cycle.plan_category || "cycle")
    setDurationWeeks(cycle.duration_weeks || 12)
    setDescription(cycle.description || "")
    setMainStack(cycle.main_stack || [])
    setPctStack(cycle.pct_stack || [])
    setShowCycleModal(true)
  }

const buildCompoundConfig = (compound: any) => {
  const oral = isOral(compound)
  const baseUnit = oral ? getBaseUnit(compound.pill_unit || "mg") : "mg"

  return {
    id: compound.id,
    name: compound.name,
    type: compound.type,
    method: oral ? "Oral" : compound.method || "IM",
    startWeek: 1,
    endWeek: cycleType === "trt" ? 9999 : durationWeeks,
    doseAmount: oral ? compound.dose_per_pill || 25 : compound.concentration || 250,
    doseUnit: oral ? baseUnit : "mg",
    frequency: oral ? "Daily" : "E3D",
    customDays: [],
    manufacturer: compound.manufacturer || null,
  }
}

  const addToMainStack = (compound: any) => {
    if (mainStack.some((c) => c.id === compound.id)) return

    const newCompound = buildCompoundConfig(compound)
    setMainStack((prev) => [...prev, newCompound])
    setSelectedCompoundForDosing({ ...newCompound, stackType: "main" })
    setShowCompoundModal(false)
    setShowDosingModal(true)
  }

  const addToPCTStack = (compound: any) => {
    if (pctStack.some((c) => c.id === compound.id)) return

    const newCompound = buildCompoundConfig(compound)
    setPctStack((prev) => [...prev, newCompound])
    setSelectedCompoundForDosing({ ...newCompound, stackType: "pct" })
    setShowPCTModal(false)
    setShowDosingModal(true)
  }

  const openDosingModal = (compound: any, stackType: "main" | "pct") => {
    setSelectedCompoundForDosing({ ...compound, stackType })
    setShowDosingModal(true)
  }

  const updateDosing = (key: string, value: any) => {
    setSelectedCompoundForDosing((prev: any) => prev ? { ...prev, [key]: value } : prev)
  }

  const toggleCustomDay = (day: string) => {
    if (!selectedCompoundForDosing) return

    const current = selectedCompoundForDosing.customDays || []
    const next = current.includes(day)
      ? current.filter((d: string) => d !== day)
      : [...current, day]

    updateDosing("customDays", next)
  }

  const saveDosingConfig = () => {
    if (!selectedCompoundForDosing) return

    const { stackType, ...cleanCompound } = selectedCompoundForDosing

    if (stackType === "main") {
      setMainStack((prev) => prev.map((c) => c.id === cleanCompound.id ? cleanCompound : c))
    }

    if (stackType === "pct") {
      setPctStack((prev) => prev.map((c) => c.id === cleanCompound.id ? cleanCompound : c))
    }

    setShowDosingModal(false)
    setSelectedCompoundForDosing(null)
  }

const saveCycle = async () => {
  if (savingCycle) return

  setSavingCycle(true)

  try {
    if (!cycleName.trim()) {
      haptic()
      toast.error("Bitte Cycle-Namen eingeben")
      return
    }

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      haptic()
      toast.error("Nicht eingeloggt")
      return
    }

    const payload = {
      name: cycleName.trim(),
      cycle_type: cycleType,
      plan_category: planCategory,
      indefinite: cycleType === "trt",
      duration_weeks: cycleType === "trt" ? null : durationWeeks,
      description: description.trim() || null,
      main_stack: mainStack,
      pct_stack: pctStack,
      user_id: session.user.id,
      updated_at: new Date().toISOString(),
    }

    if (editingCycle) {
      const { error } = await supabase
        .from("cycles")
        .update(payload)
        .eq("id", editingCycle.id)
        .eq("user_id", session.user.id)

      if (error) {
        haptic()
        toast.error("Fehler beim Bearbeiten: " + error.message)
        return
      }

      haptic()
      toast.success("Cycle aktualisiert")
    } else {
      const { error } = await supabase
        .from("cycles")
        .insert({
          ...payload,
          active: false,
          start_date: null,
        })

      if (error) {
        haptic()
        toast.error("Fehler beim Erstellen: " + error.message)
        return
      }

      haptic()
      toast.success("Cycle erstellt")
    }

    setShowCycleModal(false)
    resetForm()
    await loadData()
  } finally {
    setSavingCycle(false)
  }
}
  const startCycle = async (cycle: any) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

const planCategory = cycle.plan_category || "cycle"

const { error: stopError } = await supabase
  .from("cycles")
  .update({ active: false })
  .eq("user_id", session.user.id)
  .eq("active", true)
  .eq("plan_category", planCategory)

    if (stopError) {
      alert("Fehler beim Stoppen alter Cycles: " + stopError.message)
      return
    }

    const { error } = await supabase
      .from("cycles")
      .update({
        active: true,
        start_date: cycle.start_date || todayKey(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", cycle.id)
      .eq("user_id", session.user.id)

    if (error) {
      haptic()
toast.error("Fehler beim Starten: " + error.message)
      return
    }

    await loadData()
  }

  const stopCycle = async (cycle: any) => {
    const { error } = await supabase
      .from("cycles")
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cycle.id)

    if (error) {
      haptic()
toast.error("Fehler beim Stoppen: " + error.message)
      return
    }

    await loadData()
  }

  const deleteCycle = async (cycle: any) => {
    if (!confirm(`Cycle "${cycle.name}" wirklich löschen?`)) return

    const { error } = await supabase
      .from("cycles")
      .delete()
      .eq("id", cycle.id)

    if (error) {
      haptic()
toast.error("Fehler beim Löschen: " + error.message)
      return
    }

    await loadData()
  }

const formatSchedule = (c: any) => {
  if (c.frequency === "Custom" && c.customDays?.length) return c.customDays.join(", ")
  if (c.frequency === "Injection Days") return "An Injektionstagen"
  if (c.frequency === "Training Days") return "An Trainingstagen"
  return c.frequency
}
const isTrainingDay = (date: Date) => {
  const dayShort = DAY_KEYS[date.getDay()]

  return trainingDays.some((day) =>
    (day.weekdays || []).includes(dayShort)
  )
}
  const renderLine = (c: any) => {
    const endText = c.endWeek >= 9999 ? "dauerhaft" : `Woche ${c.startWeek}–${c.endWeek}`
    return `${endText} • ${c.doseAmount} ${getBaseUnit(c.doseUnit || "mg")} • ${formatSchedule(c)}`
  }

  const getCycleProgress = (cycle: any) => {
    if (!cycle.start_date) {
      return { label: "Noch nicht gestartet", percent: 0, endDate: null as string | null, runningDays: 0 }
    }

    const start = new Date(cycle.start_date)
    const now = new Date()
    const diffDays = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000))
    const runningDays = diffDays + 1

    if (cycle.indefinite || cycle.cycle_type === "trt") {
      return {
        label: `Läuft seit ${runningDays} Tagen`,
        percent: 100,
        endDate: null as string | null,
        runningDays,
      }
    }

    const totalDays = (cycle.duration_weeks || 1) * 7
    const percent = Math.min(100, Math.round((runningDays / totalDays) * 100))

    const end = new Date(start)
    end.setDate(start.getDate() + totalDays)

    const currentWeek = Math.min(cycle.duration_weeks || 1, Math.floor(diffDays / 7) + 1)

    return {
      label: `Woche ${currentWeek} von ${cycle.duration_weeks}`,
      percent,
      endDate: dateKeyLocal(end),
      runningDays,
    }
  }

const getDueForCycleDate = (cycle: any, dateKey: string) => {
  if (!cycle.active || !cycle.start_date) return []

  const stack = [...(cycle.main_stack || []), ...(cycle.pct_stack || [])]
  const date = new Date(dateKey)
  const dayShort = DAY_KEYS[date.getDay()]
  const start = new Date(cycle.start_date)
  const diffDays = Math.floor((date.getTime() - start.getTime()) / 86400000)

  if (diffDays < 0) return []

  const isDueByFrequency = (item: any) => {
    const startWeek = item.startWeek || 1
    const endWeek =
      cycle.indefinite || cycle.cycle_type === "trt"
        ? 9999
        : item.endWeek || cycle.duration_weeks || 12

    const currentWeek = Math.floor(diffDays / 7) + 1

    if (currentWeek < startWeek || currentWeek > endWeek) return false

    if (item.frequency === "Daily" || item.frequency === "Twice Daily") return true
    if (item.frequency === "Custom") return (item.customDays || []).includes(dayShort)
    if (item.frequency === "EOD") return diffDays % 2 === 0
    if (item.frequency === "E3D") return diffDays % 3 === 0
    if (item.frequency === "Weekly") return diffDays % 7 === 0
    if (item.frequency === "Training Days") return isTrainingDay(date)

    return false
  }

  const hasInjectionDueToday = stack.some((item) => {
    if (item.method === "Oral") return false
    if (ORAL_TYPES.includes(item.type)) return false

    return isDueByFrequency(item)
  })

  return stack.filter((item) => {
    if (item.frequency === "Injection Days") {
      return hasInjectionDueToday
    }

    return isDueByFrequency(item)
  })
}

  const getNextDose = (cycle: any) => {
    for (let i = 0; i < 60; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      const key = dateKeyLocal(date)
      const due = getDueForCycleDate(cycle, key)

      if (due.length > 0) {
        return {
          date: key,
          items: due,
        }
      }
    }

    return null
  }
const availableMainCompounds =
  planCategory === "supplement"
    ? userCompounds.filter((compound) => compound.type === "Supplement")
    : userCompounds

const availablePCTCompounds =
  planCategory === "supplement"
    ? []
    : userCompounds
  const getStackAnalysis = (cycle: any) => {
    const stack = [...(cycle.main_stack || []), ...(cycle.pct_stack || [])]

    const oralCount = stack.filter((x) => x.method === "Oral").length
    const injectableCount = stack.filter((x) => x.method !== "Oral").length

    return {
      totalItems: stack.length,
      oralCount,
      injectableCount,
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-foreground pb-32">
      <div className="fixed inset-0 -z-10 overflow-hidden">
  <div className="absolute top-[-120px] left-[-80px] w-[320px] h-[320px] bg-emerald-500/10 rounded-full blur-3xl" />

  <div className="absolute top-[120px] right-[-100px] w-[260px] h-[260px] bg-blue-500/10 rounded-full blur-3xl" />

  <div className="absolute bottom-[-120px] left-[20%] w-[280px] h-[280px] bg-purple-500/10 rounded-full blur-3xl" />
</div>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 px-5 py-4 backdrop-blur-2xl">
        <h1 className="text-2xl font-bold">Cycle</h1>
      </header>

      <main className="px-5 pt-6">
        {loading ? (
          <p className="text-center text-muted-foreground py-20">Lade Cycles...</p>
        ) : cycles.length === 0 ? (
<div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-1">
  <div className="relative w-full overflow-hidden rounded-[34px] border border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.12] via-white/[0.045] to-[#070707] px-6 py-8 text-center shadow-[0_0_45px_rgba(52,211,153,0.10)]">
    <div className="absolute right-[-70px] top-[-80px] h-[190px] w-[190px] rounded-full bg-emerald-400/15 blur-3xl" />

    <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] border border-emerald-400/20 bg-emerald-400/10 shadow-[0_0_28px_rgba(52,211,153,0.12)]">
      <PlayCircle className="h-10 w-10 text-emerald-300" />
    </div>

    <div className="relative">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
        Noch kein Plan
      </p>

      <h2 className="text-3xl font-black tracking-tight">
        Erstelle deinen ersten Stack
      </h2>

      <p className="mx-auto mt-3 max-w-[320px] text-sm leading-6 text-muted-foreground">
        Plane einen Cycle oder Supplement-Plan mit Zeitraum, Dosierung und Einnahme-Rhythmus.
      </p>

      <button
        onClick={openCreateModal}
        className="mx-auto mt-7 flex items-center justify-center gap-2 rounded-[22px] bg-emerald-400 px-7 py-4 font-black text-black shadow-[0_0_28px_rgba(52,211,153,0.22)] active:scale-[0.98]"
      >
        <Plus className="h-5 w-5" />
        Plan erstellen
      </button>

      <div className="mt-6 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-3">
          <PlayCircle className="mx-auto mb-2 h-4 w-4 text-emerald-300" />
          <p className="font-bold text-white/80">Cycle</p>
        </div>

        <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-3">
          <Plus className="mx-auto mb-2 h-4 w-4 text-emerald-300" />
          <p className="font-bold text-white/80">Supps</p>
        </div>

        <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-3">
          <CalendarDays className="mx-auto mb-2 h-4 w-4 text-emerald-300" />
          <p className="font-bold text-white/80">Planung</p>
        </div>
      </div>
    </div>
  </div>
</div>
        ) : (
          <div className="space-y-4">
            {cycles.map((cycle) => {
              const progress = getCycleProgress(cycle)
              const todayDue = getDueForCycleDate(cycle, todayKey())
              const nextDose = getNextDose(cycle)
              const analysis = getStackAnalysis(cycle)
              const isTrt = cycle.indefinite || cycle.cycle_type === "trt"

              return (
                <div
                  key={cycle.id}
                  className={`rounded-[32px] p-5 border shadow-2xl backdrop-blur-xl transition-all duration-300 ${
                    cycle.active
  ? "bg-gradient-to-br from-emerald-500/[0.10] to-[#080808] border-emerald-400/20 shadow-[0_0_40px_rgba(52,211,153,0.08)]"
  : "bg-gradient-to-br from-[#101010] to-[#080808] border-white/10"
                  }`}
                >
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <p className={`text-xs mb-1 ${cycle.active ? "text-emerald-400" : "text-muted-foreground"}`}>
                        {cycle.active ? "Aktiv" : "Gespeichert"}
                      </p>

                      <h2 className="text-xl font-semibold truncate">{cycle.name}</h2>

                      <p className="text-sm text-muted-foreground mt-1">
                        {isTrt
                          ? "TRT • läuft unbegrenzt"
                          : `${cycle.duration_weeks} Wochen`}
                        {cycle.start_date ? ` • Start: ${cycle.start_date}` : ""}
                      </p>

                      <p className="text-xs text-muted-foreground mt-2">
                        {(cycle.main_stack || []).length} Cycle Substanzen • {(cycle.pct_stack || []).length} PCT
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => openEditModal(cycle)} className="p-3 rounded-2xl border border-white/5 bg-white/[0.04] backdrop-blur-md active:scale-95 transition-all">
                        <Edit className="w-5 h-5" />
                      </button>

                      <button onClick={() => deleteCycle(cycle)} className="p-3 rounded-2xl border border-red-500/10 bg-red-500/10 text-red-400 backdrop-blur-md active:scale-95 transition-all">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {cycle.active && (
                    <div className="mt-5 space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>{progress.label}</span>
                          {!isTrt && <span>{progress.percent}%</span>}
                        </div>

                        {!isTrt ? (
                          <div className="h-3 bg-black/40 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500 shadow-[0_0_16px_rgba(52,211,153,0.45)]"
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                        ) : (
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 text-sm text-blue-300">
                            TRT / dauerhaft aktiv
                          </div>
                        )}

                        {progress.endDate && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Ende ca. {progress.endDate}
                          </p>
                        )}
                      </div>

{cycle.plan_category === "supplement" ? (
  <div className="grid grid-cols-2 gap-2 text-center text-xs">
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 shadow-lg backdrop-blur-md">
      <p className="font-semibold text-emerald-400">{analysis.totalItems}</p>
      <p className="text-muted-foreground">Supplemente</p>
    </div>

    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 shadow-lg backdrop-blur-md">
      <p className="font-semibold text-blue-400">{todayDue.length}</p>
      <p className="text-muted-foreground">Heute</p>
    </div>
  </div>
) : (
  <div className="grid grid-cols-3 gap-2 text-center text-xs">
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 shadow-lg backdrop-blur-md">
      <p className="font-semibold">{analysis.totalItems}</p>
      <p className="text-muted-foreground">Stack</p>
    </div>

    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 shadow-lg backdrop-blur-md">
      <p className="font-semibold text-blue-400">{analysis.oralCount}</p>
      <p className="text-muted-foreground">Oral</p>
    </div>

    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 shadow-lg backdrop-blur-md">
      <p className="font-semibold text-emerald-400">{analysis.injectableCount}</p>
      <p className="text-muted-foreground">Inj.</p>
    </div>
  </div>
)}

                      <div className="rounded-[24px] border border-emerald-400/10 bg-gradient-to-br from-emerald-500/[0.06] to-[#101010] p-4 backdrop-blur-xl shadow-xl">
                        <p className="text-sm font-semibold mb-2">Heute geplant</p>

                        {todayDue.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Heute ist nichts geplant.</p>
                        ) : (
                          <div className="space-y-2">
                            {todayDue.map((item: any) => (
                              <div key={item.id} className="text-sm flex justify-between gap-3">
                                <span>{item.name}</span>
<span className="text-muted-foreground">
  {item.doseAmount} {getBaseUnit(item.doseUnit || "mg")}
</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {nextDose && (
                        <div className="rounded-[24px] border border-blue-400/10 bg-gradient-to-br from-blue-500/[0.06] to-[#101010] p-4 backdrop-blur-xl shadow-xl">
                          <p className="text-sm font-semibold mb-1">Nächste Dosis</p>
                          <p className="text-sm text-muted-foreground">
                            {nextDose.date} • {nextDose.items.map((x: any) => x.name).join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

<CycleStackMini
  title={cycle.plan_category === "supplement" ? "Supplement Stack" : "Cycle Stack"}
  items={cycle.main_stack || []}
  renderLine={renderLine}
/>

{cycle.plan_category !== "supplement" && (
  <CycleStackMini
    title="PCT Stack"
    items={cycle.pct_stack || []}
    renderLine={renderLine}
    pct
  />
)}

                  <div className="flex gap-3 mt-5">
                    {cycle.active ? (
<button
  onClick={() => stopCycle(cycle)}
  className="flex-1 rounded-[24px] border border-red-400/20 bg-red-500/15 py-4 font-black text-red-300 transition-all active:scale-[0.98]"
>
  <span className="flex items-center justify-center gap-2">
    <Square className="h-5 w-5" />
    Stoppen
  </span>
</button>
                    ) : (
                      <button
  onClick={() => startCycle(cycle)}
  className="group flex-1 overflow-hidden rounded-[24px] border border-emerald-300/20 bg-gradient-to-r from-emerald-400 to-emerald-500 py-4 font-black text-black shadow-[0_0_30px_rgba(52,211,153,0.22)] transition-all active:scale-[0.98]"
>
  <span className="flex items-center justify-center gap-2">
    <PlayCircle className="h-5 w-5 transition-transform group-active:scale-90" />
    {cycle.plan_category === "supplement" ? "Plan starten" : "Cycle starten"}
  </span>
</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

{cycles.length > 0 && (
  <button
    onClick={openCreateModal}
    className="fixed bottom-24 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/20 bg-gradient-to-br from-emerald-400 to-emerald-500 text-black shadow-[0_0_40px_rgba(52,211,153,0.45)] active:scale-95"
  >
    <Plus className="h-7 w-7" />
  </button>
)}

      <BottomNav />

      {showCycleModal && (
        <Modal title={editingCycle ? "Cycle bearbeiten" : "Neuen Cycle erstellen"} onClose={() => setShowCycleModal(false)}>
          <div className="space-y-6">
            <Card title="Grunddaten" subtitle="Name, Typ und Beschreibung.">
              <Field label="Plan-Art">
  <div className="grid grid-cols-2 gap-3">
    <button
      type="button"
      onClick={() => {
        setPlanCategory("cycle")
      }}
      className={`rounded-2xl py-3.5 font-medium ${
        planCategory === "cycle" ? "bg-primary text-white" : "bg-[#181818]"
      }`}
    >
      Cycle
    </button>

    <button
      type="button"
      onClick={() => {
        setPlanCategory("supplement")
        setCycleType("trt")
        setPctStack([])
        setMainStack((prev) => prev.filter((item) => item.type === "Supplement"))
      }}
      className={`rounded-2xl py-3.5 font-medium ${
        planCategory === "supplement" ? "bg-primary text-white" : "bg-[#181818]"
      }`}
    >
      Supplement-Plan
    </button>
  </div>
</Field>
              <Field label="Cycle Name">
                <input
                  value={cycleName}
                  onChange={(e) => setCycleName(e.target.value)}
                  className="input"
                  placeholder="z. B. Sommer Aufbau"
                />
              </Field>

{planCategory === "cycle" && (
  <Field label="Cycle Typ">
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => setCycleType("normal")}
        className={`py-4 rounded-2xl font-medium ${
          cycleType === "normal" ? "bg-primary text-white" : "bg-[#181818]"
        }`}
      >
        Normal
      </button>

      <button
        type="button"
        onClick={() => setCycleType("trt")}
        className={`py-4 rounded-2xl font-medium ${
          cycleType === "trt" ? "bg-primary text-white" : "bg-[#181818]"
        }`}
      >
        TRT / dauerhaft
      </button>
    </div>
  </Field>
)}

              {planCategory === "cycle" && cycleType === "normal" && (
                <Field label="Dauer in Wochen">
                  <input
                    type="number"
                    min="1"
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(Number(e.target.value))}
                    className="input"
                  />
                </Field>
              )}

              {cycleType === "trt" && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-sm text-blue-300">
                  Dieser Cycle läuft unbegrenzt weiter und hat kein festes Enddatum.
                </div>
              )}

              <Field label="Beschreibung optional">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="input resize-none"
                  placeholder="Ziel, Notizen, Besonderheiten..."
                />
              </Field>
            </Card>

            <Card title="Cycle Stack" subtitle="Haupt-Substanzen.">
              <button onClick={() => setShowCompoundModal(true)} className="w-full bg-primary py-4 rounded-2xl font-medium mb-4">
                Substanzen auswählen
              </button>

              <StackEditor
                items={mainStack}
                onOpen={(c: any) => openDosingModal(c, "main")}
                onRemove={(id: string) => setMainStack((prev) => prev.filter((c) => c.id !== id))}
                emptyText="Noch keine Substanzen"
                renderLine={renderLine}
              />
            </Card>

{planCategory === "cycle" && (
  <Card title="PCT Stack" subtitle="Optionaler Plan nach dem Cycle.">
    <button onClick={() => setShowPCTModal(true)} className="w-full bg-primary py-4 rounded-2xl font-medium mb-4">
      PCT Substanzen auswählen
    </button>

    <StackEditor
      items={pctStack}
      onOpen={(c: any) => openDosingModal(c, "pct")}
      onRemove={(id: string) => setPctStack((prev) => prev.filter((c) => c.id !== id))}
      emptyText="Noch keine PCT Substanzen"
      renderLine={renderLine}
      pct
    />
  </Card>
)}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCycleModal(false)} className="flex-1 py-4 bg-[#111111] rounded-2xl">
                Abbrechen
              </button>

<button
  onClick={saveCycle}
  disabled={savingCycle}
  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 font-semibold active:scale-[0.98] ${
    savingCycle
      ? "bg-white/10 text-white/40"
      : "bg-primary text-white"
  }`}
>
  {savingCycle && <Loader2 className="h-5 w-5 animate-spin" />}
  {savingCycle
    ? editingCycle
      ? "Speichert..."
      : "Erstellt..."
    : editingCycle
      ? "Speichern"
      : "Erstellen"}
</button>
            </div>
          </div>
        </Modal>
      )}

      {showCompoundModal && (
        <SelectCompoundModal
          title="Substanzen auswählen"
          compounds={availableMainCompounds}
          onSelect={addToMainStack}
          onClose={() => setShowCompoundModal(false)}
          isOral={isOral}
        />
      )}

      {showPCTModal && (
        <SelectCompoundModal
          title="PCT Substanzen auswählen"
          compounds={availablePCTCompounds}
          onSelect={addToPCTStack}
          onClose={() => setShowPCTModal(false)}
          isOral={isOral}
        />
      )}

      {showDosingModal && selectedCompoundForDosing && (
        <Modal title={selectedCompoundForDosing.name} onClose={() => setShowDosingModal(false)} high>
          <div className="space-y-6">
            <Card title="Zeitraum" subtitle="In welchen Wochen diese Substanz geplant ist.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Start Woche">
                  <input
                    type="number"
                    min="1"
                    value={selectedCompoundForDosing.startWeek}
                    onChange={(e) => updateDosing("startWeek", Number(e.target.value))}
                    className="input"
                  />
                </Field>

                <Field label={cycleType === "trt" ? "End Woche / dauerhaft" : "End Woche"}>
                  <input
                    type="number"
                    min="1"
                    value={selectedCompoundForDosing.endWeek}
                    onChange={(e) => updateDosing("endWeek", Number(e.target.value))}
                    className="input"
                  />
                </Field>
              </div>
            </Card>

            <Card title="Dosierung" subtitle="Menge pro Einnahme oder Anwendung.">
              <Field label="Dose Amount">
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={selectedCompoundForDosing.doseAmount}
                    onChange={(e) => updateDosing("doseAmount", Number(e.target.value))}
                    className="input flex-1"
                  />
<select
  value={getBaseUnit(selectedCompoundForDosing.doseUnit || "mg")}
  onChange={(e) => updateDosing("doseUnit", e.target.value)}
  className="rounded-2xl border border-white/5 bg-[#181818] px-4 text-sm text-white outline-none"
>
  <option value="mg">mg</option>
  <option value="g">g</option>
  <option value="mcg">mcg</option>
  <option value="ml">ml</option>
</select>
                </div>
              </Field>
            </Card>

            <Card title="Frequenz" subtitle="Wie oft die Substanz eingeplant wird.">
              <Field label="Rhythmus">
                <select
                  value={selectedCompoundForDosing.frequency}
                  onChange={(e) => updateDosing("frequency", e.target.value)}
                  className="input"
                >
                  <option value="Daily">Daily - Jeden Tag</option>
                  <option value="Twice Daily">Twice Daily - Zweimal am Tag</option>
                  <option value="EOD">EOD - Jeden 2. Tag</option>
                  <option value="E3D">E3D - Jeden 3. Tag</option>
                  <option value="Weekly">Weekly - Wöchentlich</option>
                  <option value="Custom">Custom Days</option>
                  <option value="Injection Days">Injection Days - An Injektionstagen</option>
                  <option value="Training Days">Training Days - An Trainingstagen</option>
                </select>
              </Field>

              {selectedCompoundForDosing.frequency === "Custom" && (
                <div>
                  <label className="block text-sm font-medium mb-3">Tage auswählen</label>
                  <div className="grid grid-cols-4 gap-2">
                    {daysShort.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleCustomDay(day)}
                        className={`py-3 rounded-2xl text-sm font-medium transition-all ${
                          (selectedCompoundForDosing.customDays || []).includes(day)
                            ? "bg-primary text-white"
                            : "bg-[#181818]"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>

<button
  onClick={saveDosingConfig}
  className="w-full rounded-2xl bg-primary py-4 font-semibold"
>
  Dosierung speichern
</button>
          </div>
        </Modal>
      )}

      <style jsx global>{`
        .input {
          width: 100%;
          background: #181818;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 1rem;
          padding: 1rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .input:focus {
          border-color: hsl(var(--primary));
        }
      `}</style>
    </div>
  )
}

function Modal({ title, children, onClose, high, compact }: any) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 px-4 pb-4 backdrop-blur-md sm:items-center sm:p-6">
      <div
        className={`w-full overflow-y-auto rounded-[32px] border border-white/10 bg-gradient-to-b from-[#111111] to-[#070707] px-5 py-6 sm:p-7 shadow-2xl backdrop-blur-2xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          compact ? "max-w-xl" : "max-w-[920px]"
        } ${
          high ? "max-h-[92vh]" : "max-h-[86vh]"
        }`}
      >
        <div className="w-14 h-1.5 rounded-full bg-white/10 mx-auto mb-5" />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-black tracking-tight">{title}</h2>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}

function Card({ title, subtitle, children }: any) {
  return (
    <div className="space-y-5 rounded-[26px] border border-transparent bg-transparent p-0 sm:rounded-[30px] sm:border-white/5 sm:bg-white/[0.035] sm:p-7 sm:shadow-xl sm:backdrop-blur-xl">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {children}
    </div>
  )
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      {children}
    </div>
  )
}

function StackEditor({ items, onOpen, onRemove, emptyText, renderLine, pct }: any) {
  if (!items.length) {
    return (
      <div className="rounded-[24px] border border-white/5 bg-white/[0.03] backdrop-blur-md p-6 text-center text-muted-foreground">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((comp: any) => (
        <div key={comp.id} onClick={() => onOpen(comp)} className={`rounded-[24px] border p-4 flex justify-between gap-3 cursor-pointer transition-all duration-300 active:scale-[0.985] backdrop-blur-xl shadow-xl ${
  pct
    ? "border-purple-500/10 bg-gradient-to-br from-purple-500/[0.06] to-[#101010]"
    : "border-emerald-500/10 bg-gradient-to-br from-emerald-500/[0.06] to-[#101010]"
}`}>
          <div>
            <p className="font-semibold">
              {comp.name} {pct && <span className="text-purple-400">(PCT)</span>}
            </p>
            <p className="text-sm text-muted-foreground">{renderLine(comp)}</p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove(comp.id)
            }}
            className="text-red-400 shrink-0"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      ))}
    </div>
  )
}

function SelectCompoundModal({ title, compounds, onSelect, onClose, isOral }: any) {
  return (
    <Modal title={title} onClose={onClose} compact>
      <div className="grid max-h-[58vh] gap-3 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {compounds.length === 0 ? (
          <div className="rounded-[24px] border border-white/5 bg-white/[0.03] backdrop-blur-md p-6 text-center text-muted-foreground">
            Keine Substanzen vorhanden
          </div>
        ) : (
          compounds.map((comp: any) => (
            <button
              key={comp.id}
              onClick={() => onSelect(comp)}
              className="w-full rounded-[24px] border border-white/5 bg-white/[0.04] p-5 text-left transition hover:bg-white/[0.07] active:scale-[0.99]"
            >
              <p className="font-medium">{comp.name}</p>
              <p className="text-sm text-muted-foreground">
                {isOral(comp)
                  ? `${comp.dose_per_pill || 0} ${comp.pill_unit || "mg/pill"} • ${comp.remaining_pills || 0} ${getOralUnitLabel(comp, comp.remaining_pills || 0)} übrig`
                  : `${comp.concentration || 0} ${comp.concentration_unit || "mg/ml"} • ${comp.packaging || ""}`}
              </p>
            </button>
          ))
        )}
      </div>

      <button
  onClick={onClose}
  className="mt-4 w-full rounded-[22px] border border-white/8 bg-white/[0.05] py-4 font-semibold transition hover:bg-white/[0.08]"
>
        Fertig
      </button>
    </Modal>
  )
}

function CycleStackMini({ title, items, renderLine, pct }: any) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>

      {!items.length ? (
        <p className="text-xs text-muted-foreground">Keine Einträge</p>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => (
            <div key={item.id} className={`rounded-2xl border p-3 backdrop-blur-md ${
  pct
    ? "border-purple-500/10 bg-purple-500/[0.05]"
    : "border-white/5 bg-white/[0.03]"
}`}>
              <p className="font-medium text-sm">
                {item.name} {pct && <span className="text-purple-400">(PCT)</span>}
              </p>
              <p className="text-xs text-muted-foreground">{renderLine(item)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}