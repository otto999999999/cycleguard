"use client"

import { useEffect, useState } from "react"
import { Edit, PlayCircle, Plus, Square, Trash2, X } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"
import { supabase } from "@/lib/supabase"

const daysShort = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
const ORAL_TYPES = ["Oral", "AI (Aromatase Inhibitor)", "SARM", "PCT", "Supplement"]

export default function CyclePage() {
  const [cycles, setCycles] = useState<any[]>([])
  const [userCompounds, setUserCompounds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showCycleModal, setShowCycleModal] = useState(false)
  const [showCompoundModal, setShowCompoundModal] = useState(false)
  const [showPCTModal, setShowPCTModal] = useState(false)
  const [showDosingModal, setShowDosingModal] = useState(false)

  const [editingCycle, setEditingCycle] = useState<any>(null)
  const [selectedCompoundForDosing, setSelectedCompoundForDosing] = useState<any>(null)

  const [cycleName, setCycleName] = useState("")
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

    setLoading(false)
  }

  const resetForm = () => {
    setEditingCycle(null)
    setCycleName("")
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
    setDurationWeeks(cycle.duration_weeks || 12)
    setDescription(cycle.description || "")
    setMainStack(cycle.main_stack || [])
    setPctStack(cycle.pct_stack || [])
    setShowCycleModal(true)
  }

  const buildCompoundConfig = (compound: any) => {
    const oral = isOral(compound)

    return {
      id: compound.id,
      name: compound.name,
      type: compound.type,
      method: oral ? "Oral" : compound.method || "IM",
      startWeek: 1,
      endWeek: durationWeeks,
      doseAmount: oral ? compound.dose_per_pill || 25 : compound.concentration || 250,
      doseUnit: oral ? compound.pill_unit || "mg/pill" : compound.concentration_unit || "mg/ml",
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
    if (!cycleName.trim()) {
      alert("Bitte Cycle-Namen eingeben")
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      alert("Nicht eingeloggt")
      return
    }

    const payload = {
      name: cycleName.trim(),
      duration_weeks: durationWeeks,
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
        alert("Fehler beim Bearbeiten: " + error.message)
        return
      }

      alert("✅ Cycle aktualisiert!")
    } else {
      const { error } = await supabase
        .from("cycles")
        .insert({
          ...payload,
          active: false,
          start_date: null,
        })

      if (error) {
        alert("Fehler beim Erstellen: " + error.message)
        return
      }

      alert("✅ Cycle erstellt!")
    }

    setShowCycleModal(false)
    resetForm()
    await loadData()
  }

  const startCycle = async (cycle: any) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { error: stopError } = await supabase
      .from("cycles")
      .update({ active: false })
      .eq("user_id", session.user.id)
      .eq("active", true)

    if (stopError) {
      alert("Fehler beim Stoppen alter Cycles: " + stopError.message)
      return
    }

    const { error } = await supabase
      .from("cycles")
      .update({
        active: true,
        start_date: cycle.start_date || new Date().toISOString().split("T")[0],
        updated_at: new Date().toISOString(),
      })
      .eq("id", cycle.id)
      .eq("user_id", session.user.id)

    if (error) {
      alert("Fehler beim Starten: " + error.message)
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
      alert("Fehler beim Stoppen: " + error.message)
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
      alert("Fehler beim Löschen: " + error.message)
      return
    }

    await loadData()
  }

  const formatSchedule = (c: any) => {
    if (c.frequency === "Custom" && c.customDays?.length) return c.customDays.join(", ")
    return c.frequency
  }

  const renderLine = (c: any) => {
    return `Woche ${c.startWeek}–${c.endWeek} • ${c.doseAmount} ${c.doseUnit} • ${formatSchedule(c)}`
  }

  return (
    <div className="min-h-screen bg-[#050505] text-foreground pb-24">
      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-lg border-b border-border/20 px-5 py-4">
        <h1 className="text-2xl font-bold">Cycle</h1>
      </header>

      <main className="px-5 pt-6">
        {loading ? (
          <p className="text-center text-muted-foreground py-20">Lade Cycles...</p>
        ) : cycles.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[65vh] text-center">
            <div className="w-24 h-24 rounded-full bg-[#0A0A0A] flex items-center justify-center mx-auto mb-8">
              <PlayCircle className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-3xl font-semibold mb-3">Noch kein Cycle</h2>
            <p className="text-muted-foreground mb-8">
              Erstelle deinen ersten Cycle und starte ihn später.
            </p>

            <button
              onClick={openCreateModal}
              className="bg-primary px-8 py-4 rounded-2xl font-semibold flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Cycle erstellen
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {cycles.map((cycle) => (
              <div
                key={cycle.id}
                className={`rounded-3xl p-5 border ${
                  cycle.active
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-[#0A0A0A] border-white/5"
                }`}
              >
                <div className="flex justify-between gap-4">
                  <div className="min-w-0">
                    <p className={`text-xs mb-1 ${cycle.active ? "text-emerald-400" : "text-muted-foreground"}`}>
                      {cycle.active ? "Aktiv" : "Gespeichert"}
                    </p>

                    <h2 className="text-xl font-semibold truncate">{cycle.name}</h2>

                    <p className="text-sm text-muted-foreground mt-1">
                      {cycle.duration_weeks} Wochen
                      {cycle.start_date ? ` • Start: ${cycle.start_date}` : ""}
                    </p>

                    <p className="text-xs text-muted-foreground mt-2">
                      {(cycle.main_stack || []).length} Cycle Substanzen • {(cycle.pct_stack || []).length} PCT
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openEditModal(cycle)} className="p-3 bg-[#111111] rounded-2xl">
                      <Edit className="w-5 h-5" />
                    </button>

                    <button onClick={() => deleteCycle(cycle)} className="p-3 bg-red-500/10 text-red-400 rounded-2xl">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <CycleStackMini title="Cycle Stack" items={cycle.main_stack || []} renderLine={renderLine} />
                <CycleStackMini title="PCT Stack" items={cycle.pct_stack || []} renderLine={renderLine} pct />

                <div className="flex gap-3 mt-5">
                  {cycle.active ? (
                    <button
                      onClick={() => stopCycle(cycle)}
                      className="flex-1 py-4 bg-red-600 rounded-2xl font-semibold flex items-center justify-center gap-2"
                    >
                      <Square className="w-5 h-5" />
                      Stoppen
                    </button>
                  ) : (
                    <button
                      onClick={() => startCycle(cycle)}
                      className="flex-1 py-4 bg-primary rounded-2xl font-semibold flex items-center justify-center gap-2"
                    >
                      <PlayCircle className="w-5 h-5" />
                      Starten
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <button
        onClick={openCreateModal}
        className="fixed bottom-24 right-6 w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-2xl z-50"
      >
        <Plus className="w-8 h-8" />
      </button>

      <BottomNav />

      {showCycleModal && (
        <Modal title={editingCycle ? "Cycle bearbeiten" : "Neuen Cycle erstellen"} onClose={() => setShowCycleModal(false)}>
          <div className="space-y-6">
            <Card title="Grunddaten" subtitle="Name, Dauer und Beschreibung.">
              <Field label="Cycle Name">
                <input
                  value={cycleName}
                  onChange={(e) => setCycleName(e.target.value)}
                  className="input"
                  placeholder="z. B. Sommer Aufbau"
                />
              </Field>

              <Field label="Dauer in Wochen">
                <input
                  type="number"
                  min="1"
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(Number(e.target.value))}
                  className="input"
                />
              </Field>

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

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCycleModal(false)} className="flex-1 py-4 bg-[#111111] rounded-2xl">
                Abbrechen
              </button>

              <button onClick={saveCycle} className="flex-1 py-4 bg-primary rounded-2xl font-semibold">
                {editingCycle ? "Speichern" : "Erstellen"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showCompoundModal && (
        <SelectCompoundModal
          title="Substanzen auswählen"
          compounds={userCompounds}
          onSelect={addToMainStack}
          onClose={() => setShowCompoundModal(false)}
          isOral={isOral}
        />
      )}

      {showPCTModal && (
        <SelectCompoundModal
          title="PCT Substanzen auswählen"
          compounds={userCompounds}
          onSelect={addToPCTStack}
          onClose={() => setShowPCTModal(false)}
          isOral={isOral}
        />
      )}

      {showDosingModal && selectedCompoundForDosing && (
        <Modal title={selectedCompoundForDosing.name} onClose={() => setShowDosingModal(false)} high>
          <div className="space-y-6">
            <Card title="Zeitraum" subtitle="In welchen Wochen diese Substanz geplant ist.">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Start Woche">
                  <input
                    type="number"
                    min="1"
                    value={selectedCompoundForDosing.startWeek}
                    onChange={(e) => updateDosing("startWeek", Number(e.target.value))}
                    className="input"
                  />
                </Field>

                <Field label="End Woche">
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
                  <div className="bg-[#181818] border border-white/5 rounded-2xl px-5 flex items-center text-sm text-muted-foreground">
                    {selectedCompoundForDosing.doseUnit || "mg"}
                  </div>
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

            <button onClick={saveDosingConfig} className="w-full bg-primary py-4 rounded-2xl font-semibold">
              Speichern
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

function Modal({ title, children, onClose, high }: any) {
  return (
    <div className="fixed inset-0 bg-black/90 z-[80] flex items-end">
      <div className={`bg-[#0A0A0A] w-full rounded-t-3xl p-6 overflow-y-auto ${high ? "max-h-[92vh]" : "max-h-[90vh]"}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-[#111111] flex items-center justify-center">
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
    <div className="bg-[#111111] rounded-3xl p-5 space-y-5 border border-white/5">
      <div>
        <h3 className="font-semibold text-lg">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
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
      <div className="bg-[#181818] rounded-2xl p-6 text-center text-muted-foreground">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((comp: any) => (
        <div key={comp.id} onClick={() => onOpen(comp)} className="bg-[#181818] rounded-2xl p-4 flex justify-between gap-3 cursor-pointer">
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
    <Modal title={title} onClose={onClose}>
      <div className="space-y-2">
        {compounds.length === 0 ? (
          <div className="bg-[#111111] rounded-2xl p-6 text-center text-muted-foreground">
            Keine Substanzen vorhanden
          </div>
        ) : (
          compounds.map((comp: any) => (
            <button
              key={comp.id}
              onClick={() => onSelect(comp)}
              className="w-full text-left bg-[#111111] hover:bg-[#1A1A1A] rounded-2xl p-4"
            >
              <p className="font-medium">{comp.name}</p>
              <p className="text-sm text-muted-foreground">
                {isOral(comp)
                  ? `${comp.dose_per_pill || 0} ${comp.pill_unit || "mg/pill"} • ${comp.remaining_pills || 0} Pillen übrig`
                  : `${comp.concentration || 0} ${comp.concentration_unit || "mg/ml"} • ${comp.packaging || ""}`}
              </p>
            </button>
          ))
        )}
      </div>

      <button onClick={onClose} className="w-full mt-6 py-4 bg-[#111111] rounded-2xl">
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
            <div key={item.id} className="bg-[#111111] rounded-2xl p-3">
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