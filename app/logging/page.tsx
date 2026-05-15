"use client"

import { useEffect, useState } from "react"
import { Syringe, Plus, Trash2, Clock, CalendarDays, CheckCircle } from "lucide-react"
import { WeekCalendar } from "@/components/week-calendar"
import { BottomNav } from "@/components/bottom-nav"
import { supabase } from "@/lib/supabase"

interface Dose {
  id: string
  compound_id?: string | null
  name: string
  menge: number
  methode?: string | null
  stelle?: string | null
  notes?: string | null
  datum: string
  zeit?: string | null
}

const ORAL_TYPES = ["Oral", "AI (Aromatase Inhibitor)", "SARM", "PCT", "Supplement"]
const DAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]

const todayKey = () => dateKeyLocal(new Date())

const dateKeyLocal = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export default function LoggingPage() {
  const [doses, setDoses] = useState<Dose[]>([])
  const [compounds, setCompounds] = useState<any[]>([])
  const [activeCycle, setActiveCycle] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [selectedDate, setSelectedDate] = useState(todayKey())

  const [filter, setFilter] = useState<"all" | "oral" | "injection">("all")

  const [showLogModal, setShowLogModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedDose, setSelectedDose] = useState<Dose | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [lastInjectionSite, setLastInjectionSite] = useState("Rechte Schulter")

  const [form, setForm] = useState({
    compound_id: "",
    menge: "",
    methode: "Oral",
    stelle: "",
    notes: "",
    datum: "",
    uhrzeit: "",
  })

  const isOral = (c: any) => ORAL_TYPES.includes(c?.type)

  const loadData = async () => {
    setLoading(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      window.location.href = "/login"
      return
    }

    const { data: comps } = await supabase
      .from("compounds")
      .select("*")
      .eq("user_id", session.user.id)
      .order("name")

    const { data: doseData } = await supabase
      .from("doses")
      .select("*")
      .eq("user_id", session.user.id)
      .order("datum", { ascending: false })
      .order("zeit", { ascending: false })

    const { data: cycleData } = await supabase
      .from("cycles")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("active", true)
      .maybeSingle()

    setCompounds(comps || [])
    setDoses(doseData || [])
    setActiveCycle(cycleData || null)
    setLoading(false)
  }

  useEffect(() => {
    loadData()

    const saved = localStorage.getItem("lastInjectionSite")
    if (saved) setLastInjectionSite(saved)
  }, [])

  const getDueForDate = (dateKey: string) => {
    if (!activeCycle) return []

    const stack = [...(activeCycle.main_stack || []), ...(activeCycle.pct_stack || [])]
    const date = new Date(dateKey)
    const dayShort = DAYS[date.getDay()]

    return stack.filter((item) => {
      if (!activeCycle.start_date) return false

      const startWeek = item.startWeek || 1
      const endWeek = item.endWeek || activeCycle.duration_weeks || 12

      const start = new Date(activeCycle.start_date)
      const diffDays = Math.floor((date.getTime() - start.getTime()) / 86400000)

      if (diffDays < 0) return false

      const currentWeek = Math.floor(diffDays / 7) + 1
      if (currentWeek < startWeek || currentWeek > endWeek) return false

      if (item.frequency === "Daily" || item.frequency === "Twice Daily") return true
      if (item.frequency === "Custom") return (item.customDays || []).includes(dayShort)
      if (item.frequency === "EOD") return diffDays % 2 === 0
      if (item.frequency === "E3D") return diffDays % 3 === 0
      if (item.frequency === "Weekly") return diffDays % 7 === 0

      return false
    })
  }

  const getWeekMarkedDates = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset)

    return Array.from({ length: 7 })
      .map((_, i) => {
        const date = new Date(monday)
        date.setDate(monday.getDate() + i)
        return dateKeyLocal(date)
      })
      .filter((dateKey) => getDueForDate(dateKey).length > 0)
  }

  const selectedDue = getDueForDate(selectedDate)

  const isPlannedDone = (item: any, dateKey: string) => {
    return doses.some(
      (dose) =>
        dose.compound_id === item.id &&
        dose.datum === dateKey
    )
  }

  const openNewLog = () => {
    setIsEditing(false)
    setEditingId(null)
    setSelectedDose(null)
    setForm({
      compound_id: "",
      menge: "",
      methode: "Oral",
      stelle: "",
      notes: "",
      datum: selectedDate,
      uhrzeit: new Date().toTimeString().slice(0, 5),
    })
    setShowLogModal(true)
  }

  const openFromPlanned = (planned: any) => {
    const comp = compounds.find((c) => c.id === planned.id)
    const injectable = comp?.type === "Injectable" || planned.method === "IM" || planned.method === "SubQ"
    const nextSite = lastInjectionSite === "Rechte Schulter" ? "Linke Schulter" : "Rechte Schulter"

    setIsEditing(false)
    setEditingId(null)
    setSelectedDose(null)
    setForm({
      compound_id: planned.id,
      menge: String(planned.doseAmount || ""),
      methode: planned.method || (injectable ? "IM" : "Oral"),
      stelle: injectable ? nextSite : "",
      notes: "Aus Cycle-Plan geloggt",
      datum: selectedDate,
      uhrzeit: new Date().toTimeString().slice(0, 5),
    })
    setShowLogModal(true)
  }

  const openEdit = (dose: Dose) => {
    setIsEditing(true)
    setEditingId(dose.id)
    setSelectedDose(dose)

    setForm({
      compound_id: dose.compound_id || "",
      menge: String(dose.menge || ""),
      methode: dose.methode || "Oral",
      stelle: dose.methode === "Oral" ? "" : (dose.stelle || "Rechte Schulter"),
      notes: dose.notes || "",
      datum: dose.datum,
      uhrzeit: dose.zeit || "",
    })

    setShowLogModal(true)
  }

  const handleCompoundChange = (compoundId: string) => {
    const comp = compounds.find((c) => c.id === compoundId)
    if (!comp) return

    const injectable = comp.type === "Injectable"
    const nextSite = lastInjectionSite === "Rechte Schulter" ? "Linke Schulter" : "Rechte Schulter"

    setForm((prev) => ({
      ...prev,
      compound_id: compoundId,
      methode: injectable ? comp.method || "IM" : "Oral",
      stelle: injectable ? nextSite : "",
    }))
  }

  const selectedCompound = compounds.find((c) => c.id === form.compound_id)
  const mengeNum = Number(form.menge) || 0

  const dosePerPill = selectedCompound && isOral(selectedCompound)
    ? selectedCompound.dose_per_pill || null
    : null

  const pillsUsed = dosePerPill && mengeNum > 0
    ? Math.ceil(mengeNum / dosePerPill)
    : 0

  const mlBerechnet =
    selectedCompound?.type === "Injectable" && selectedCompound.concentration && mengeNum > 0
      ? (mengeNum / selectedCompound.concentration).toFixed(2)
      : null

  const getPillsUsed = (compound: any, amountMg: number) => {
    if (!compound || !isOral(compound)) return 0

    const perPill = compound.dose_per_pill || 0
    if (!perPill) return 0

    return Math.ceil(amountMg / perPill)
  }

  const adjustOralStock = async (
    compoundId: string | null | undefined,
    pillDelta: number
  ) => {
    if (!compoundId || pillDelta === 0) return

    const { data: comp, error: fetchError } = await supabase
      .from("compounds")
      .select("id, type, remaining_pills")
      .eq("id", compoundId)
      .single()

    if (fetchError) throw fetchError
    if (!comp || !isOral(comp)) return

    const current = comp.remaining_pills ?? 0
    const next = Math.max(0, current - pillDelta)

    const { error } = await supabase
      .from("compounds")
      .update({ remaining_pills: next })
      .eq("id", compoundId)

    if (error) throw error
  }

  const handleLogDose = async () => {
    if (!form.compound_id && !isEditing) {
      alert("Bitte Substanz auswählen!")
      return
    }

    if (!form.menge || !form.datum || !form.uhrzeit) {
      alert("Bitte Menge, Datum und Uhrzeit ausfüllen!")
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      alert("Nicht eingeloggt")
      return
    }

    const compound = compounds.find((c) => c.id === form.compound_id)

    const payload: any = {
      user_id: session.user.id,
      compound_id: form.compound_id || selectedDose?.compound_id || null,
      name: isEditing ? selectedDose?.name : compound?.name || "Unbekannt",
      menge: mengeNum,
      methode: form.methode,
      stelle: form.methode === "Oral" ? null : (form.stelle || null),
      notes: form.notes || null,
      datum: form.datum,
      zeit: form.uhrzeit,
    }

    try {
      if (isEditing && editingId && selectedDose) {
        const oldCompound = compounds.find((c) => c.id === selectedDose.compound_id)
        const newCompound = compounds.find((c) => c.id === payload.compound_id)

        const oldPills = getPillsUsed(oldCompound, selectedDose.menge)
        const newPills = getPillsUsed(newCompound, mengeNum)

        if (selectedDose.compound_id === payload.compound_id) {
          await adjustOralStock(payload.compound_id, newPills - oldPills)
        } else {
          await adjustOralStock(selectedDose.compound_id, -oldPills)
          await adjustOralStock(payload.compound_id, newPills)
        }

        const { error } = await supabase
          .from("doses")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", session.user.id)

        if (error) throw error
      } else {
        const newCompound = compounds.find((c) => c.id === form.compound_id)
        const newPills = getPillsUsed(newCompound, mengeNum)

        await adjustOralStock(form.compound_id, newPills)

        const { error } = await supabase
          .from("doses")
          .insert(payload)

        if (error) throw error
      }

      if (form.methode !== "Oral" && form.stelle) {
        localStorage.setItem("lastInjectionSite", form.stelle)
        setLastInjectionSite(form.stelle)
      }

      alert(isEditing ? "✅ Änderungen gespeichert!" : "✅ Dosis eingetragen!")
      setShowLogModal(false)
      setIsEditing(false)
      setEditingId(null)
      setSelectedDose(null)
      await loadData()
    } catch (error: any) {
      alert("Fehler: " + error.message)
      console.error(error)
    }
  }

  const requestDelete = (dose: Dose) => {
    setSelectedDose(dose)
    setShowDeleteConfirm(true)
  }

  const deleteDose = async () => {
    if (!selectedDose) return

    try {
      const oldCompound = compounds.find((c) => c.id === selectedDose.compound_id)
      const oldPills = getPillsUsed(oldCompound, selectedDose.menge)

      await adjustOralStock(selectedDose.compound_id, -oldPills)

      const { error } = await supabase
        .from("doses")
        .delete()
        .eq("id", selectedDose.id)

      if (error) throw error

      setShowDeleteConfirm(false)
      setSelectedDose(null)
      await loadData()
    } catch (error: any) {
      alert("Fehler beim Löschen: " + error.message)
    }
  }

  const selectedDateLabel = new Date(selectedDate).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  })

