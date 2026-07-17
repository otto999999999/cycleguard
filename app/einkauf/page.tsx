"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Calendar, Edit, Pill, Plus, Syringe, X } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"
import { supabase } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import { PlusCircle } from "lucide-react"
import CountUp from "react-countup"
import PullToRefresh from "react-simple-pull-to-refresh"
import { Search } from "lucide-react"
import { toast } from "sonner"
const ORAL_TYPES = ["Oral", "Medication", "AI (Aromatase Inhibitor)", "SARM", "PCT", "Supplement"]

export default function EinkaufPage() {
  const [compounds, setCompounds] = useState<any[]>([])
  const [activeCycle, setActiveCycle] = useState<any>(null)
  const [activeSupplementPlan, setActiveSupplementPlan] = useState<any>(null)
  const [trainingDays, setTrainingDays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [scrolled, setScrolled] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [showStockSelect, setShowStockSelect] = useState(false)
  const [showStockEdit, setShowStockEdit] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [editForm, setEditForm] = useState({
    current_vials: 0,
    current_ampoules: 0,
    current_bottles: 0,
    remaining_pills: 0,
    remaining_ml: 0,
  })

  const isOral = (c: any) => ORAL_TYPES.includes(c.type)
const haptic = () => {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(12)
  }
}
  const loadCompounds = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setCompounds([])
      setLoading(false)
      return
    }

const { data, error } = await supabase
  .from("compounds")
  .select("*")
  .eq("user_id", session.user.id)
  .order("name")

const { data: cycleData, error: cycleError } = await supabase
  .from("cycles")
  .select("*")
  .eq("user_id", session.user.id)
  .eq("active", true)
  .eq("plan_category", "cycle")
  .maybeSingle()
const { data: supplementPlanData, error: supplementPlanError } = await supabase
  .from("cycles")
  .select("*")
  .eq("user_id", session.user.id)
  .eq("active", true)
  .eq("plan_category", "supplement")
  .maybeSingle()
if (cycleError) {
  haptic()
  toast.error(
    "Fehler beim Laden des aktiven Cycles: " +
      cycleError.message
  )
  setActiveCycle(null)
} else {
  setActiveCycle(cycleData || null)
  setActiveSupplementPlan(supplementPlanData || null)
}

if (error) {
  haptic()
  toast.error("Fehler beim Laden: " + error.message)
}
const { data: trainingDaysData } = await supabase
  .from("training_days")
  .select("id, name, weekdays")
  .eq("user_id", session.user.id)
setCompounds(data || [])
setTrainingDays(trainingDaysData || [])
setLoading(false)
  }

  useEffect(() => {
    loadCompounds()
  }, [])
