"use client"

import { useState, useEffect } from "react"
import { Syringe, Plus, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { BottomNav } from "@/components/bottom-nav"

export default function LoggingPage() {
  const [doses, setDoses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDose, setSelectedDose] = useState<any>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const loadDoses = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('doses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    else setDoses(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadDoses()
  }, [])

  const openEdit = (dose: any) => {
    setSelectedDose({ ...dose })
    setShowEditModal(true)
  }

  const saveEdit = async () => {
    if (!selectedDose) return

    const { error } = await supabase
      .from('doses')
      .update({
        menge: selectedDose.menge,
        methode: selectedDose.methode,
        stelle: selectedDose.stelle,
        notes: selectedDose.notes
      })
      .eq('id', selectedDose.id)

    if (!error) {
      setShowEditModal(false)
      loadDoses()
    }
  }

  const deleteDose = async () => {
    if (!selectedDose) return
    await supabase.from('doses').delete().eq('id', selectedDose.id)
    setShowDeleteConfirm(false)
    setShowEditModal(false)
    loadDoses()
  }

  return (
    <div className="min-h-screen bg-[#050505] text-foreground pb-24">
      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-lg border-b border-border/20 px-5 py-4">
        <h1 className="text-2xl font-bold tracking-tighter">Logging</h1>
      </header>

      <div className="px-5 pt-6 space-y-8">
        {/* Kalender */}
        <div className="bg-[#0A0A0A] rounded-3xl p-5">
          <div className="flex justify-between mb-4">
            <span className="font-medium">Mai 2026</span>
            <span className="font-medium">Mai 2026</span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {["MO", "DI", "MI", "DO", "FR", "SA", "SO"].map((day) => (
              <div key={day} className="text-xs text-muted-foreground py-1">{day}</div>
            ))}
            {[4,5,6,7,8,9,10].map((day, i) => (
              <div key={i} className={`py-3 text-sm font-medium rounded-2xl ${day === 8 ? "bg-primary text-white" : "text-foreground"}`}>
                {day}
              </div>
            ))}
          </div>
        </div>

        <Link href="/log-dose" className="block">
          <div className="bg-primary hover:bg-primary/90 transition-colors text-white rounded-3xl py-5 text-center font-semibold flex items-center justify-center gap-3 text-lg">
            <Plus className="w-6 h-6" /> Dosis eintragen
          </div>
        </Link>

        {/* Heutige Dosen */}
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">HEUTIGE DOSEN</div>
          <div className="bg-[#0A0A0A] rounded-3xl p-8 text-center">
            <Syringe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Noch kein aktiver Cycle</p>
          </div>
        </div>

        {/* Dose History */}
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">DOSE HISTORY</div>

          {loading ? (
            <p className="text-center py-10 text-muted-foreground">Lade Einträge...</p>
          ) : doses.length === 0 ? (
            <div className="bg-[#0A0A0A] rounded-3xl p-10 text-center">
              <Syringe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Noch keine Einträge</p>
            </div>
          ) : (
            <div className="space-y-3">
              {doses.map((dose) => (
                <div 
                  key={dose.id} 
                  className="bg-[#0A0A0A] rounded-3xl p-5 cursor-pointer active:scale-[0.985]"
                  onClick={() => openEdit(dose)}
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">{dose.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {dose.menge} mg • {dose.methode} • {dose.stelle}
                      </p>
                      {dose.notes && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{dose.notes}</p>}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {dose.datum}<br />{dose.zeit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />

      {/* Bearbeiten Modal */}
      {showEditModal && selectedDose && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-end">
          <div className="bg-[#0A0A0A] w-full rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-6">Eintrag bearbeiten</h2>

            <div className="space-y-6">
              <div className="bg-[#111111] rounded-2xl p-4">
                <p className="text-sm text-muted-foreground">Substanz</p>
                <p className="font-medium text-lg">{selectedDose.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#111111] rounded-2xl p-4">
                  <p className="text-sm text-muted-foreground">Datum</p>
                  <p className="font-medium">{selectedDose.datum}</p>
                </div>
                <div className="bg-[#111111] rounded-2xl p-4">
                  <p className="text-sm text-muted-foreground">Uhrzeit</p>
                  <p className="font-medium">{selectedDose.zeit}</p>
                </div>
              </div>

              {/* Menge */}
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Menge (mg)</label>
                <input 
                  type="number" 
                  value={selectedDose.menge} 
                  onChange={(e) => setSelectedDose({...selectedDose, menge: parseFloat(e.target.value) || 0})}
                  className="w-full bg-[#111111] rounded-2xl p-4 text-lg"
                />
              </div>

              {/* Methode (ohne Topical) */}
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Methode</label>
                <div className="grid grid-cols-3 gap-2">
                  {["IM", "SubQ", "Oral"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setSelectedDose({...selectedDose, methode: m})}
                      className={`py-3 rounded-2xl text-sm ${selectedDose.methode === m ? "bg-primary text-white" : "bg-[#111111]"}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Injektionsstelle nur bei IM und SubQ */}
              {(selectedDose.methode === "IM" || selectedDose.methode === "SubQ") && (
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Injektionsstelle</label>
                  <select 
                    value={selectedDose.stelle || "Rechte Schulter"} 
                    onChange={(e) => setSelectedDose({...selectedDose, stelle: e.target.value})}
                    className="w-full bg-[#111111] rounded-2xl p-4"
                  >
                    <option value="Rechte Schulter">Rechte Schulter</option>
                    <option value="Linke Schulter">Linke Schulter</option>
                  </select>
                </div>
              )}

              {/* Notizen */}
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Notizen</label>
                <textarea 
                  value={selectedDose.notes || ""} 
                  onChange={(e) => setSelectedDose({...selectedDose, notes: e.target.value})}
                  className="w-full bg-[#111111] rounded-2xl p-4 h-24"
                  placeholder="Zusätzliche Notizen..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-4 bg-[#111111] rounded-2xl font-medium">Abbrechen</button>
              <button onClick={saveEdit} className="flex-1 py-4 bg-primary rounded-2xl font-medium">Speichern</button>
              <button onClick={() => setShowDeleteConfirm(true)} className="px-5 py-4 bg-red-500/10 text-red-400 rounded-2xl">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Löschen Bestätigung */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/90 z-[80] flex items-center justify-center px-5">
          <div className="bg-[#0A0A0A] rounded-3xl p-8 w-full max-w-sm text-center">
            <Trash2 className="w-14 h-14 text-red-500 mx-auto mb-5" />
            <h3 className="text-xl font-semibold mb-2">Eintrag löschen?</h3>
            <p className="text-muted-foreground mb-8">Das kann nicht rückgängig gemacht werden.</p>
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