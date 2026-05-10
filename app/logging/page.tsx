"use client"

import { useState, useEffect } from "react"
import { Syringe, Plus, Pencil, Trash2, Clock } from "lucide-react"
import { WeekCalendar } from "@/components/week-calendar"
import { BottomNav } from "@/components/bottom-nav"
import { supabase } from "@/lib/supabase"

interface Dose {
  id: string
  name: string          // compound name
  menge: number
  methode?: string
  stelle?: string
  notizen?: string
  datum: string
}

export default function LoggingPage() {
  const [doses, setDoses] = useState<Dose[]>([])
  const [compounds, setCompounds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showLogModal, setShowLogModal] = useState(false)
  const [selectedDose, setSelectedDose] = useState<Dose | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [form, setForm] = useState({
    compound_id: "",
    menge: "",
    methode: "Oral",
    stelle: "Rechte Schulter",
    notizen: "",
  })

  const loadData = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Substanzen laden
    const { data: comps } = await supabase
      .from('compounds')
      .select('id, name')
      .eq('user_id', session.user.id)

    // Dosen laden
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
  }, [])

  const handleLogDose = async () => {
    if (!form.compound_id || !form.menge) {
      alert("Bitte Substanz und Menge auswählen!")
      return
    }

    const selectedCompound = compounds.find(c => c.id === form.compound_id)
    const { data: { session } } = await supabase.auth.getSession()

    const payload = {
      user_id: session?.user.id,
      compound_id: form.compound_id,
      name: selectedCompound?.name || "Unbekannt",
      menge: Number(form.menge),
      methode: form.methode,
      stelle: form.stelle || null,
      notizen: form.notizen || null,
    }

    const { error } = await supabase.from('doses').insert(payload)

    if (error) {
      console.error(error)
      alert("Fehler beim Speichern: " + error.message)
    } else {
      alert("✅ Dosis erfolgreich eingetragen!")
      setShowLogModal(false)
      setForm({ compound_id: "", menge: "", methode: "Oral", stelle: "Rechte Schulter", notizen: "" })
      loadData()
    }
  }

  const deleteDose = async () => {
    if (!selectedDose) return
    await supabase.from('doses').delete().eq('id', selectedDose.id)
    setShowDeleteConfirm(false)
    loadData()
  }

  return (
    <div className="min-h-screen bg-[#050505] text-foreground pb-24">
      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-lg border-b border-border/20 px-5 py-4">
        <h1 className="text-2xl font-bold">Logging</h1>
      </header>

      <div className="px-5 pt-4">
        <WeekCalendar />

        {/* Heute anstehend */}
        <div className="mt-6 mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Syringe className="w-5 h-5" /> Heute anstehend
          </h2>
          <div className="bg-[#0A0A0A] rounded-3xl p-8 text-center border border-border/30">
            <p className="text-muted-foreground">Noch kein aktiver Cycle</p>
            <p className="text-xs text-muted-foreground mt-1">Sobald du einen Cycle startest, siehst du hier die heutigen Dosen</p>
          </div>
        </div>

        {/* Zuletzt geloggt */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" /> Zuletzt geloggt
          </h2>
          <button
            onClick={() => setShowLogModal(true)}
            className="bg-primary hover:bg-primary/90 px-8 py-3.5 rounded-2xl font-semibold flex items-center gap-2 text-base active:scale-[0.97]"
          >
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
              <div key={dose.id} className="bg-[#0A0A0A] rounded-3xl p-5 border border-border/30">
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
                    {new Date(dose.datum).toLocaleString('de-DE')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />

      {/* Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-end">
          <div className="bg-[#0A0A0A] w-full rounded-t-3xl p-6 max-h-[92vh] overflow-auto">
            <h2 className="text-2xl font-semibold mb-6">Neue Dosis eintragen</h2>

            <div className="space-y-6">
              <div>
                <label className="text-sm text-muted-foreground block mb-2">Substanz *</label>
                <select 
                  value={form.compound_id} 
                  onChange={(e) => setForm({ ...form, compound_id: e.target.value })}
                  className="w-full bg-[#111111] rounded-2xl p-4"
                >
                  <option value="">Substanz auswählen...</option>
                  {compounds.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-2">Menge (mg) *</label>
                <input 
                  type="number" 
                  value={form.menge} 
                  onChange={(e) => setForm({ ...form, menge: e.target.value })} 
                  className="w-full bg-[#111111] rounded-2xl p-4 text-lg" 
                  placeholder="z.B. 250" 
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-2">Methode</label>
                <select 
                  value={form.methode} 
                  onChange={(e) => setForm({ ...form, methode: e.target.value })} 
                  className="w-full bg-[#111111] rounded-2xl p-4"
                >
                  <option value="Oral">Oral</option>
                  <option value="IM">IM (intramuskulär)</option>
                  <option value="SubQ">SubQ (subkutan)</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-2">Injektionsstelle</label>
                <select 
                  value={form.stelle} 
                  onChange={(e) => setForm({ ...form, stelle: e.target.value })} 
                  className="w-full bg-[#111111] rounded-2xl p-4"
                >
                  <option value="Rechte Schulter">Rechte Schulter</option>
                  <option value="Linke Schulter">Linke Schulter</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-2">Notizen (optional)</label>
                <textarea 
                  value={form.notizen} 
                  onChange={(e) => setForm({ ...form, notizen: e.target.value })} 
                  className="w-full bg-[#111111] rounded-3xl p-4 h-24" 
                  placeholder="z.B. vor dem Training, mit Essen..." 
                />
              </div>

              <button onClick={handleLogDose} className="w-full bg-primary py-5 rounded-2xl font-semibold text-lg">
                Dosis eintragen
              </button>
              <button onClick={() => setShowLogModal(false)} className="w-full py-4 text-muted-foreground">Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Bestätigung */}
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