"use client"

import { useState, useEffect } from "react"
import { Plus, PlayCircle, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { BottomNav } from "@/components/bottom-nav"

const daysShort = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

export default function CyclePage() {
  const [hasActiveCycle, setHasActiveCycle] = useState(false)
  const [showStartModal, setShowStartModal] = useState(false)
  const [showCompoundModal, setShowCompoundModal] = useState(false)
  const [showPCTModal, setShowPCTModal] = useState(false)
  const [showDosingModal, setShowDosingModal] = useState(false)
  const [selectedCompoundForDosing, setSelectedCompoundForDosing] = useState<any>(null)

  const [cycleName, setCycleName] = useState("")
  const [durationWeeks, setDurationWeeks] = useState<number>(12)
  const [description, setDescription] = useState("")

  const [mainStack, setMainStack] = useState<any[]>([])
  const [pctStack, setPctStack] = useState<any[]>([])

  const [userCompounds, setUserCompounds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkActiveCycle()
    loadUserCompounds()
  }, [])

  const loadUserCompounds = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase.from('compounds').select('*').eq('user_id', session.user.id)
    setUserCompounds(data || [])
  }

  const checkActiveCycle = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return setLoading(false)

    const { data } = await supabase.from('cycles').select('*').eq('user_id', session.user.id).eq('active', true).single()
    setHasActiveCycle(!!data)
    setLoading(false)
  }

  const addToMainStack = (compound: any) => {
    if (!mainStack.find(c => c.id === compound.id)) {
      const newComp = { 
        ...compound, 
        startWeek: 1, 
        endWeek: durationWeeks, 
        doseAmount: compound.concentration || 250, 
        frequency: "E3D",
        customDays: [] 
      }
      setMainStack([...mainStack, newComp])
      setSelectedCompoundForDosing(newComp)
      setShowCompoundModal(false)
      setShowDosingModal(true)
    }
  }

  const addToPCTStack = (compound: any) => {
    if (!pctStack.find(c => c.id === compound.id)) {
      const newComp = { 
        ...compound, 
        startWeek: 1, 
        endWeek: durationWeeks, 
        doseAmount: compound.concentration || 250, 
        frequency: "E3D",
        customDays: [] 
      }
      setPctStack([...pctStack, newComp])
      setSelectedCompoundForDosing(newComp)
      setShowPCTModal(false)
      setShowDosingModal(true)
    }
  }

  const openDosingModal = (compound: any) => {
    setSelectedCompoundForDosing(compound)
    setShowDosingModal(true)
  }

  const updateDosing = (key: string, value: any) => {
    if (!selectedCompoundForDosing) return
    setSelectedCompoundForDosing({ ...selectedCompoundForDosing, [key]: value })
  }

  const toggleCustomDay = (day: string) => {
    if (!selectedCompoundForDosing) return
    const current = selectedCompoundForDosing.customDays || []
    const newDays = current.includes(day) 
      ? current.filter((d: string) => d !== day)
      : [...current, day]
    updateDosing('customDays', newDays)
  }

  const saveDosingConfig = () => {
    if (!selectedCompoundForDosing) return
    setMainStack(mainStack.map(c => c.id === selectedCompoundForDosing.id ? selectedCompoundForDosing : c))
    setPctStack(pctStack.map(c => c.id === selectedCompoundForDosing.id ? selectedCompoundForDosing : c))
    setShowDosingModal(false)
  }

  const removeFromMainStack = (id: string) => setMainStack(mainStack.filter(c => c.id !== id))
  const removeFromPCTStack = (id: string) => setPctStack(pctStack.filter(c => c.id !== id))

  const getCustomDaysText = (customDays: string[]) => {
    if (!customDays || customDays.length === 0) return ""
    return customDays.map(d => daysShort.findIndex(ds => ds === d) !== -1 ? daysShort[daysShort.findIndex(ds => ds === d)] : d).join(", ")
  }

  const startCycle = async () => {
    if (!cycleName.trim()) return alert("Bitte Cycle-Namen eingeben")

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase.from('cycles').insert({
      name: cycleName,
      duration_weeks: durationWeeks,
      description: description || null,
      mainStack,
      pctStack,
      start_date: new Date().toISOString().split('T')[0],
      active: true,
      user_id: session.user.id
    })

    setHasActiveCycle(true)
    setShowStartModal(false)
    setMainStack([])
    setPctStack([])
    alert("✅ Cycle erfolgreich gestartet!")
  }

  return (
    <div className="min-h-screen bg-[#050505] text-foreground pb-24">
      <header className="sticky top-0 z-50 bg-[#050505] border-b border-border/20 px-5 py-4">
        <h1 className="text-2xl font-bold">Cycle</h1>
      </header>

      <div className="flex flex-col items-center justify-center min-h-[70vh] px-5 text-center">
        {hasActiveCycle ? (
          <div>
            <PlayCircle className="w-24 h-24 text-emerald-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-emerald-400">Aktiver Cycle läuft</h2>
          </div>
        ) : (
          <div>
            <div className="w-24 h-24 rounded-full bg-[#0A0A0A] flex items-center justify-center mx-auto mb-8">
              <PlayCircle className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-3xl font-semibold mb-3">Noch kein Cycle</h2>
            <p className="text-muted-foreground">Erstelle jetzt deinen ersten Cycle</p>
          </div>
        )}
      </div>

      <button onClick={() => setShowStartModal(true)} className="fixed bottom-24 right-6 w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-2xl z-50">
        <Plus className="w-8 h-8" />
      </button>

      <BottomNav />

      {/* Cycle Start Modal */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-end">
          <div className="bg-[#0A0A0A] w-full rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold mb-6">Neuen Cycle starten</h2>

            <div className="space-y-6">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Cycle Name <span className="text-red-500">*</span></label>
                <input type="text" value={cycleName} onChange={(e) => setCycleName(e.target.value)} className="w-full bg-[#111111] rounded-2xl p-4" placeholder="Test E + Dianabol" />
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Dauer in Wochen <span className="text-red-500">*</span></label>
                <input type="number" min="1" value={durationWeeks} onChange={(e) => setDurationWeeks(Number(e.target.value))} className="w-full bg-[#111111] rounded-2xl p-4" />
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Beschreibung (optional)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full bg-[#111111] rounded-2xl p-4" placeholder="Ziele, Besonderheiten..." />
              </div>

              {/* Cycle Stack */}
              <div>
                <label className="text-sm text-muted-foreground block mb-3">Cycle Stack</label>
                <button onClick={() => setShowCompoundModal(true)} className="w-full bg-primary py-4 rounded-2xl font-medium mb-6">
                  Substanzen auswählen
                </button>

                <div className="space-y-3">
                  {mainStack.length > 0 ? mainStack.map(comp => (
                    <div key={comp.id} onClick={() => openDosingModal(comp)} className="bg-[#111111] rounded-2xl p-4 flex justify-between cursor-pointer">
                      <div>
                        <p className="font-semibold">{comp.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Woche {comp.startWeek}–{comp.endWeek} • {comp.doseAmount} mg • {comp.frequency}
                          {comp.frequency === "Custom" && comp.customDays?.length > 0 && ` • ${comp.customDays.join(", ")}`}
                        </p>
                      </div>
                      <X className="w-5 h-5 text-red-400" onClick={(e) => { e.stopPropagation(); removeFromMainStack(comp.id) }} />
                    </div>
                  )) : (
                    <div className="bg-[#111111] rounded-2xl p-6 text-center text-muted-foreground">Noch keine Substanzen</div>
                  )}
                </div>
              </div>

              {/* PCT Stack */}
              <div>
                <label className="text-sm text-muted-foreground block mb-3">PCT Stack</label>
                <button onClick={() => setShowPCTModal(true)} className="w-full bg-primary py-4 rounded-2xl font-medium mb-6">
                  PCT Substanzen auswählen
                </button>

                <div className="space-y-3">
                  {pctStack.length > 0 ? pctStack.map(comp => (
                    <div key={comp.id} onClick={() => openDosingModal(comp)} className="bg-[#111111] rounded-2xl p-4 flex justify-between cursor-pointer">
                      <div>
                        <p className="font-semibold">{comp.name} <span className="text-purple-400">(PCT)</span></p>
                        <p className="text-sm text-muted-foreground">
                          Woche {comp.startWeek}–{comp.endWeek} • {comp.doseAmount} mg • {comp.frequency}
                          {comp.frequency === "Custom" && comp.customDays?.length > 0 && ` • ${comp.customDays.join(", ")}`}
                        </p>
                      </div>
                      <X className="w-5 h-5 text-red-400" onClick={(e) => { e.stopPropagation(); removeFromPCTStack(comp.id) }} />
                    </div>
                  )) : (
                    <div className="bg-[#111111] rounded-2xl p-6 text-center text-muted-foreground">Noch keine PCT Substanzen</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowStartModal(false)} className="flex-1 py-4 bg-[#111111] rounded-2xl">Abbrechen</button>
              <button onClick={startCycle} className="flex-1 py-4 bg-primary rounded-2xl font-semibold">Cycle starten</button>
            </div>
          </div>
        </div>
      )}

      {/* Substanzen Auswahl Modal */}
      {showCompoundModal && (
        <div className="fixed inset-0 bg-black/90 z-[80] flex items-end">
          <div className="bg-[#0A0A0A] w-full rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-5">Substanzen auswählen</h2>
            <div className="space-y-2">
              {userCompounds.map(comp => (
                <div key={comp.id} onClick={() => addToMainStack(comp)} className="bg-[#111111] hover:bg-[#1A1A1A] rounded-2xl p-4 flex justify-between cursor-pointer">
                  <div>
                    <p className="font-medium">{comp.name}</p>
                    <p className="text-sm text-muted-foreground">{comp.concentration} {comp.concentration_unit}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowCompoundModal(false)} className="w-full mt-6 py-4 bg-[#111111] rounded-2xl">Fertig</button>
          </div>
        </div>
      )}

      {/* PCT Auswahl Modal */}
      {showPCTModal && (
        <div className="fixed inset-0 bg-black/90 z-[80] flex items-end">
          <div className="bg-[#0A0A0A] w-full rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-5">PCT Substanzen auswählen</h2>
            <div className="space-y-2">
              {userCompounds.map(comp => (
                <div key={comp.id} onClick={() => addToPCTStack(comp)} className="bg-[#111111] hover:bg-[#1A1A1A] rounded-2xl p-4 flex justify-between cursor-pointer">
                  <div>
                    <p className="font-medium">{comp.name}</p>
                    <p className="text-sm text-muted-foreground">{comp.concentration} {comp.concentration_unit}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowPCTModal(false)} className="w-full mt-6 py-4 bg-[#111111] rounded-2xl">Fertig</button>
          </div>
        </div>
      )}

      {/* Dosing Modal */}
      {showDosingModal && selectedCompoundForDosing && (
        <div className="fixed inset-0 bg-black/90 z-[90] flex items-end">
          <div className="bg-[#0A0A0A] w-full rounded-t-3xl p-6 max-h-[92vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-6">{selectedCompoundForDosing.name}</h2>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Start Week</label>
                  <input type="number" value={selectedCompoundForDosing.startWeek} onChange={(e) => updateDosing('startWeek', Number(e.target.value))} className="w-full bg-[#111111] rounded-2xl p-4 mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">End Week</label>
                  <input type="number" value={selectedCompoundForDosing.endWeek} onChange={(e) => updateDosing('endWeek', Number(e.target.value))} className="w-full bg-[#111111] rounded-2xl p-4 mt-1" />
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-2">Dose Amount</label>
                <div className="flex gap-3">
                  <input type="number" value={selectedCompoundForDosing.doseAmount} onChange={(e) => updateDosing('doseAmount', Number(e.target.value))} className="flex-1 bg-[#111111] rounded-2xl p-4" />
                  <div className="bg-[#111111] rounded-2xl px-6 flex items-center">mg</div>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-2">Frequency</label>
                <select value={selectedCompoundForDosing.frequency} onChange={(e) => updateDosing('frequency', e.target.value)} className="w-full bg-[#111111] rounded-2xl p-4">
                  <option value="Daily">Daily - Jeden Tag</option>
                  <option value="Twice Daily">Twice Daily - Zweimal am Tag</option>
                  <option value="EOD">EOD - Jeden 2. Tag</option>
                  <option value="E3D">E3D - Jeden 3. Tag</option>
                  <option value="Custom">Custom Days</option>
                </select>
              </div>

              {selectedCompoundForDosing.frequency === "Custom" && (
                <div>
                  <label className="text-sm text-muted-foreground block mb-3">Wähle die Tage</label>
                  <div className="grid grid-cols-4 gap-2">
                    {daysShort.map(day => (
                      <button
                        key={day}
                        onClick={() => toggleCustomDay(day)}
                        className={`py-3 rounded-2xl text-sm font-medium transition-all ${
                          (selectedCompoundForDosing.customDays || []).includes(day) ? "bg-primary text-white" : "bg-[#111111]"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={saveDosingConfig} className="w-full mt-8 bg-primary py-4 rounded-2xl font-semibold">Speichern</button>
          </div>
        </div>
      )}
    </div>
  )
}