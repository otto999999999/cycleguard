"use client"

import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { BrowserMultiFormatReader } from "@zxing/browser"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flame,
  Leaf,
  Pencil,
  Plus,
  Settings,
  X,
  Trash2,
  Utensils,
  Wheat,
  Beef,
  Egg,
} from "lucide-react"

const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

const dateKeyLocal = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

const mealTypeLabel = (type: string) => {
  if (type === "breakfast") return "Frühstück"
  if (type === "lunch") return "Mittagessen"
  if (type === "dinner") return "Abendessen"
  if (type === "meal") return "Mahlzeit"
  return "Snack"
}

const parseNumber = (value: string) => {
  return Number(String(value || "0").replace(",", "."))
}

type Macro = {
  label: string
  value: number
  goal: number
  unit: string
  icon: any
  color: string
}

export default function NutritionPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [weekOffset, setWeekOffset] = useState(0)

const [userId, setUserId] = useState("")
const [goals, setGoals] = useState<any>(null)
const [logs, setLogs] = useState<any[]>([])
const [waterLogs, setWaterLogs] = useState<any[]>([])
const [loading, setLoading] = useState(true)
const videoRef = useRef<HTMLVideoElement | null>(null)
const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)
const scannerControlsRef = useRef<any>(null)

const [scanning, setScanning] = useState(false)
const [scannerMessage, setScannerMessage] = useState("")
const [scannedProduct, setScannedProduct] = useState<any>(null)
const [servingGrams, setServingGrams] = useState("100")
const [showAddMeal, setShowAddMeal] = useState(false)
const [saving, setSaving] = useState(false)
const [showSettings, setShowSettings] = useState(false)
const [showCustomWater, setShowCustomWater] = useState(false)
const [customWaterAmount, setCustomWaterAmount] = useState("")

const [settingsForm, setSettingsForm] = useState({
  calories: "2300",
  protein: "210",
  fat: "70",
  carbs: "300",
  fiber: "30",
  water_liters: "3",
  water_reminders_enabled: false,
  water_reminder_interval_hours: "2",
})
const [mealAddMode, setMealAddMode] = useState<"barcode" | "manual">("manual")
const [mealForm, setMealForm] = useState({
  name: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
})


const calorieGoal = Number(goals?.calories || 2300)
const proteinGoal = Number(goals?.protein || 210)
const fatGoal = Number(goals?.fat || 70)
const carbsGoal = Number(goals?.carbs || 300)
const fiberGoal = Number(goals?.fiber || 30)
const waterGoal = Number(goals?.water_liters || 3)

const caloriesEaten = logs.reduce((sum, log) => sum + Number(log.calories || 0), 0)
const proteinToday = logs.reduce((sum, log) => sum + Number(log.protein || 0), 0)
const fatToday = logs.reduce((sum, log) => sum + Number(log.fat || 0), 0)
const carbsToday = logs.reduce((sum, log) => sum + Number(log.carbs || 0), 0)
const fiberToday = logs.reduce((sum, log) => sum + Number(log.fiber || 0), 0)

const water = waterLogs.reduce((sum, log) => sum + Number(log.amount_liters || 0), 0)

const caloriesLeft = Math.max(0, calorieGoal - caloriesEaten)
const streak = 0

const macros: Macro[] = [
  {
    label: "Protein",
    value: proteinToday,
    goal: proteinGoal,
    unit: "g",
    icon: Beef,
    color: "text-orange-300",
  },
  {
    label: "Fett",
    value: fatToday,
    goal: fatGoal,
    unit: "g",
    icon: Egg,
    color: "text-yellow-300",
  },
  {
    label: "Carbs",
    value: carbsToday,
    goal: carbsGoal,
    unit: "g",
    icon: Wheat,
    color: "text-sky-300",
  },
  {
    label: "Ballaststoffe",
    value: fiberToday,
    goal: fiberGoal,
    unit: "g",
    icon: Leaf,
    color: "text-purple-300",
  },
]
const totalMacroPercent =
  macros.length > 0
    ? Math.round(
        macros.reduce((sum, macro) => {
          const percent =
            macro.goal > 0
              ? Math.min(100, (Number(macro.value || 0) / Number(macro.goal || 1)) * 100)
              : 0

          return sum + percent
        }, 0) / macros.length
      )
    : 0
  const weekDates = useMemo(() => {
    const today = new Date()
    const dayIndex = (today.getDay() + 6) % 7

    const monday = new Date(today)
    monday.setHours(0, 0, 0, 0)
    monday.setDate(today.getDate() - dayIndex + weekOffset * 7)

    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)
      return date
    })
  }, [weekOffset])

  const weekTitle = useMemo(() => {
    const start = weekDates[0]
    const end = weekDates[6]

    return `${start.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "short",
    })} – ${end.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "short",
    })}`
  }, [weekDates])

  const isSameDay = (a: Date, b: Date) => {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    )
  }

  const calorieProgress =
    calorieGoal > 0 ? Math.min(100, Math.round((caloriesEaten / calorieGoal) * 100)) : 0

  const waterProgress =
    waterGoal > 0 ? Math.min(100, Math.round((water / waterGoal) * 100)) : 0