useEffect(() => {
  const onScroll = () => {
    setScrolled(window.scrollY > 24)
  }

  window.addEventListener("scroll", onScroll)

  return () => window.removeEventListener("scroll", onScroll)
}, [])
  const getTotalPills = (c: any) => (c.pills_per_bottle || 0) * (c.current_bottles || 0)

  const getPercentage = (c: any) => {
    const total = getTotalPills(c)
    if (!total) return 0
    return Math.min(100, Math.round(((c.remaining_pills || 0) / total) * 100))
  }

  const getQuantity = (c: any) => {
    if (isOral(c)) return c.current_bottles || 0
    if (c.packaging === "Vial") return c.current_vials || 0
    return c.current_ampoules || 0
  }

  const getUnit = (c: any, qty: number) => {
    if (isOral(c)) return qty === 1 ? "Flasche" : "Flaschen"
    if (c.packaging === "Vial") return qty === 1 ? "Vial" : "Vials"
    return qty === 1 ? "Ampulle" : "Ampullen"
  }
  const formatSchedule = (item: any) => {
  if (item.frequency === "Custom" && item.customDays?.length) {
    return item.customDays.join(", ")
  }

  if (item.frequency === "Daily") return "täglich"
  if (item.frequency === "Twice Daily") return "2x täglich"
  if (item.frequency === "EOD") return "jeden 2. Tag"
  if (item.frequency === "E3D") return "jeden 3. Tag"
  if (item.frequency === "Weekly") return "wöchentlich"
  if (item.frequency === "Injection Days") return "an Injektionstagen"
  if (item.frequency === "Training Days") return "an Trainingstagen"
  return item.frequency || "—"
}
const getInjectionDaysPerWeek = () => {
  const stack = [
    ...(activeCycle?.main_stack || []),
    ...(activeCycle?.pct_stack || []),
  ]

  const injectionDays = new Set<string>()

  stack.forEach((item: any) => {
    const compound = compounds.find((c) => c.id === item.id)

    if (!compound) return
    if (isOral(compound)) return

    if (item.frequency === "Daily") {
      ;["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].forEach((day) =>
        injectionDays.add(day)
      )
      return
    }

    if (item.frequency === "Custom") {
      ;(item.customDays || []).forEach((day: string) => injectionDays.add(day))
      return
    }

    if (item.frequency === "EOD") {
      injectionDays.add("EOD")
      return
    }

    if (item.frequency === "E3D") {
      injectionDays.add("E3D")
      return
    }

    if (item.frequency === "Weekly") {
      injectionDays.add("Weekly")
    }
  })

  if (injectionDays.has("EOD")) return 3.5
  if (injectionDays.has("E3D")) return 7 / 3
  if (injectionDays.has("Weekly")) return Math.max(1, injectionDays.size)

  return injectionDays.size
}

const getTrainingDaysPerWeek = () => {
  const days = new Set<string>()

  trainingDays.forEach((day) => {
    ;(day.weekdays || []).forEach((weekday: string) => days.add(weekday))
  })

  return days.size
}

const getWeeklyUsageFromItem = (item: any) => {
  const dose = Number(item.doseAmount || 0)
  if (!dose) return 0

  if (item.frequency === "Daily") return dose * 7
  if (item.frequency === "Twice Daily") return dose * 14
  if (item.frequency === "EOD") return dose * 3.5
  if (item.frequency === "E3D") return dose * (7 / 3)
  if (item.frequency === "Weekly") return dose

  if (item.frequency === "Injection Days") {
    return dose * getInjectionDaysPerWeek()
  }

if (item.frequency === "Training Days") {
  return dose * getTrainingDaysPerWeek()
}

  if (item.frequency === "Custom") {
    const days = item.customDays?.length || 0
    return dose * days
  }

  return 0
}

const getPlannedWeeklyUsage = (compoundId: string) => {
  const stack = [
    ...(activeCycle?.main_stack || []),
    ...(activeCycle?.pct_stack || []),
    ...(activeSupplementPlan?.main_stack || []),
    ...(activeSupplementPlan?.pct_stack || []),
  ]

  const matchingItems = stack.filter((item: any) => item.id === compoundId)

  if (matchingItems.length === 0) return null

  const weeklyUsage = matchingItems.reduce(
    (sum: number, item: any) => sum + getWeeklyUsageFromItem(item),
    0
  )

  return weeklyUsage || null
}

const getEstimatedDaysLeft = (c: any) => {
  const plannedWeekly = getPlannedWeeklyUsage(c.id)

  if (!plannedWeekly) return null

  const dailyUsage = plannedWeekly / 7

  if (!dailyUsage) return null

if (isOral(c)) {
  const remainingPills = Number(c.remaining_pills || 0)
  const dosePerPill = Number(c.dose_per_pill || 0)

  if (!dosePerPill) return null

  const pillsPerDay = dailyUsage / dosePerPill

  if (!pillsPerDay) return null

  return Math.floor(remainingPills / pillsPerDay)
}

  

  if (!c.concentration || !c.size_ml) return null

const remainingMg =
  c.remaining_ml && c.concentration
    ? c.remaining_ml * c.concentration
    : null

if (remainingMg === null) return null

return Math.floor(remainingMg / dailyUsage)
}
  const breakdown = compounds.map((c) => {
    const quantity = getQuantity(c)
    return {
      name: c.name,
      quantity,
      unit: getUnit(c, quantity),
      totalValue: quantity * (c.price || 0),
    }
  })

