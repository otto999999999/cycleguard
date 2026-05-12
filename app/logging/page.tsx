"use client"

import { useState, useEffect } from "react"
import { Syringe, Plus, Pencil, Trash2, Clock } from "lucide-react"
import { WeekCalendar } from "@/components/week-calendar"
import { BottomNav } from "@/components/bottom-nav"
import { supabase } from "@/lib/supabase"

interface Dose {
  id: string
  name: string
  menge: number
  methode?: string
  stelle?: string
  notizen?: string
  datum: string
  zeit?: string
}

export default function LoggingPage() {
  const [doses, setDoses] = useState<Dose[]>([])
  const [compounds, setCompounds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showLogModal, setShowLogModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedDose, setSelectedDose] = useState<Dose | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [form, setForm] = useState({
    compound_id: "",
    menge: "",
    methode: "Oral",
    stelle: "Rechte Schulter",
    notizen: "",
    datum: "",
    uhrzeit: "",
  })

  const [lastInjectionSite, setLastInjectionSite] = useState<string>("Rechte Schulter")

  const loadData = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: comps } = await supabase
      .from('compounds')
      .select('*')
      .eq('user_id', session.user.id)

    const { data: doseData } = await supabase
      .from('doses')
      .select('*')
      .eq('user_id', session.user.id)
      .order('datum', { ascending: false })

    setCompounds(comps || [])
    setDoses(doseData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    const saved = localStorage.getItem("lastInjectionSite")
    if (saved) setLastInjectionSite(saved)
  }, [])

  const setCurrentDateTime = () => {
    const now = new Date()
    setForm(prev => ({
      ...prev,
      datum: now.toISOString().split('T')[0],
      uhrzeit: now.toTimeString().slice(0, 5)
    }))
  }

  const openNewLog = () => {
    setIsEditing(false)
    setEditingId(null)
    setForm({ compound_id: "", menge: "", methode: "Oral", stelle: "Rechte Schulter", notizen: "", datum: "", uhrzeit: "" })
    setShowLogModal(true)
  }

  const openEdit = (dose: Dose) => {
    setIsEditing(true)
    setEditingId(dose.id)
    setSelectedDose(dose)

    const date = new Date(dose.datum)
    setForm({
      compound_id: "",
      menge: dose.menge.toString(),
      methode: dose.methode || "Oral",
      stelle: dose.stelle || "Rechte Schulter",
      notizen: dose.notizen || "",
      datum: date.toISOString().split('T')[0],
      uhrzeit: dose.zeit || date.toTimeString().slice(0, 5),
    })
    setShowLogModal(true)
  }

  const handleCompoundChange = (compoundId: string) => {
    const comp = compounds.find(c => c.id === compoundId)
    if (!comp) return

    const isInjectable = comp.type === "Injectable"
    const newMethode = isInjectable ? "IM" : "Oral"
    const suggestedSite = lastInjectionSite === "Rechte Schulter" ? "Linke Schulter" : "Rechte Schulter"

    setForm(prev => ({
      ...prev,
      compound_id: compoundId,
      methode: newMethode,
      stelle: isInjectable ? suggestedSite : "",
    }))
  }

  const selectedCompound = compounds.find(c => c.id === form.compound_id)

  const dosePerPill = selectedCompound && !selectedCompound.type?.includes("Injectable")
    ? (selectedCompound.dose_per_pill ?? selectedCompound.dose_per_pill_ai ?? selectedCompound.dose_per_pill_sarm ?? null)
    : null

  const mengeNum = Number(form.menge) || 0
  const mlBerechnet = selectedCompound?.type === "Injectable" && 
                      selectedCompound.concentration && 
                      mengeNum > 0 
    ? (mengeNum / selectedCompound.concentration).toFixed(2) 
    : null

  const handleLogDose = async () => {
    if (!form.menge || !form.datum || !form.uhrzeit) {
      alert("Bitte Menge, Datum und Uhrzeit ausfüllen!")
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const payload: any = {
      user_id: session.user.id,
      name: isEditing ? selectedDose?.name : selectedCompound?.name || "Unbekannt",
      menge: mengeNum,
      methode: form.methode,
      stelle: form.stelle || null,
      notizen: form.notizen || null,
      datum: form.datum,
      zeit: form.uhrzeit,
    }

    let error
    if (isEditing && editingId) {
      // Bearbeiten
      ({ error } = await supabase.from('doses').update(payload).eq('id', editingId))
    } else {
      // Neuer Eintrag
      if (form.compound_id) {
        payload.compound_id = form.compound_id   // ← hier explizit zugewiesen
      }
      ({ error } = await supabase.from('doses').insert(payload))
    }

    if (error) {
      alert("Fehler: " + error.message)
      console.error(error)
    } else {
      if (form.stelle) {
        localStorage.setItem("lastInjectionSite", form.stelle)
        setLastInjectionSite(form.stelle)
      }
      alert(isEditing ? "✅ Änderungen gespeichert!" : "✅ Dosis eingetragen!")
      setShowLogModal(false)
      setIsEditing(false)
      setEditingId(null)
      loadData()
    }
  }

  const requestDelete = (dose: Dose) => {
    setSelectedDose(dose)
    setShowDeleteConfirm(true)
  }

  const deleteDose = async () => {
    if (!selectedDose) return
    await supabase.from('doses').delete().eq('id', selectedDose.id)
    setShowDeleteConfirm(false)
    loadData()
  }

  useEffect(() => {
    if (showLogModal && !isEditing) setCurrentDateTime()
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
            <Syringe className="w-5 h-5" /> Heute anstehend
          </h2>
          <div className="bg-[#0A0A0A] rounded-3xl p-8 text-center border border-border/30">
            <p className="text-muted-foreground">Noch kein aktiver Cycle</p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" /> Zuletzt geloggt
          </h2>
          <button onClick={openNewLog} className="bg-primary hover:bg-primary/90 px-8 py-3.5 rounded-2xl font-semibold flex items-center gap-2 text-base">
            <Plus className="w-5 h-5" /> Eintragen
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
                      {dose.notizen && <p className="text-sm text-muted-foreground mt-2">„{dose.notizen}“</p>}
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {dose.datum} {dose.zeit}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); requestDelete(dose); }}
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

      {/* MODAL */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-end">
          <div className="bg-[#0A0A0A] w-full rounded-t-3xl p-6 max-h-[92vh] overflow-auto">
            <h2 className="text-2xl font-semibold mb-6">
              {isEditing ? "Dosis bearbeiten" : "Neue Dosis eintragen"}
            </h2>

            <div className="space-y-6">
              {!isEditing && (
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">Substanz *</label>
                  <select 
                    value={form.compound_id} 
                    onChange={(e) => handleCompoundChange(e.target.value)} 
                    className="w-full bg-[#111111] rounded-2xl p-4"
                  >
                    <option value="">Substanz auswählen...</option>
                    {compounds.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {(selectedCompound || isEditing) && (
                <>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">Menge (mg) *</label>
                    <input 
                      type="number" 
                      value={form.menge} 
                      onChange={(e) => setForm({ ...form, menge: e.target.value })} 
                      className="w-full bg-[#111111] rounded-2xl p-4 text-lg" 
                      placeholder="z.B. 250" 
                    />

                    {dosePerPill && (
                      <p className="text-blue-400 text-sm mt-2 pl-1 font-medium">
                        1 Pille = <span className="font-semibold">{dosePerPill} mg</span>
                      </p>
                    )}

                    {mlBerechnet && (
                      <p className="text-emerald-400 text-sm font-medium mt-2 pl-1">
                        = <span className="font-semibold">{mlBerechnet} ml</span> bei {selectedCompound?.concentration} mg/ml
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">Methode</label>
                    <div className="bg-[#111111] rounded-2xl p-4 text-base font-medium">
                      {form.methode === "IM" ? "IM (intramuskulär)" : "Oral"}
                    </div>
                  </div>

                  {(form.methode === "IM" || form.methode === "SubQ") && (
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">Injektionsstelle</label>
                      <p className="text-xs text-emerald-400 mb-2">Zuletzt benutzt: <span className="font-medium">{lastInjectionSite}</span></p>
                      <select value={form.stelle} onChange={(e) => setForm({ ...form, stelle: e.target.value })} className="w-full bg-[#111111] rounded-2xl p-4">
                        <option value="Rechte Schulter">Rechte Schulter</option>
                        <option value="Linke Schulter">Linke Schulter</option>
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground block mb-2">Datum</label>
                      <input type="date" value={form.datum} onChange={(e) => setForm({ ...form, datum: e.target.value })} className="w-full bg-[#111111] rounded-2xl p-4" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground block mb-2">Uhrzeit</label>
                      <input type="time" value={form.uhrzeit} onChange={(e) => setForm({ ...form, uhrzeit: e.target.value })} className="w-full bg-[#111111] rounded-2xl p-4" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">Notizen (optional)</label>
                    <textarea value={form.notizen} onChange={(e) => setForm({ ...form, notizen: e.target.value })} className="w-full bg-[#111111] rounded-3xl p-4 h-24" placeholder="z.B. vor dem Training..." />
                  </div>
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
            <p className="text-muted-foreground mb-8">{selectedDose.name} — {selectedDose.menge} mg</p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 bg-[#111111] rounded-2xl">Abbrechen</button>
              <button onClick={deleteDose} className="flex-1 py-4 bg-red-600 rounded-2xl">Ja, löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}