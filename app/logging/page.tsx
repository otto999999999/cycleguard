"use client"

import { useEffect, useState } from "react"
import { Syringe, Plus, Trash2, Clock, CalendarDays } from "lucide-react"
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

export default function LoggingPage() {
  const [doses, setDoses] = useState<Dose[]>([])
  const [compounds, setCompounds] = useState<any[]>([])
  const [activeCycle, setActiveCycle] = useState<any>(null)
  const [dueToday, setDueToday] = useState<any[]>([])
  const todayDate = new Date().toISOString().split("T")[0]

const isPlannedDone = (item: any) => {
  return doses.some(
    (dose) =>
      dose.compound_id === item.id &&
      dose.datum === todayDate
  )
}
  const [loading, setLoading] = useState(true)

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
    stelle: "Rechte Schulter",
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

    if (cycleData) {
      const stack = [...(cycleData.main_stack || []), ...(cycleData.pct_stack || [])]
      setDueToday(stack.filter((item) => isDoseDueToday(item, cycleData)))
    } else {
      setDueToday([])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()

    const saved = localStorage.getItem("lastInjectionSite")
    if (saved) setLastInjectionSite(saved)
  }, [])

  const isDoseDueToday = (item: any, cycle: any) => {
    if (!cycle?.start_date) return false

    const todayShort = DAYS[new Date().getDay()]

    if (item.frequency === "Daily" || item.frequency === "Twice Daily") return true
    if (item.frequency === "Custom") return (item.customDays || []).includes(todayShort)

    const start = new Date(cycle.start_date)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - start.getTime()) / 86400000)

    if (item.frequency === "EOD") return diffDays % 2 === 0
    if (item.frequency === "E3D") return diffDays % 3 === 0
    if (item.frequency === "Weekly") return diffDays % 7 === 0

    return false
  }

  const setCurrentDateTime = () => {
    const now = new Date()
    setForm((prev) => ({
      ...prev,
      datum: now.toISOString().split("T")[0],
      uhrzeit: now.toTimeString().slice(0, 5),
    }))
  }

  const openNewLog = () => {
    setIsEditing(false)
    setEditingId(null)
    setSelectedDose(null)
    setForm({
      compound_id: "",
      menge: "",
      methode: "Oral",
      stelle: "Rechte Schulter",
      notes: "",
      datum: "",
      uhrzeit: "",
    })
    setShowLogModal(true)
  }

  const openFromPlanned = (planned: any) => {
    const comp = compounds.find((c) => c.id === planned.id)

    const now = new Date()
    setIsEditing(false)
    setEditingId(null)
    setSelectedDose(null)
    setForm({
      compound_id: planned.id,
      menge: String(planned.doseAmount || ""),
      methode: planned.method || (comp?.type === "Injectable" ? "IM" : "Oral"),
      stelle: planned.method === "Oral" ? "" : lastInjectionSite === "Rechte Schulter" ? "Linke Schulter" : "Rechte Schulter",
      notes: "Aus Cycle-Plan geloggt",
      datum: now.toISOString().split("T")[0],
      uhrzeit: now.toTimeString().slice(0, 5),
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
      stelle: dose.stelle || "Rechte Schulter",
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

  const updateOralStock = async (compoundId: string | null | undefined, amountMg: number, direction: "subtract" | "restore") => {
    if (!compoundId || !amountMg) return

    const comp = compounds.find((c) => c.id === compoundId)
    if (!comp || !isOral(comp)) return

    const perPill = comp.dose_per_pill || 0
    if (!perPill) return

    const pillChange = Math.ceil(amountMg / perPill)
    const current = comp.remaining_pills ?? 0

    const next =
      direction === "subtract"
        ? Math.max(0, current - pillChange)
        : current + pillChange

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
      stelle: form.stelle || null,
      notes: form.notes || null,
      datum: form.datum,
      zeit: form.uhrzeit,
    }

    try {
      if (isEditing && editingId && selectedDose) {
        await updateOralStock(selectedDose.compound_id, selectedDose.menge, "restore")
        await updateOralStock(payload.compound_id, mengeNum, "subtract")

        const { error } = await supabase
          .from("doses")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", session.user.id)

        if (error) throw error
      } else {
        await updateOralStock(form.compound_id, mengeNum, "subtract")

        const { error } = await supabase
          .from("doses")
          .insert(payload)

        if (error) throw error
      }

      if (form.stelle) {
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
      await updateOralStock(selectedDose.compound_id, selectedDose.menge, "restore")

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

  useEffect(() => {
    if (showLogModal && !isEditing && !form.datum) setCurrentDateTime()
  }, [showLogModal, isEditing])

  return (
    <div className="min-h-screen bg-[#050505] pb-24">
      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-lg border-b border-border/20 px-5 py-4">
        <h1 className="text-2xl font-bold">Logging</h1>
      </header>

      <div className="px-5 pt-4">
        <WeekCalendar />

        <div className="mt-6 mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Heute anstehend
          </h2>

          {dueToday.length === 0 ? (
            <div className="bg-[#0A0A0A] rounded-3xl p-8 text-center border border-border/30">
              <p className="text-muted-foreground">
                {activeCycle ? "Heute nichts geplant." : "Noch kein aktiver Cycle"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
                {dueToday.map((item) => {
                  const done = isPlannedDone(item)

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
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full">
                            Erledigt
                          </span>
                        )}
                      </div>

                      <p className={`text-xs mt-2 ${done ? "text-emerald-400" : "text-primary"}`}>
                        {done ? "Heute bereits geloggt" : "Zum Loggen antippen"}
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

        {loading ? (
          <p className="text-center py-12 text-muted-foreground">Lade Logs...</p>
        ) : doses.length === 0 ? (
          <div className="bg-[#0A0A0A] rounded-3xl p-12 text-center">
            <p className="text-muted-foreground">Noch keine Einträge</p>
          </div>
        ) : (
          <div className="space-y-3 pb-20">
            {doses.map((dose) => (
              <div key={dose.id} className="bg-[#0A0A0A] rounded-3xl p-5 border border-border/30 relative">
                <div onClick={() => openEdit(dose)} className="cursor-pointer pr-12">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-lg">{dose.name}</p>
                      <p className="text-2xl font-medium mt-1">{dose.menge} mg</p>
                      <p className="text-sm text-blue-400">
                        {dose.methode} {dose.stelle && `• ${dose.stelle}`}
                      </p>
                      {dose.notes && <p className="text-sm text-muted-foreground mt-2">„{dose.notes}“</p>}
                    </div>

                    <p className="text-xs text-muted-foreground text-right">
                      {dose.datum} {dose.zeit}
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