const getDoseType = (dose: Dose) => {
  if (dose.methode === "Oral") return "oral"
  return "injection"
}

const filteredDoses = doses.filter((dose) => {
  const type = getDoseType(dose)
  if (filter === "oral") return type === "oral"
  if (filter === "injection") return type === "injection"
  return true
})

const getDateLabel = (dateKey: string) => {
  const today = todayKey()

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = dateKeyLocal(yesterday)

  if (dateKey === today) return "Heute"
  if (dateKey === yesterdayKey) return "Gestern"

  return new Date(dateKey).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  })
}

const groupedDoses = filteredDoses.reduce<Record<string, Dose[]>>((acc, dose) => {
  const key = dose.datum
  if (!acc[key]) acc[key] = []
  acc[key].push(dose)
  return acc
}, {})

  return (
    <div className="min-h-screen bg-[#050505] pb-24">
      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-lg border-b border-border/20 px-5 py-4">
        <h1 className="text-2xl font-bold">Logging</h1>
      </header>

      <div className="px-5 pt-4">
        <WeekCalendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          markedDates={getWeekMarkedDates()}
        />

        <div className="mt-6 mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            {selectedDateLabel} anstehend
          </h2>

          {selectedDue.length === 0 ? (
            <div className="bg-[#0A0A0A] rounded-3xl p-8 text-center border border-border/30">
              <p className="text-muted-foreground">
                {activeCycle ? "An diesem Tag ist nichts geplant." : "Noch kein aktiver Cycle"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDue.map((item) => {
                const done = isPlannedDone(item, selectedDate)

                return (
                  <button
                    key={item.id}
                    onClick={() => !done && openFromPlanned(item)}
                    disabled={done}
                    className={`w-full text-left rounded-3xl p-5 border transition ${
                      done
                        ? "bg-emerald-500/10 border-emerald-500/30 opacity-80"
                        : "bg-[#0A0A0A] border-primary/20"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.doseAmount} {item.doseUnit} • {item.frequency}
                        </p>
                      </div>

                      {done && (
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Erledigt
                        </span>
                      )}
                    </div>

                    <p className={`text-xs mt-2 ${done ? "text-emerald-400" : "text-primary"}`}>
                      {done ? "Bereits geloggt" : "Zum Loggen antippen"}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Zuletzt geloggt
          </h2>

          <button
            onClick={openNewLog}
            className="bg-primary px-6 py-3 rounded-2xl font-semibold flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Eintragen
          </button>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
  {[
    { key: "all", label: "Alle" },
    { key: "oral", label: "Oral" },
    { key: "injection", label: "Injektionen" },
  ].map((item) => (
    <button
      key={item.key}
      onClick={() => setFilter(item.key as "all" | "oral" | "injection")}
      className={`px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap ${
        filter === item.key
          ? "bg-primary text-white"
          : "bg-[#0A0A0A] text-muted-foreground border border-border/30"
      }`}
    >
      {item.label}
    </button>
  ))}
</div>

{loading ? (
  <p className="text-center py-12 text-muted-foreground">
    Lade Logs...
  </p>
) : filteredDoses.length === 0 ? (
  <div className="bg-[#0A0A0A] rounded-3xl p-12 text-center">
    <p className="text-muted-foreground">
      Keine Einträge für diesen Filter
    </p>
  </div>
) : (
  <div className="space-y-8 pb-20">
    {Object.entries(groupedDoses).map(([dateKey, entries]) => (
      <div key={dateKey}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 rounded-full bg-primary" />

          <h3 className="text-sm font-semibold text-muted-foreground">
            {getDateLabel(dateKey)}
          </h3>

          <div className="h-px flex-1 bg-border/30" />
        </div>

        <div className="space-y-3">
          {entries.map((dose) => {
            const oral = dose.methode === "Oral"

            return (
              <div
                key={dose.id}
                className="bg-[#0A0A0A] rounded-3xl p-5 border border-border/30 relative"
              >
                <div
                  onClick={() => openEdit(dose)}
                  className="cursor-pointer pr-12"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-xs px-3 py-1 rounded-full ${
                            oral
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {oral ? "Oral" : dose.methode || "Injection"}
                        </span>

                        {dose.stelle && (
                          <span className="text-xs px-3 py-1 rounded-full bg-[#111111] text-muted-foreground">
                            {dose.stelle}
                          </span>
                        )}
                      </div>

                      <p className="font-semibold text-lg">
                        {dose.name}
                      </p>

                      <p className="text-2xl font-medium mt-1">
                        {dose.menge} mg
                      </p>

                      {dose.notes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          „{dose.notes}“
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground text-right">
                      {dose.zeit || "--:--"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    requestDelete(dose)
                  }}
                  className="absolute top-5 right-5 p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    ))}
  </div>
)}
      </div>

      <BottomNav />

      {showLogModal && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-end">
          <div className="bg-[#0A0A0A] w-full rounded-t-3xl p-6 max-h-[92vh] overflow-auto">
            <h2 className="text-2xl font-semibold mb-6">
              {isEditing ? "Dosis bearbeiten" : "Neue Dosis eintragen"}
            </h2>

            <div className="space-y-6">
              {!isEditing && (
                <Field label="Substanz">
                  <select value={form.compound_id} onChange={(e) => handleCompoundChange(e.target.value)} className="input">
                    <option value="">Substanz auswählen...</option>
                    {compounds.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {(selectedCompound || isEditing) && (
                <>
                  <Field label="Menge in mg">
                    <input
                      type="number"
                      value={form.menge}
                      onChange={(e) => setForm({ ...form, menge: e.target.value })}
                      className="input text-lg"
                      placeholder="z. B. 250"
                    />

                    {dosePerPill && (
                      <p className="text-blue-400 text-sm mt-2">
                        1 Pille = {dosePerPill} mg • Verbrauch: ca. {pillsUsed} Pillen
                      </p>
                    )}

                    {mlBerechnet && (
                      <p className="text-emerald-400 text-sm mt-2">
                        = {mlBerechnet} ml bei {selectedCompound?.concentration} mg/ml
                      </p>
                    )}
                  </Field>

                  <Field label="Methode">
                    <div className="bg-[#111111] rounded-2xl p-4 font-medium">
                      {form.methode === "Oral" ? "Oral" : form.methode}
                    </div>
                  </Field>

                  {(form.methode === "IM" || form.methode === "SubQ") && (
                    <Field label="Injektionsstelle">
                      <p className="text-xs text-emerald-400 mb-2">
                        Zuletzt benutzt: {lastInjectionSite}
                      </p>
                      <select value={form.stelle} onChange={(e) => setForm({ ...form, stelle: e.target.value })} className="input">
                        <option value="Rechte Schulter">Rechte Schulter</option>
                        <option value="Linke Schulter">Linke Schulter</option>
                      </select>
                    </Field>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Datum">
                      <input type="date" value={form.datum} onChange={(e) => setForm({ ...form, datum: e.target.value })} className="input" />
                    </Field>

                    <Field label="Uhrzeit">
                      <input type="time" value={form.uhrzeit} onChange={(e) => setForm({ ...form, uhrzeit: e.target.value })} className="input" />
                    </Field>
                  </div>

                  <Field label="Notizen optional">
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="input h-24 resize-none"
                      placeholder="z. B. vor dem Training..."
                    />
                  </Field>
                </>
              )}

              <button onClick={handleLogDose} disabled={!form.menge} className="w-full bg-primary py-5 rounded-2xl font-semibold text-lg disabled:opacity-50">
                {isEditing ? "Änderungen speichern" : "Dosis eintragen"}
              </button>

              <button onClick={() => setShowLogModal(false)} className="w-full py-4 text-red-500 font-medium">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && selectedDose && (
        <div className="fixed inset-0 bg-black/90 z-[80] flex items-center justify-center px-5">
          <div className="bg-[#0A0A0A] rounded-3xl p-8 w-full max-w-sm text-center">
            <Trash2 className="w-14 h-14 text-red-500 mx-auto mb-5" />
            <h3 className="text-xl font-semibold mb-2">Eintrag löschen?</h3>
            <p className="text-muted-foreground mb-8">
              {selectedDose.name} — {selectedDose.menge} mg
            </p>

            <div className="flex gap-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 bg-[#111111] rounded-2xl">
                Abbrechen
              </button>

              <button onClick={deleteDose} className="flex-1 py-4 bg-red-600 rounded-2xl">
                Ja, löschen
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input {
          width: 100%;
          background: #111111;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 1rem;
          padding: 1rem;
          outline: none;
        }

        .input:focus {
          border-color: hsl(var(--primary));
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm text-muted-foreground block mb-2">{label}</label>
      {children}
    </div>
  )
}