const selectedDateKey = dateKeyLocal(selectedDate)

const loadNutritionData = async () => {
  try {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = "/login"
      return
    }

    setUserId(user.id)

    let { data: goalData } = await supabase
      .from("nutrition_goals")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!goalData) {
      const { data: createdGoal, error: createGoalError } = await supabase
        .from("nutrition_goals")
        .insert({
          user_id: user.id,
          calories: 2300,
          protein: 210,
          fat: 70,
          carbs: 300,
          fiber: 30,
          water_liters: 3,
        })
        .select("*")
        .single()

      if (createGoalError) throw createGoalError

      goalData = createdGoal
    }

    setGoals(goalData)

    const { data: logsData, error: logsError } = await supabase
      .from("nutrition_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("log_date", selectedDateKey)
      .order("created_at", { ascending: true })

    if (logsError) throw logsError

    setLogs(logsData || [])

    const { data: waterData, error: waterError } = await supabase
      .from("nutrition_water_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("log_date", selectedDateKey)
      .order("created_at", { ascending: true })

    if (waterError) throw waterError

    setWaterLogs(waterData || [])
  } catch (error: any) {
    alert(error.message || "Ernährung konnte nicht geladen werden.")
  } finally {
    setLoading(false)
  }
}

useEffect(() => {
  loadNutritionData()
}, [selectedDateKey])

const addMeal = async () => {
  if (!userId) return

  const name = mealForm.name.trim()

  if (!name) {
    alert("Name fehlt.")
    return
  }

  try {
    setSaving(true)

    const { error } = await supabase.from("nutrition_logs").insert({
      user_id: userId,
      log_date: selectedDateKey,
      meal_type: "meal",
      name,
      amount: 1,
      unit: "portion",
      calories: parseNumber(mealForm.calories),
      protein: parseNumber(mealForm.protein),
      carbs: parseNumber(mealForm.carbs),
      fat: parseNumber(mealForm.fat),
      fiber: 0,
    })

    if (error) throw error

    setMealForm({
      name: "",
      calories: "",
      protein: "",
      carbs: "",
      fat: "",
    })
setScannedProduct(null)
setServingGrams("100")
setScannerMessage("")
    setShowAddMeal(false)
    await loadNutritionData()
  } catch (error: any) {
    alert(error.message || "Mahlzeit konnte nicht gespeichert werden.")
  } finally {
    setSaving(false)
  }
}


const deleteMeal = async (id: string) => {
  if (!confirm("Mahlzeit löschen?")) return

  const { error } = await supabase
    .from("nutrition_logs")
    .delete()
    .eq("id", id)

  if (error) {
    alert(error.message)
    return
  }

  await loadNutritionData()
}

const addWater = async (amount: number) => {
  if (!userId) return

  const { error } = await supabase.from("nutrition_water_logs").insert({
    user_id: userId,
    log_date: selectedDateKey,
    amount_liters: amount,
  })

  if (error) {
    alert(error.message)
    return
  }

  await loadNutritionData()
}

const deleteLastWater = async () => {
  if (waterLogs.length === 0) return

  const lastWaterLog = [...waterLogs].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0]

  if (!lastWaterLog) return

  const { error } = await supabase
    .from("nutrition_water_logs")
    .delete()
    .eq("id", lastWaterLog.id)

  if (error) {
    alert(error.message)
    return
  }

  await loadNutritionData()
}

const addCustomWater = async () => {
  const amount = parseNumber(customWaterAmount)

  if (!amount || amount <= 0) {
    alert("Wassermenge fehlt.")
    return
  }

  await addWater(amount)

  setCustomWaterAmount("")
  setShowCustomWater(false)
}

const openSettings = () => {
  setSettingsForm({
  calories: String(goals?.calories || 2300),
  protein: String(goals?.protein || 210),
  fat: String(goals?.fat || 70),
  carbs: String(goals?.carbs || 300),
  fiber: String(goals?.fiber || 30),
  water_liters: String(goals?.water_liters || 3),
  water_reminders_enabled: Boolean(goals?.water_reminders_enabled),
  water_reminder_interval_hours: String(
    goals?.water_reminder_interval_hours || 2
  ),
})

  setShowSettings(true)
}