const totalValue = breakdown.reduce((sum, item) => sum + item.totalValue, 0)

  const stats = compounds.reduce(
    (acc, c) => {
      const qty = getQuantity(c)

      acc.gesamtwert += qty * (c.price || 0)
      if (c.type === "Injectable") acc.injectables++
      if (isOral(c)) acc.orals += c.remaining_pills || 0

const daysLeft = getEstimatedDaysLeft(c)

const low =
  daysLeft !== null
    ? daysLeft <= 14
    : isOral(c)
      ? (c.remaining_pills || 0) < 20
      : qty < 1

      if (low) acc.lowStock++
      return acc
    },
    { gesamtwert: 0, injectables: 0, orals: 0, lowStock: 0 }
  )

const getActiveCycleStack = () => {
  if (!activeCycle) return []

  return [
    ...(activeCycle.main_stack || []),
    ...(activeCycle.pct_stack || []),
  ]
}

const getActiveCycleCompounds = () => {
  const stack = getActiveCycleStack()

  return compounds.filter((compound) =>
    stack.some((item: any) => item.id === compound.id)
  )
}

const getActiveCycleMonthlyCost = () => {
  if (!activeCycle) return 0

  const stack = getActiveCycleStack()

  return stack.reduce((sum, item: any) => {
    const compound = compounds.find((c) => c.id === item.id)

    if (!compound) return sum

    const weeklyUsage = getPlannedWeeklyUsage(compound.id)
    const price = Number(compound.price || 0)

    if (!weeklyUsage || !price) return sum

    const monthlyUsage = weeklyUsage * 4.345

    if (isOral(compound)) {
      const pillsPerBottle = Number(compound.pills_per_bottle || 0)
      const dosePerPill = Number(compound.dose_per_pill || 0)

      if (!pillsPerBottle || !dosePerPill) return sum

      const mgPerBottle = pillsPerBottle * dosePerPill
      const costPerMg = price / mgPerBottle

      return sum + monthlyUsage * costPerMg
    }

    const concentration = Number(compound.concentration || 0)
    const sizeMl = Number(compound.size_ml || 0)

    if (!concentration || !sizeMl) return sum

    const mgPerUnit = concentration * sizeMl
    const costPerMg = price / mgPerUnit

    return sum + monthlyUsage * costPerMg
  }, 0)
}

const getActiveCycleMinDaysLeft = () => {
  const days = getActiveCycleCompounds()
    .map((compound) => getEstimatedDaysLeft(compound))
    .filter((value): value is number => value !== null)

  if (days.length === 0) return null

  return Math.min(...days)
}

const getActiveCycleStockStatus = () => {
  const days = getActiveCycleCompounds()
    .map((compound) => getEstimatedDaysLeft(compound))
    .filter((value): value is number => value !== null)

  if (days.length === 0) {
    return {
      label: "—",
      sublabel: "nicht berechenbar",
      color: "text-muted-foreground",
    }
  }

  const minDays = Math.min(...days)

  if (minDays <= 0) {
    return {
      label: "Leer",
      sublabel: "mindestens 1 Substanz",
      color: "text-red-400",
    }
  }

  if (minDays <= 7) {
    return {
      label: `${minDays}T`,
      sublabel: "kritisch knapp",
      color: "text-red-400",
    }
  }

  if (minDays <= 14) {
    return {
      label: `${minDays}T`,
      sublabel: "bald knapp",
      color: "text-orange-400",
    }
  }

  return {
    label: `${minDays}T`,
    sublabel: "Bestand reicht",
    color: "text-emerald-400",
  }
}