const saveSettings = async () => {
  if (!userId) return

  try {
    setSaving(true)

const payload = {
  user_id: userId,
  calories: parseNumber(settingsForm.calories),
  protein: parseNumber(settingsForm.protein),
  fat: parseNumber(settingsForm.fat),
  carbs: parseNumber(settingsForm.carbs),
  fiber: parseNumber(settingsForm.fiber),
  water_liters: parseNumber(settingsForm.water_liters),
  water_reminders_enabled: settingsForm.water_reminders_enabled,
  water_reminder_interval_hours: parseNumber(
    settingsForm.water_reminder_interval_hours
  ),
  updated_at: new Date().toISOString(),
}

    const { data, error } = await supabase
      .from("nutrition_goals")
      .upsert(payload, {
        onConflict: "user_id",
      })
      .select("*")
      .single()

    if (error) throw error

    setGoals(data)
    setShowSettings(false)
  } catch (error: any) {
    alert(error.message || "Ziele konnten nicht gespeichert werden.")
  } finally {
    setSaving(false)
  }
}

const applyProductWithGrams = (product: any, gramsValue: string) => {
  const grams = parseNumber(gramsValue || "100")
  const factor = grams > 0 ? grams / 100 : 1
  const nutriments = product?.nutriments || {}

  const kcal100 = Number(nutriments["energy-kcal_100g"] || 0)
  const protein100 = Number(nutriments.proteins_100g || 0)
  const carbs100 = Number(nutriments.carbohydrates_100g || 0)
  const fat100 = Number(nutriments.fat_100g || 0)

  const name =
    product.product_name_de ||
    product.product_name ||
    product.generic_name ||
    "Gescanntes Produkt"

  setMealForm({
    name,
    calories: String(Math.round(kcal100 * factor)),
    protein: String(Number((protein100 * factor).toFixed(1))),
    carbs: String(Number((carbs100 * factor).toFixed(1))),
    fat: String(Number((fat100 * factor).toFixed(1))),
  })
}

const loadProductFromBarcode = async (barcode: string) => {
  try {
    setScannerMessage("Produkt wird gesucht...")

    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,product_name_de,generic_name,nutriments,brands,image_front_url`
    )

    const data = await res.json()

    if (!data?.product) {
      setScannerMessage("Produkt nicht gefunden. Bitte manuell eintragen.")
      return
    }

    setScannedProduct(data.product)
    applyProductWithGrams(data.product, servingGrams)
    setMealAddMode("manual")
    setScannerMessage("Produkt gefunden. Gramm prüfen und speichern.")
  } catch (error: any) {
    setScannerMessage("Produkt konnte nicht geladen werden.")
  }
}



const stopScanner = () => {
  try {
    scannerControlsRef.current?.stop()
  } catch {}

  scannerControlsRef.current = null
  setScanning(false)
}


const startBarcodeScanner = async () => {
  setScannerMessage("")
  setScannedProduct(null)

  if (!videoRef.current) {
    setScannerMessage("Video konnte nicht gestartet werden.")
    return
  }

  try {
    setScanning(true)
    setScannerMessage("Kamera wird geöffnet...")

    const codeReader = new BrowserMultiFormatReader()
    codeReaderRef.current = codeReader

    const controls = await codeReader.decodeFromVideoDevice(
      undefined,
      videoRef.current,
      async (result) => {
        if (!result) return

        const barcode = result.getText()

        stopScanner()
        setScannerMessage(`Barcode erkannt: ${barcode}`)

        await loadProductFromBarcode(barcode)
      }
    )

    scannerControlsRef.current = controls
    setScannerMessage("Barcode vor die Kamera halten...")
  } catch (error: any) {
    setScanning(false)
    setScannerMessage("Kamera konnte nicht geöffnet werden. Prüfe Browser-Rechte.")
  }
}

useEffect(() => {
  return () => {
    stopScanner()
  }
}, [])


  return (
    <div className="min-h-screen bg-[#050505] pb-28 text-white">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-90px] top-[-120px] h-[340px] w-[340px] rounded-full bg-orange-400/10 blur-3xl" />
        <div className="absolute right-[-120px] top-[260px] h-[300px] w-[300px] rounded-full bg-yellow-400/10 blur-3xl" />
      </div>

      <header
  className={`sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-2xl ${
    showSettings ? "hidden" : ""
  }`}
>
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="text-center">
            <h1 className="text-xl font-black tracking-tight">Ernährung</h1>
            <p className="text-xs text-muted-foreground">Tagesübersicht</p>
          </div>

<button
  type="button"
  onClick={openSettings}
  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-400/10 text-orange-300 active:scale-95"
>
  <Settings className="h-5 w-5" />
</button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pt-6">
        {loading && (
  <div className="mb-5 rounded-[24px] border border-orange-400/15 bg-orange-400/10 p-4 text-center text-sm font-black text-orange-300">
    Ernährung wird geladen...
  </div>
)}
        <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-white/70 active:scale-95"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="text-center">
              <p className="text-sm font-black text-white">Woche</p>
              <p className="text-xs text-muted-foreground">{weekTitle}</p>
            </div>

            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-white/70 active:scale-95"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date, index) => {
              const active = isSameDay(date, selectedDate)

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={`rounded-[20px] border py-3 text-center transition active:scale-95 ${
                    active
                      ? "border-orange-400/40 bg-orange-400/15 text-orange-300 shadow-[0_0_24px_rgba(251,146,60,0.18)]"
                      : "border-white/10 bg-black/25 text-white/70"
                  }`}
                >
                  <p className="text-xs font-black">{weekDays[index]}</p>
                  <p className="mt-1 text-xl font-black">{date.getDate()}</p>
                  {active && (
                    <div className="mx-auto mt-1 h-1.5 w-1.5 rounded-full bg-orange-300" />
                  )}
                </button>
              )
            })}
          </div>
        </section>

<section className="relative mt-5 overflow-hidden rounded-[36px] border border-orange-400/20 bg-gradient-to-br from-orange-400/[0.12] via-white/[0.035] to-white/[0.015] px-6 pb-7 pt-6 shadow-2xl backdrop-blur-xl">
  <div className="absolute right-[-80px] top-[-80px] h-[190px] w-[190px] rounded-full bg-orange-400/15 blur-3xl" />

  <div className="relative flex items-start justify-between">
    <div>
      <h2 className="text-2xl font-black tracking-tight">Kalorien</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tagesziel: {calorieGoal.toLocaleString("de-DE")} kcal
      </p>
    </div>

    <div className="flex items-center gap-2 rounded-full border border-orange-400/20 bg-black/25 px-4 py-2 text-orange-300">
      <Flame className="h-5 w-5" />
      <span className="font-black">{streak}</span>
    </div>
  </div>

<div className="relative mx-auto mt-4 flex h-[190px] w-[190px] items-center justify-center">
  <svg
    className="absolute inset-0 h-[190px] w-[190px]"
    viewBox="0 0 190 190"
  >
    <circle
      cx="95"
      cy="95"
      r="74"
      fill="none"
      stroke="rgba(251,146,60,0.14)"
      strokeWidth="11"
    />

    <circle
      cx="95"
      cy="95"
      r="74"
      fill="none"
      stroke="rgb(251,146,60)"
      strokeWidth="11"
      strokeLinecap="round"
      strokeDasharray={`${2 * Math.PI * 74}`}
      strokeDashoffset={`${
        2 * Math.PI * 74 -
        (2 * Math.PI * 74 * calorieProgress) / 100
      }`}
      transform="rotate(-90 95 95)"
      className="drop-shadow-[0_0_12px_rgba(251,146,60,0.55)] transition-all duration-700 ease-out"
    />
  </svg>

  <div className="absolute h-[132px] w-[132px] rounded-full border border-orange-400/10 bg-[#070707]/95 shadow-[inset_0_0_30px_rgba(0,0,0,0.75)]" />

  <div className="relative text-center">
    <p className="text-xs font-bold text-muted-foreground">Übrig</p>

    <p className="mt-1 text-4xl font-black tracking-tight">
      {caloriesLeft.toLocaleString("de-DE")}
    </p>

    <p className="mt-1 text-xs text-muted-foreground">
      kcal übrig
    </p>

    <p className="mt-1 text-[11px] text-white/35">
      von {calorieGoal.toLocaleString("de-DE")} kcal
    </p>
  </div>
</div>
</section>

<section className="mt-5 rounded-[34px] border border-white/10 bg-gradient-to-b from-white/[0.055] to-white/[0.025] p-5 shadow-2xl backdrop-blur-xl">
  <div className="mb-5 flex items-start justify-between gap-4">
    <div>
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-xs font-black text-orange-300">
        <Utensils className="h-3.5 w-3.5" />
        Tagesmakros
      </div>

      <h2 className="text-2xl font-black tracking-tight">Makros</h2>

      <p className="mt-1 text-sm leading-5 text-muted-foreground">
        Protein, Fett, Carbs und Ballaststoffe
      </p>
    </div>

<div className="min-w-[96px] rounded-[18px] border border-orange-400/15 bg-orange-400/10 px-4 py-2 text-center shadow-[0_0_18px_rgba(251,146,60,0.08)]">
  <p className="text-xl font-black text-orange-300">{totalMacroPercent}%</p>
  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
    Gesamt
  </p>
</div>
  </div>

  <div className="space-y-3">
    {macros.map((macro) => {
        
      const Icon = macro.icon
      const percent =
        macro.goal > 0
          ? Math.min(100, Math.round((macro.value / macro.goal) * 100))
          : 0

      return (
        <div
          key={macro.label}
          className="group relative overflow-hidden rounded-[26px] border border-white/10 bg-black/25 p-4 shadow-lg transition active:scale-[0.99]"
        >
          <div className="absolute right-[-50px] top-[-60px] h-[130px] w-[130px] rounded-full bg-orange-400/[0.06] blur-3xl" />

          <div className="relative flex items-center gap-4">
<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-400/15 bg-orange-400/10 shadow-[0_0_14px_rgba(251,146,60,0.08)]">
  <Icon className={`h-4 w-4 ${macro.color}`} strokeWidth={2.4} />
</div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-black">{macro.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Ziel: {macro.goal} {macro.unit}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-black text-white">
                    {macro.value}
                    <span className="text-white/35">
                      {" "}
                      / {macro.goal}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      {macro.unit}
                    </span>
                  </p>

                  <p className="text-xs font-black text-orange-300">
                    {percent}%
                  </p>
                </div>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-orange-400 shadow-[0_0_14px_rgba(251,146,60,0.35)] transition-all duration-700"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )
    })}
  </div>
</section>

<section className="mt-5 rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-xl">
  <div className="mb-5 flex items-center justify-between">
    <div>
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-xs font-black text-orange-300">
        <Utensils className="h-3.5 w-3.5" />
        Mahlzeiten
      </div>

      <h2 className="text-2xl font-black tracking-tight">Mahlzeiten</h2>

      <p className="mt-1 text-sm text-muted-foreground">
        Gegessene Mahlzeiten für diesen Tag
      </p>
    </div>

    <div className="rounded-[18px] border border-orange-400/15 bg-orange-400/10 px-3 py-2 text-right">
      <p className="text-lg font-black text-orange-300">
        {logs.length}
      </p>
<p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
  Mahlzeiten
</p>
    </div>
  </div>

  <div className="space-y-3">
  {logs.length === 0 ? (
    <div className="rounded-[26px] border border-white/10 bg-black/25 p-6 text-center">
      <Utensils className="mx-auto mb-4 h-10 w-10 text-orange-300" />

      <p className="font-black">Noch keine Mahlzeiten hinzugefügt.</p>

      <p className="mx-auto mt-2 max-w-[300px] text-sm leading-6 text-muted-foreground">
        Füge Frühstück, Mittagessen, Abendessen oder Snacks hinzu.
      </p>
    </div>
  ) : (
    logs.map((log) => (
      <div
        key={log.id}
        className="rounded-[24px] border border-white/10 bg-black/25 p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-black">{log.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {log.amount} {log.unit} · {mealTypeLabel(log.meal_type)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => deleteMeal(log.id)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-red-400/20 bg-red-500/10 text-red-300 active:scale-95"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
            <p className="font-black text-orange-300">{log.calories}</p>
            <p className="text-muted-foreground">kcal</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
            <p className="font-black">{log.protein}g</p>
            <p className="text-muted-foreground">Protein</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
            <p className="font-black">{log.carbs}g</p>
            <p className="text-muted-foreground">Carbs</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
            <p className="font-black">{log.fat}g</p>
            <p className="text-muted-foreground">Fett</p>
          </div>
        </div>
      </div>
    ))
  )}

  <button
    type="button"
    onClick={() => {
  setMealAddMode("manual")
  setScannerMessage("")
  setScannedProduct(null)
  setServingGrams("100")
  setShowAddMeal(true)
}}
    className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-orange-400/30 bg-orange-400/10 py-4 font-black text-orange-300 active:scale-[0.98]"
  >
    <Plus className="h-5 w-5" />
    Mahlzeit hinzufügen
  </button>
</div>
        </section>

        <section className="mt-5 rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-xl">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-black">Wasser</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tagesziel: {waterGoal.toFixed(1)} L
              </p>
            </div>

            <p className="text-3xl font-black text-orange-300">
              {water.toFixed(1)} L
              <span className="text-lg text-muted-foreground"> / {waterGoal.toFixed(1)} L</span>
            </p>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.35)]"
              style={{ width: `${waterProgress}%` }}
            />
          </div>

<div className="mt-5 grid grid-cols-4 gap-2">
  <WaterButton label="+0.3 L" onClick={() => addWater(0.3)} />
  <WaterButton label="+0.5 L" onClick={() => addWater(0.5)} />
  <WaterButton label="+1.0 L" onClick={() => addWater(1)} />

  <button
    type="button"
    onClick={() => setShowCustomWater(true)}
    className="flex items-center justify-center gap-2 rounded-[18px] border border-orange-400/20 bg-orange-400/10 px-2 py-3 text-xs font-black text-orange-300 active:scale-95"
  >
    <Pencil className="h-4 w-4" />
    Eigen
  </button>
</div>

{waterLogs.length > 0 && (
  <button
    type="button"
    onClick={deleteLastWater}
    className="mt-3 flex w-full items-center justify-center gap-2 rounded-[18px] border border-red-400/20 bg-red-500/10 py-3 text-xs font-black text-red-300 active:scale-95"
  >
    <Trash2 className="h-4 w-4" />
    Letzten Wasser-Log löschen
  </button>
)}
        </section>
      </main>
{showAddMeal && (
  <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/80 px-4 pb-4 backdrop-blur-md sm:items-center sm:p-6">
    <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[34px] border border-white/10 bg-gradient-to-b from-[#111111] to-[#070707] p-5 pb-6 shadow-2xl shadow-black/50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-xs font-black text-orange-300">
            Mahlzeit
          </div>

          <h2 className="text-2xl font-black tracking-tight">
            Mahlzeit hinzufügen
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Werte für {selectedDate.toLocaleDateString("de-DE")} speichern.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
  stopScanner()
  setShowAddMeal(false)
}}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/60 active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 rounded-[22px] border border-white/10 bg-black/30 p-1">
        <button
          type="button"
          onClick={() => setMealAddMode("barcode")}
          className={`rounded-[18px] py-3 text-sm font-black transition ${
            mealAddMode === "barcode"
              ? "bg-orange-400 text-black shadow-[0_0_20px_rgba(251,146,60,0.20)]"
              : "text-white/45"
          }`}
        >
          Barcode Scanner
        </button>

        <button
          type="button"
          onClick={() => {
  stopScanner()
  setMealAddMode("manual")
}}
          className={`rounded-[18px] py-3 text-sm font-black transition ${
            mealAddMode === "manual"
              ? "bg-orange-400 text-black shadow-[0_0_20px_rgba(251,146,60,0.20)]"
              : "text-white/45"
          }`}
        >
          Manuell
        </button>
      </div>

{mealAddMode === "barcode" ? (
  <div className="space-y-4">
    <div className="overflow-hidden rounded-[28px] border border-orange-400/15 bg-black">
      <video
        ref={videoRef}
        className="h-[260px] w-full object-cover"
        muted
        playsInline
      />
    </div>

    <div className="rounded-[24px] border border-orange-400/15 bg-orange-400/[0.06] p-4 text-center">
      <p className="font-black">Barcode Scanner</p>

      <p className="mx-auto mt-2 max-w-[300px] text-sm leading-6 text-muted-foreground">
        Halte den Barcode vom Produkt in die Kamera. Danach kannst du die Grammzahl anpassen.
      </p>

      {scannerMessage && (
        <div className="mt-4 rounded-[18px] border border-white/10 bg-black/25 p-3 text-sm font-bold text-orange-300">
          {scannerMessage}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={startBarcodeScanner}
          disabled={scanning}
          className="flex-1 rounded-[20px] bg-orange-400 py-4 font-black text-black active:scale-[0.98] disabled:opacity-50"
        >
          {scanning ? "Scan läuft..." : "Scanner starten"}
        </button>

        {scanning && (
          <button
            type="button"
            onClick={stopScanner}
            className="rounded-[20px] border border-red-400/20 bg-red-500/10 px-4 font-black text-red-300 active:scale-[0.98]"
          >
            Stop
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
  stopScanner()
  setMealAddMode("manual")
}}
        className="mt-3 w-full rounded-[20px] border border-white/10 bg-white/[0.04] py-4 font-black text-white/70 active:scale-[0.98]"
      >
        Manuell eintragen
      </button>
    </div>
  </div>

      
) : (
  <div className="space-y-3">
    {scannedProduct && (
      <div className="rounded-[24px] border border-orange-400/15 bg-orange-400/[0.06] p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-300">
          Gescanntes Produkt
        </p>

        <p className="mt-1 font-black">
          {scannedProduct.product_name_de ||
            scannedProduct.product_name ||
            "Produkt"}
        </p>

        <div className="mt-4 flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs font-black uppercase tracking-[0.14em] text-white/35">
              Menge
            </label>

            <input
              value={servingGrams}
              onChange={(e) => {
                setServingGrams(e.target.value)
                applyProductWithGrams(scannedProduct, e.target.value)
              }}
              inputMode="decimal"
              placeholder="100"
              className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-xl font-black outline-none placeholder:text-white/20"
            />
          </div>

          <span className="pb-4 text-sm font-black text-orange-300">
            g
          </span>
        </div>
      </div>
    )}

    <input
      value={mealForm.name}
            onChange={(e) =>
              setMealForm((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Name der Mahlzeit"
            className="w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-4 text-sm font-bold outline-none placeholder:text-white/25"
          />

          <input
            value={mealForm.calories}
            onChange={(e) =>
              setMealForm((prev) => ({ ...prev, calories: e.target.value }))
            }
            placeholder="Kalorien"
            inputMode="decimal"
            className="w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-4 text-sm font-bold outline-none placeholder:text-white/25"
          />

          <div className="grid grid-cols-3 gap-3">
            <input
              value={mealForm.protein}
              onChange={(e) =>
                setMealForm((prev) => ({ ...prev, protein: e.target.value }))
              }
              placeholder="Protein"
              inputMode="decimal"
              className="w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-4 text-sm font-bold outline-none placeholder:text-white/25"
            />

            <input
              value={mealForm.carbs}
              onChange={(e) =>
                setMealForm((prev) => ({ ...prev, carbs: e.target.value }))
              }
              placeholder="Carbs"
              inputMode="decimal"
              className="w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-4 text-sm font-bold outline-none placeholder:text-white/25"
            />

            <input
              value={mealForm.fat}
              onChange={(e) =>
                setMealForm((prev) => ({ ...prev, fat: e.target.value }))
              }
              placeholder="Fett"
              inputMode="decimal"
              className="w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-4 text-sm font-bold outline-none placeholder:text-white/25"
            />
          </div>

          <button
            type="button"
            onClick={addMeal}
            disabled={saving}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-[22px] bg-orange-400 py-4 font-black text-black shadow-[0_0_24px_rgba(251,146,60,0.20)] active:scale-[0.98] disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
            Speichern
          </button>
        </div>
      )}

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-black text-white">Letzte Mahlzeiten</p>
          <p className="text-xs font-bold text-muted-foreground">
            {logs.length}
          </p>
        </div>

        {logs.length === 0 ? (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-muted-foreground">
            Noch keine Mahlzeiten an diesem Tag.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="rounded-[22px] border border-white/10 bg-white/[0.035] p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-black">{log.name}</p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      P {log.protein || 0}g · C {log.carbs || 0}g · F {log.fat || 0}g
                    </p>
                  </div>

                  <p className="shrink-0 text-lg font-black text-orange-300">
                    {log.calories || 0}
                    <span className="ml-1 text-xs text-muted-foreground">
                      kcal
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
)}
{showSettings && (
  <div className="fixed inset-0 z-[130] overflow-y-auto bg-black/80 px-4 pb-8 pt-6 backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <div className="mx-auto flex w-full max-w-md items-start justify-center">
      <div className="w-full rounded-[34px] border border-white/10 bg-gradient-to-b from-[#111111] to-[#070707] p-5 shadow-2xl shadow-black/50">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-xs font-black text-orange-300">
              <Settings className="h-3.5 w-3.5" />
              Ziele
            </div>

            <h2 className="text-2xl font-black tracking-tight">
              Ernährung einstellen
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Tagesziele für Kalorien, Makros und Wasser.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowSettings(false)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/60 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="rounded-[24px] border border-orange-400/15 bg-orange-400/[0.06] p-4">
            <label className="text-xs font-black uppercase tracking-[0.16em] text-orange-300">
              Kalorien
            </label>

            <input
              value={settingsForm.calories}
              onChange={(e) =>
                setSettingsForm((prev) => ({
                  ...prev,
                  calories: e.target.value,
                }))
              }
              inputMode="decimal"
              placeholder="2300"
              className="mt-2 w-full bg-transparent text-3xl font-black outline-none placeholder:text-white/20"
            />

            <p className="text-xs text-muted-foreground">kcal pro Tag</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <GoalInput
              label="Protein"
              value={settingsForm.protein}
              unit="g"
              onChange={(value: string) =>
                setSettingsForm((prev) => ({ ...prev, protein: value }))
              }
            />

            <GoalInput
              label="Fett"
              value={settingsForm.fat}
              unit="g"
              onChange={(value: string) =>
                setSettingsForm((prev) => ({ ...prev, fat: value }))
              }
            />

            <GoalInput
              label="Carbs"
              value={settingsForm.carbs}
              unit="g"
              onChange={(value: string) =>
                setSettingsForm((prev) => ({ ...prev, carbs: value }))
              }
            />

            <GoalInput
              label="Ballaststoffe"
              value={settingsForm.fiber}
              unit="g"
              onChange={(value: string) =>
                setSettingsForm((prev) => ({ ...prev, fiber: value }))
              }
            />
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
            <label className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
              Wasserziel
            </label>

            <div className="mt-2 flex items-end gap-2">
              <input
                value={settingsForm.water_liters}
                onChange={(e) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    water_liters: e.target.value,
                  }))
                }
                inputMode="decimal"
                placeholder="3"
                className="w-full bg-transparent text-3xl font-black outline-none placeholder:text-white/20"
              />

              <span className="pb-1 text-sm font-black text-orange-300">
                Liter
              </span>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                  Wasser-Erinnerungen
                </p>

                <p className="mt-1 max-w-[240px] text-sm leading-5 text-muted-foreground">
                  Erinnert dich per Push, solange dein Tagesziel noch nicht erreicht ist.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    water_reminders_enabled: !prev.water_reminders_enabled,
                  }))
                }
                className={`relative flex h-9 w-[62px] shrink-0 items-center rounded-full border p-1 transition ${
                  settingsForm.water_reminders_enabled
                    ? "border-orange-400/40 bg-orange-400/90 shadow-[0_0_18px_rgba(251,146,60,0.25)]"
                    : "border-white/10 bg-white/10"
                }`}
                aria-pressed={settingsForm.water_reminders_enabled}
              >
                <span
                  className={`h-7 w-7 rounded-full shadow-lg transition-transform duration-200 ${
                    settingsForm.water_reminders_enabled
                      ? "translate-x-[26px] bg-black"
                      : "translate-x-0 bg-white/80"
                  }`}
                />
              </button>
            </div>

            {settingsForm.water_reminders_enabled && (
              <div className="mt-4 rounded-[20px] border border-orange-400/15 bg-orange-400/[0.06] p-4">
                <label className="text-xs font-black uppercase tracking-[0.14em] text-orange-300">
                  Intervall
                </label>

                <div className="mt-2 flex items-end gap-2">
                  <input
                    value={settingsForm.water_reminder_interval_hours}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        water_reminder_interval_hours: e.target.value,
                      }))
                    }
                    inputMode="decimal"
                    placeholder="2"
                    className="w-full bg-transparent text-2xl font-black outline-none placeholder:text-white/20"
                  />

                  <span className="pb-1 text-xs font-black text-orange-300">
                    Stunden
                  </span>
                </div>

                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Beispiel: Bei {settingsForm.water_reminder_interval_hours || "2"} bekommst du ungefähr alle{" "}
                  {settingsForm.water_reminder_interval_hours || "2"} Stunden eine Erinnerung.
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-[22px] bg-orange-400 py-4 font-black text-black shadow-[0_0_24px_rgba(251,146,60,0.20)] active:scale-[0.98] disabled:opacity-50"
        >
          <Settings className="h-5 w-5" />
          Ziele speichern
        </button>
      </div>
    </div>
  </div>
)}  

{showCustomWater && (
  <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/80 px-4 pb-4 backdrop-blur-md sm:items-center sm:p-6">
    <div className="w-full max-w-md rounded-[34px] border border-white/10 bg-gradient-to-b from-[#111111] to-[#070707] p-5 shadow-2xl shadow-black/50">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-xs font-black text-orange-300">
            <Droplets className="h-3.5 w-3.5" />
            Wasser
          </div>

          <h2 className="text-2xl font-black tracking-tight">
            Eigene Menge
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Trage eine eigene Wassermenge in Litern ein.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCustomWater(false)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/60 active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="rounded-[24px] border border-orange-400/15 bg-orange-400/[0.06] p-4">
        <label className="text-xs font-black uppercase tracking-[0.16em] text-orange-300">
          Liter
        </label>

        <div className="mt-2 flex items-end gap-2">
          <input
            value={customWaterAmount}
            onChange={(e) => setCustomWaterAmount(e.target.value)}
            inputMode="decimal"
            placeholder="z.B. 0.75"
            className="w-full bg-transparent text-4xl font-black outline-none placeholder:text-white/20"
          />

          <span className="pb-1 text-sm font-black text-orange-300">
            L
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {["0.2", "0.75", "1.5"].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setCustomWaterAmount(value)}
            className="rounded-[18px] border border-white/10 bg-white/[0.04] py-3 text-sm font-black text-white/70 active:scale-95"
          >
            {value} L
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={addCustomWater}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-[22px] bg-orange-400 py-4 font-black text-black shadow-[0_0_24px_rgba(251,146,60,0.20)] active:scale-[0.98]"
      >
        <Plus className="h-5 w-5" />
        Wasser speichern
      </button>
    </div>
  </div>
)}
    </div>
  )
}

function GoalInput({ label, value, unit, onChange }: any) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
      <label className="text-xs font-black uppercase tracking-[0.14em] text-white/35">
        {label}
      </label>

      <div className="mt-2 flex items-end gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          className="w-full bg-transparent text-2xl font-black outline-none placeholder:text-white/20"
        />

        <span className="pb-1 text-xs font-black text-orange-300">
          {unit}
        </span>
      </div>
    </div>
  )
}

function WaterButton({ label, onClick }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-[18px] border border-orange-400/20 bg-orange-400/10 px-2 py-3 text-xs font-black text-orange-300 active:scale-95"
    >
      <Droplets className="h-4 w-4" />
      {label}
    </button>
  )
}