const lowStockItems = compounds.filter((c) => {
  const daysLeft = getEstimatedDaysLeft(c)

  if (daysLeft !== null) {
    return daysLeft <= 14
  }

  return isOral(c)
    ? (c.remaining_pills || 0) < 20
    : getQuantity(c) < 1
})


  const selectCompoundForEdit = (c: any) => {
    setSelected(c)
    setEditForm({
      current_vials: c.current_vials || 0,
      current_ampoules: c.current_ampoules || 0,
      current_bottles: c.current_bottles || 0,
      remaining_pills: c.remaining_pills || c.pills_per_bottle || 0,
remaining_ml: c.remaining_ml || 0,
    })
    setShowStockSelect(false)
    setShowStockEdit(true)
  }

  const saveStockEdit = async () => {
    if (!selected) return

    const updateData = isOral(selected)
      ? {
          current_bottles: editForm.current_bottles,
          remaining_pills: editForm.remaining_pills,
        }
      : selected.packaging === "Vial"
        ? { current_vials: editForm.current_vials, remaining_ml: editForm.remaining_ml }
        : { current_ampoules: editForm.current_ampoules, remaining_ml: editForm.remaining_ml }

    const { error } = await supabase
      .from("compounds")
      .update(updateData)
      .eq("id", selected.id)

if (error) {
  haptic()
  toast.error("Fehler: " + error.message)
  return
}

haptic()
toast.success("Bestand aktualisiert")
    setShowStockEdit(false)
    setSelected(null)
    loadCompounds()
  }

  return (
    <div className="min-h-screen bg-[#050505] pb-32 text-foreground">
      <div className="fixed inset-0 -z-10 overflow-hidden">
  <div className="absolute top-[-120px] left-[-80px] w-[320px] h-[320px] bg-emerald-500/10 rounded-full blur-3xl" />

  <div className="absolute top-[120px] right-[-100px] w-[260px] h-[260px] bg-purple-500/10 rounded-full blur-3xl" />

  <div className="absolute bottom-[-120px] left-[20%] w-[280px] h-[280px] bg-blue-500/10 rounded-full blur-3xl" />
</div>
      <header
  className={`sticky top-0 z-50 px-5 py-4 transition-all duration-300 ${
    scrolled
      ? "bg-black/80 backdrop-blur-2xl border-b border-white/10"
      : "bg-transparent"
  }`}
>
        <h1 className="text-2xl font-bold tracking-tight">Einkauf</h1>
      </header>
<div className="sticky top-[73px] z-40 px-5 pt-3">
  <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/5 px-4 py-3 flex items-center justify-between text-xs">
    <div>
      <p className="text-muted-foreground">Compounds</p>
      <p className="font-semibold">{compounds.length}</p>
    </div>

    <div>
      <p className="text-muted-foreground">Low Stock</p>
      <p className="font-semibold text-orange-400">
        {lowStockItems.length}
      </p>
    </div>

    <div>
      <p className="text-muted-foreground">Injectables</p>
      <p className="font-semibold text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]">
        {stats.injectables}
      </p>
    </div>

    <div>
      <p className="text-muted-foreground">Pillen</p>
      <p className="font-semibold text-blue-400">
        {stats.orals}
      </p>
    </div>
  </div>
</div>
      <div className="px-5 pt-6 grid grid-cols-2 gap-3">
        <StatCard title="Gesamtwert" value={`€${Math.round(stats.gesamtwert)}`} icon="💰" wide onClick={() => setShowBreakdown(true)} />
        <StatCard title="Injectables" value={stats.injectables} icon={<Syringe className="w-5 h-5 text-green-400" />} />
        <StatCard title="Pillen" value={stats.orals} icon={<Pill className="w-5 h-5 text-blue-400" />} />
        <StatCard title="Low Stock" value={stats.lowStock} icon={<AlertTriangle className="w-5 h-5 text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.45)]" />} wide orange />
      </div>
<PullToRefresh
  onRefresh={async () => {
    haptic()
    await loadCompounds()
  }}
  pullingContent={
    <div className="text-center py-2 text-xs text-muted-foreground">
      Nach unten ziehen...
    </div>
  }
  refreshingContent={
    <div className="text-center py-2 text-xs text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]">
      Aktualisiere Bestand...
    </div>
  }
>
      <section className="px-5 mt-8">
        <div className="rounded-3xl p-6 bg-white/[0.03] border border-white/5 backdrop-blur-md shadow-xl shadow-black/10">
          <h3 className="font-semibold mb-4">Aktueller Bestand</h3>
<div className="mb-5 relative">
  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />

  <input
    type="text"
    placeholder="Substanz suchen..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="w-full bg-white/[0.04] border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none focus:border-emerald-400/30 focus:shadow-[0_0_20px_rgba(52,211,153,0.12)] transition-all"
  />
</div>
          {loading ? (
            <div className="space-y-4 animate-pulse">
  {[...Array(4)].map((_, i) => (
    <div
      key={i}
      className="rounded-3xl p-5 bg-white/[0.03] border border-white/5 backdrop-blur-md shadow-2xl shadow-black/20"
    >
      <div className="flex justify-between">
        <div className="space-y-3">
          <div className="h-4 w-32 bg-white/10 rounded-full" />
          <div className="h-3 w-20 bg-white/5 rounded-full" />
        </div>

        <div className="space-y-3 flex flex-col items-end">
          <div className="h-4 w-16 bg-white/10 rounded-full" />
          <div className="h-3 w-12 bg-white/5 rounded-full" />
        </div>
      </div>

      <div className="mt-5 h-2.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full w-1/2 bg-white/10 rounded-full" />
      </div>
    </div>
  ))}
</div>
          ) : compounds.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">Noch keine Substanzen</p>
          ) : (
<div className="space-y-4">
              {compounds
  .filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )
  .map((c) => {
                const oral = isOral(c)
                const qty = getQuantity(c)
                const daysLeft = getEstimatedDaysLeft(c)
                const remainingMg =
  !isOral(c) &&
  c.remaining_ml &&
  c.concentration
    ? Math.round(c.remaining_ml * c.concentration)
    : null
                let percentage = 0

if (oral) {
  percentage = getPercentage(c)
} else if (c.remaining_ml && c.size_ml) {
  const maxMl =
    (c.current_vials || c.current_ampoules || 0) * c.size_ml

  percentage = maxMl
    ? Math.min(100, Math.round((c.remaining_ml / maxMl) * 100))
    : 0
} else {
  percentage = qty > 0 ? 100 : 0
}
                const totalPills = getTotalPills(c)
                const plannedWeekly = getPlannedWeeklyUsage(c.id)
                const cycleItem = activeCycle
  ? [
      ...(activeCycle.main_stack || []),
      ...(activeCycle.pct_stack || []),
    ].find((x) => x.id === c.id)
  : null

const doseAmount = Number(cycleItem?.doseAmount || 0)
                const dosesLeft =
  !oral &&
  remainingMg !== null &&
  doseAmount > 0
    ? Math.floor(remainingMg / doseAmount)
    : null

                
                return (
<motion.div
  key={c.id}
  exit={{
    opacity: 0,
    y: -10,
  }}
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}

  transition={{
    duration: 0.25,
  }}
  className="rounded-3xl p-5 bg-white/[0.03] border border-white/5 backdrop-blur-md shadow-2xl shadow-black/20"
>
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.type}</p>
                        <p className="mt-1 text-xs text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]">
  {plannedWeekly
    ? `Geplant: ${Math.round(plannedWeekly)}mg/Woche`
    : "Kein Wochenverbrauch geplant"}
</p>
<p
  className={`mt-1 text-xs ${
    daysLeft === null
      ? "text-muted-foreground"
      : daysLeft <= 7
        ? "text-red-400"
        : daysLeft <= 14
          ? "text-orange-400"
          : "text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]"
  }`}
>
  {daysLeft === null
    ? "Reichweite: nicht berechenbar"
    : `Reicht ca. ${daysLeft} Tage`}
</p>
{dosesLeft !== null && (
  <p className="mt-1 text-xs text-blue-400">
    Noch ca. {dosesLeft} Dosen möglich
  </p>
)}            

                        {oral && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {c.pills_per_bottle || 0} Pillen pro Flasche
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        {oral 
                        ? (
                          <><p className="font-semibold">{c.remaining_pills || 0} Pillen</p>
                            <p className="text-xs text-muted-foreground">{c.current_bottles || 0} Flaschen</p>
                          </>
) : (
  <>
    <p className="font-semibold">
      {remainingMg !== null
        ? <><CountUp end={remainingMg || 0} duration={0.6} />mg</>
        : `${qty} ${c.packaging}`}
    </p>

    {remainingMg !== null && (
      <p className="text-xs text-muted-foreground">
        {Number(c.remaining_ml || 0).toFixed(2)}ml übrig
      </p>
    )}
  </>
)}
                      </div>
                    </div>

                    {(
                      <div className="mt-4">
                        <div className="h-2.5 rounded-full overflow-hidden bg-[#222]">
                          
<motion.div
  initial={{ width: 0 }}
  animate={{ width: `${percentage}%` }}
  transition={{
    duration: 0.6,
    ease: "easeOut",
  }}
  className={`h-full ${
    percentage <= 20
      ? "bg-red-500"
      : percentage <= 50
        ? "bg-orange-400"
        : "bg-gradient-to-r from-emerald-400 to-green-500"
  }`}
/>
</div>

                        <div className="flex justify-between text-xs mt-1">
                          <span className={percentage <= 20 ? "text-red-500" : percentage <= 50 ? "text-orange-400" : "text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]"}>
                            {daysLeft === null
  ? `${percentage}% verbleibend`
  : `${daysLeft} Tage Reichweite`}
                          </span>
                          <span className="text-muted-foreground">
                            <span className="text-muted-foreground">
  {oral
    ? `${c.remaining_pills || 0}/${totalPills} Pillen`
    : remainingMg !== null
      ? (
  <>
    {remainingMg}
    mg übrig • {Number(c.remaining_ml || 0).toFixed(2)}ml
  </>
)
      : `${qty} ${c.packaging}`}
</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
            
          )}
        </div>
        
      </section>

      <section className="px-5 mt-8 space-y-6">
        <Panel title="Low Stock Alerts" icon={<AlertTriangle className="w-5 h-5 text-red-500" />} red>
          {lowStockItems.length === 0 ? (
            <p className="text-muted-foreground">Alles im grünen Bereich.</p>
          ) : (
            <div className="space-y-4 text-sm">
              {lowStockItems.map((c) => (
                <div key={c.id}>
                  <p>{c.name}</p>
                  <p className="text-xs text-muted-foreground">
  {getEstimatedDaysLeft(c) !== null
    ? `Reicht noch ca. ${getEstimatedDaysLeft(c)} Tage`
    : "Bestand niedrig"}
</p>
                </div>
              ))}
            </div>
          )}
        </Panel>

<Panel title="Vorschau & Planung" icon={<Calendar className="w-5 h-5 text-purple-400" />}>
  {!activeCycle ? (
    <div className="text-center py-10 text-muted-foreground">
      Starte einen Cycle, um eine Einkaufs-Vorschau zu sehen.
    </div>
  ) : (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-purple-400/10 bg-purple-500/[0.06] p-4">
        <p className="text-xs font-medium text-purple-300">Aktiver Cycle</p>

        <p className="mt-1 text-xl font-bold">{activeCycle.name}</p>

        <p className="mt-1 text-sm text-muted-foreground">
          {activeCycle.indefinite || activeCycle.cycle_type === "trt"
            ? "TRT / dauerhaft"
            : `${activeCycle.duration_weeks || 0} Wochen`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[22px] border border-emerald-400/10 bg-emerald-500/[0.06] p-4 text-center">
          <p className={`text-2xl font-bold ${getActiveCycleStockStatus().color}`}>
            {getActiveCycleStockStatus().label}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {getActiveCycleStockStatus().sublabel}
          </p>
        </div>

        <div className="rounded-[22px] border border-blue-400/10 bg-blue-500/[0.06] p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">
            €{Math.round(getActiveCycleMonthlyCost())}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Preis / Monat
          </p>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-4">
        <p className="mb-3 text-sm font-semibold">Cycle Compounds</p>

        {(activeCycle.main_stack || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Keine Cycle Compounds geplant.
          </p>
        ) : (
          <div className="space-y-2">
            {(activeCycle.main_stack || []).map((item: any) => {
              const compound = compounds.find((c) => c.id === item.id)
              const daysLeft = compound ? getEstimatedDaysLeft(compound) : null

              return (
                <div
                  key={item.id}
                  className="flex justify-between gap-3 rounded-2xl bg-black/30 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.doseAmount} {item.doseUnit} • {formatSchedule(item)}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs font-bold text-emerald-300">
                    {daysLeft !== null ? `${daysLeft}T` : "—"}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-[24px] border border-purple-400/10 bg-purple-500/[0.04] p-4">
        <p className="mb-3 text-sm font-semibold">PCT</p>

        {(activeCycle.pct_stack || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Keine PCT geplant.
          </p>
        ) : (
          <div className="space-y-2">
            {(activeCycle.pct_stack || []).map((item: any) => {
              const compound = compounds.find((c) => c.id === item.id)
              const daysLeft = compound ? getEstimatedDaysLeft(compound) : null

              return (
                <div
                  key={item.id}
                  className="flex justify-between gap-3 rounded-2xl bg-black/30 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.doseAmount} {item.doseUnit} • {formatSchedule(item)}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs font-bold text-purple-300">
                    {daysLeft !== null ? `${daysLeft}T` : "—"}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )}
</Panel>

        <Panel title="Schnellaktionen">
          
  <div className="space-y-4">
            <Link href="/compounds" className="flex items-center gap-3 bg-[#111111] rounded-2xl p-4">
              <IconBox><Plus className="w-5 h-5" /></IconBox>
              <div className="font-medium">Neue Substanz hinzufügen</div>
            </Link>

            <button onClick={() => {
  haptic()
  setShowStockSelect(true)
}} className="w-full flex items-center gap-3 bg-[#111111] rounded-2xl p-4 text-left">
              <IconBox orange><Edit className="w-5 h-5" /></IconBox>
              <div className="font-medium">Bestand manuell anpassen</div>
            </button>
          </div>
          
        </Panel>
      </section>
<Link
  href="/logging"
  className="fixed bottom-24 right-5 z-50"
  onClick={haptic}
>
  <motion.div
    whileTap={{ scale: 0.92 }}
    whileHover={{ scale: 1.04 }}
    className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 shadow-[0_0_40px_rgba(74,222,128,0.35)] flex items-center justify-center"
  >
    <PlusCircle className="w-8 h-8 text-black" />
  </motion.div>
</Link>
</PullToRefresh>
<div className="fixed bottom-0 left-0 right-0 h-32 pointer-events-none bg-gradient-to-t from-black via-black/70 to-transparent z-40" />
      <BottomNav />

      {showStockSelect && (
        <Modal title="Substanz auswählen" onClose={() => setShowStockSelect(false)}>
          <div className="space-y-2">
            {compounds.map((c) => (
              <button key={c.id} onClick={() => selectCompoundForEdit(c)} className="w-full text-left bg-[#111111] rounded-2xl p-4">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.type}</p>

              </button>
            ))}
          </div>
        </Modal>
      )}

      {showStockEdit && selected && (
        <Modal title={selected.name} onClose={() => setShowStockEdit(false)}>
          <div className="space-y-6">
        {isOral(selected) ? (
        <>
            <NumberInput
            label="Anzahl Flaschen"
            value={editForm.current_bottles}
            onChange={(v: number) => setEditForm({ ...editForm, current_bottles: v })}
            />

            <NumberInput
            label="Verbleibende Pillen"
            value={editForm.remaining_pills}
            onChange={(v: number) => setEditForm({ ...editForm, remaining_pills: v })}
            />
        </>
        ) : selected.packaging === "Vial" ? (
        <NumberInput
            label="Anzahl Vials"
            value={editForm.current_vials}
            onChange={(v: number) => setEditForm({ ...editForm, current_vials: v })}
        />
        ) : (
        <NumberInput
            label="Anzahl Ampullen"
            value={editForm.current_ampoules}
            onChange={(v: number) => setEditForm({ ...editForm, current_ampoules: v })}
        />
        )}
{!isOral(selected) && (
  <NumberInput
    label="Verbleibende ml"
    value={editForm.remaining_ml}
    onChange={(v: number) =>
      setEditForm({ ...editForm, remaining_ml: v })
    }
  />
)}
            <div className="flex gap-3 pt-6">
              <button onClick={() => setShowStockEdit(false)} className="flex-1 py-4 bg-[#111] rounded-2xl">Abbrechen</button>
              <button onClick={saveStockEdit} className="flex-1 py-4 bg-primary rounded-2xl font-semibold">Speichern</button>
            </div>
          </div>
        </Modal>
      )}

      {showBreakdown && (
        <Modal title="Gesamtwert" onClose={() => setShowBreakdown(false)}>
          <div className="space-y-4 pb-8">
            {breakdown.map((item, i) => (
              <div key={i} className="bg-[#111111] rounded-2xl p-5 flex justify-between">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.quantity} {item.unit}</p>
                </div>
                <div className="text-right font-semibold">€{item.totalValue}</div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-6 text-center">
            <p className="opacity-75">Gesamt</p>
            <p className="text-4xl font-bold">
  €<CountUp end={Math.round(totalValue)} duration={0.8} />
</p>
          </div>
        </Modal>
      )}
    </div>
  )
}

function StatCard({ title, value, icon, wide, orange, onClick }: any) {
  return (
    <motion.div
  whileTap={{ scale: 0.97 }}
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`bg-[#0A0A0A] rounded-3xl p-5 ${wide ? "col-span-2" : ""} ${orange ? "border border-orange-500/30" : ""} ${onClick ? "cursor-pointer active:scale-[0.985]" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-500/10 rounded-2xl flex items-center justify-center text-2xl">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p
  className={`text-2xl font-bold ${
    orange ? "text-orange-400" : ""
  }`}
>
  {typeof value === "number" ? (
    <CountUp end={value} duration={0.5} />
  ) : (
    value
  )}
</p>
        </div>
      </div>
    </motion.div>
  )
}

function Panel({ title, icon, children, red }: any) {
  return (
    <div className="rounded-3xl p-6 bg-white/[0.03] border border-white/5 backdrop-blur-md shadow-xl shadow-black/10">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className={`font-semibold ${red ? "text-red-400" : ""}`}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

function IconBox({ children, orange }: any) {
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${orange ? "bg-orange-500/10" : "bg-blue-500/10"}`}>
      {children}
    </div>
  )
}



function Modal({ title, children, onClose }: any) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{
            type: "spring",
            damping: 24,
            stiffness: 240,
          }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0A0A0A] w-full rounded-t-[32px] p-6 max-h-[85vh] overflow-auto border-t border-white/10"
        >
          <div className="w-14 h-1.5 rounded-full bg-white/10 mx-auto mb-5" />

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">{title}</h2>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
function NumberInput({ label, value, onChange }: any) {
  return (
    <div>
      <label className="text-sm text-muted-foreground mb-2 block">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-[#111] rounded-2xl p-4 text-lg"
      />
      
    </div>
  )
}