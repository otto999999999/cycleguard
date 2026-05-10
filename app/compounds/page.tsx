"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, ChevronLeft, Syringe } from "lucide-react"
import Link from "next/link"
import { BottomNav } from "@/components/bottom-nav"
import { supabase } from "@/lib/supabase"

interface Compound {
  id: string
  name: string
  type: string
  concentration?: number | null
  concentration_unit?: string | null
  // Oral
  dose_per_pill?: number | null
  pill_unit?: string | null
  pills_per_bottle?: number | null
  current_bottles?: number | null
  // AI
  dose_per_pill_ai?: number | null
  pill_unit_ai?: string | null
  pills_per_bottle_ai?: number | null
  current_bottles_ai?: number | null
  // SARM
  dose_per_pill_sarm?: number | null
  pill_unit_sarm?: string | null
  pills_per_bottle_sarm?: number | null
  current_bottles_sarm?: number | null
  packaging?: "Vial" | "Ampulle" | null
  size_ml?: number | null
  current_vials?: number | null
  current_ampoules?: number | null
  method?: "IM" | "SubQ" | "Oral" | null
  manufacturer?: string | null
  price?: number | null
}

const compoundTypes = [
  "Injectable", "Oral", "AI (Aromatase Inhibitor)", "SARM",
  "Peptide", "PCT", "Supplement"
]

export default function CompoundsPage() {
  const [compounds, setCompounds] = useState<Compound[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingCompound, setEditingCompound] = useState<Compound | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [compoundToDelete, setCompoundToDelete] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    name: "",
    type: "",
    concentration: 250,
    concentrationUnit: "mg/ml",
    dosePerPill: 25,
    pillUnit: "mg/pill",
    pillsPerBottle: 100,
    currentBottles: 1,
    dosePerPillAI: 25,
    pillUnitAI: "mg/pill",
    pillsPerBottleAI: 100,
    currentBottlesAI: 1,
    dosePerPillSARM: 25,
    pillUnitSARM: "mg/pill",
    pillsPerBottleSARM: 100,
    currentBottlesSARM: 1,
    packaging: "" as "" | "Vial" | "Ampulle",
    sizeMl: 10,
    currentVials: 0,
    currentAmpoules: 0,
    method: "IM" as "IM" | "SubQ" | "Oral",
    manufacturer: "",
    price: 0,
  })

  const loadCompounds = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return setLoading(false)

    const { data } = await supabase
      .from('compounds')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    setCompounds(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadCompounds()
  }, [])

  const openAddModal = () => {
    setEditingCompound(null)
    setForm({
      name: "", type: "", concentration: 250, concentrationUnit: "mg/ml",
      dosePerPill: 25, pillUnit: "mg/pill", pillsPerBottle: 100, currentBottles: 1,
      dosePerPillAI: 25, pillUnitAI: "mg/pill", pillsPerBottleAI: 100, currentBottlesAI: 1,
      dosePerPillSARM: 25, pillUnitSARM: "mg/pill", pillsPerBottleSARM: 100, currentBottlesSARM: 1,
      packaging: "", sizeMl: 10, currentVials: 0, currentAmpoules: 0,
      method: "IM", manufacturer: "", price: 0
    })
    setShowModal(true)
  }

  const openEditModal = (c: Compound) => {
    setEditingCompound(c)
    setForm({
      name: c.name || "",
      type: c.type || "",
      concentration: c.concentration ?? 250,
      concentrationUnit: c.concentration_unit || "mg/ml",
      dosePerPill: c.dose_per_pill ?? 25,
      pillUnit: c.pill_unit || "mg/pill",
      pillsPerBottle: c.pills_per_bottle ?? 100,
      currentBottles: c.current_bottles ?? 1,
      dosePerPillAI: c.dose_per_pill_ai ?? 25,
      pillUnitAI: c.pill_unit_ai || "mg/pill",
      pillsPerBottleAI: c.pills_per_bottle_ai ?? 100,
      currentBottlesAI: c.current_bottles_ai ?? 1,
      dosePerPillSARM: c.dose_per_pill_sarm ?? 25,
      pillUnitSARM: c.pill_unit_sarm || "mg/pill",
      pillsPerBottleSARM: c.pills_per_bottle_sarm ?? 100,
      currentBottlesSARM: c.current_bottles_sarm ?? 1,
      packaging: c.packaging || "",
      sizeMl: c.size_ml ?? 10,
      currentVials: c.current_vials ?? 0,
      currentAmpoules: c.current_ampoules ?? 0,
      method: (c.method as "IM" | "SubQ" | "Oral") || "IM",
      manufacturer: c.manufacturer || "",
      price: c.price ?? 0,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.type) {
      alert("Name und Typ sind erforderlich!")
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const payload: any = {
      name: form.name.trim(),
      type: form.type,
      manufacturer: form.manufacturer?.trim() || null,
      price: form.price || null,
      user_id: session.user.id,
    }

    if (form.type === "Injectable") {
      payload.concentration = form.concentration
      payload.concentration_unit = form.concentrationUnit
      payload.packaging = form.packaging || null
      payload.size_ml = form.sizeMl
      payload.method = form.method
      if (form.packaging === "Vial") payload.current_vials = form.currentVials ?? 0
      if (form.packaging === "Ampulle") payload.current_ampoules = form.currentAmpoules ?? 0
    } 
    else if (form.type === "Oral") {
      payload.dose_per_pill = form.dosePerPill
      payload.pill_unit = form.pillUnit
      payload.pills_per_bottle = form.pillsPerBottle
      payload.current_bottles = form.currentBottles
      payload.method = "Oral"
    } 
    else if (form.type === "AI (Aromatase Inhibitor)") {
      payload.dose_per_pill_ai = form.dosePerPillAI
      payload.pill_unit_ai = form.pillUnitAI
      payload.pills_per_bottle_ai = form.pillsPerBottleAI
      payload.current_bottles_ai = form.currentBottlesAI
      payload.method = "Oral"
    } 
    else if (form.type === "SARM") {
      payload.dose_per_pill_sarm = form.dosePerPillSARM
      payload.pill_unit_sarm = form.pillUnitSARM
      payload.pills_per_bottle_sarm = form.pillsPerBottleSARM
      payload.current_bottles_sarm = form.currentBottlesSARM
      payload.method = "Oral"
    }

    try {
      if (editingCompound) {
        const { error } = await supabase.from('compounds').update(payload).eq('id', editingCompound.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('compounds').insert(payload)
        if (error) throw error
      }

      alert("✅ Substanz gespeichert!")
      setShowModal(false)
      setEditingCompound(null)
      await loadCompounds()
    } catch (error: any) {
      alert("Fehler: " + error.message)
    }
  }

  const handleDeleteClick = (id: string) => {
    setCompoundToDelete(id)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!compoundToDelete) return
    await supabase.from('compounds').delete().eq('id', compoundToDelete)
    setShowDeleteConfirm(false)
    setCompoundToDelete(null)
    await loadCompounds()
  }

  const getStockInfo = (c: Compound) => {
    let count = 0
    let unit = ""

    if (c.type === "Oral" || c.type === "AI (Aromatase Inhibitor)" || c.type === "SARM") {
      count = c.current_bottles ?? c.current_bottles_ai ?? c.current_bottles_sarm ?? 0
      unit = count === 1 ? "Flasche" : "Flaschen"
    } else if (c.packaging === "Vial") {
      count = c.current_vials ?? 0
      unit = count === 1 ? "Vial" : "Vials"
    } else if (c.packaging === "Ampulle") {
      count = c.current_ampoules ?? 0
      unit = count === 1 ? "Ampulle" : "Ampullen"
    }

    let stockColor = "text-emerald-400"
    if (count === 0) stockColor = "text-red-500"
    else if (count === 1) stockColor = "text-orange-400"

    return { count, unit, stockColor }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-foreground pb-24">
      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-lg border-b border-border/20">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/" className="w-10 h-10 rounded-xl bg-[#0A0A0A] flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold">Substanzen</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="px-5 pt-6">
        {loading ? (
          <p className="text-center text-muted-foreground py-20">Lade Substanzen...</p>
        ) : compounds.length === 0 ? (
          <div className="text-center py-20">
            <Syringe className="w-20 h-20 mx-auto text-muted-foreground mb-6" />
            <h2 className="text-2xl font-medium">Keine Substanzen</h2>
            <p className="text-muted-foreground mt-3 mb-8">Füge deine ersten Substanzen hinzu</p>
            <button onClick={openAddModal} className="bg-primary px-8 py-4 rounded-2xl font-medium flex items-center gap-2 mx-auto">
              <Plus className="w-5 h-5" /> Neue Substanz hinzufügen
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {compounds.map((c) => {
              const { count, unit, stockColor } = getStockInfo(c)
              return (
                <div key={c.id} className="bg-[#0A0A0A] rounded-3xl p-5 border border-border/30">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{c.name}</h3>
                      {(c.type === "Oral" || c.type === "AI (Aromatase Inhibitor)" || c.type === "SARM") ? (
                        <p className="text-sm text-blue-400">
                          {c.dose_per_pill || c.dose_per_pill_ai || c.dose_per_pill_sarm} 
                          {c.pill_unit || c.pill_unit_ai || c.pill_unit_sarm} • 
                          {c.pills_per_bottle || c.pills_per_bottle_ai || c.pills_per_bottle_sarm} Pillen/Flasche
                        </p>
                      ) : (
                        <p className="text-sm text-blue-400">
                          {c.concentration} {c.concentration_unit} • {c.packaging} {c.size_ml}ml • {c.method}
                        </p>
                      )}
                      <p className={`font-medium mt-1 ${stockColor}`}>
                        {count} {unit} in Stock • €{c.price} pro Stk.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEditModal(c)} className="p-3 bg-[#111111] rounded-2xl">
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDeleteClick(c.id)} className="p-3 bg-red-500/10 text-red-400 rounded-2xl">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <button onClick={openAddModal} className="fixed bottom-24 right-6 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-2xl z-50">
        <Plus className="w-7 h-7" />
      </button>

      <BottomNav />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-end">
          <div className="bg-[#0A0A0A] w-full rounded-t-3xl p-6 max-h-[92vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold mb-6">
              {editingCompound ? "Substanz bearbeiten" : "Neue Substanz hinzufügen"}
            </h2>

            <div className="space-y-6">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-[#111111] rounded-2xl p-4" />
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Typ <span className="text-red-500">*</span></label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-[#111111] rounded-2xl p-4">
                  <option value="">Bitte auswählen...</option>
                  {compoundTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Pillen-Felder für Oral, AI und SARM */}
              {(form.type === "Oral" || form.type === "AI (Aromatase Inhibitor)" || form.type === "SARM") && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">Dose pro Pille <span className="text-red-500">*</span></label>
                      <input type="number" value={form.dosePerPill} onChange={(e) => setForm({ ...form, dosePerPill: Number(e.target.value) })} className="w-full bg-[#111111] rounded-2xl p-4" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">Einheit</label>
                      <select value={form.pillUnit} onChange={(e) => setForm({ ...form, pillUnit: e.target.value })} className="w-full bg-[#111111] rounded-2xl p-4">
                        <option value="mg/pill">mg/pill</option>
                        <option value="mcg/pill">mcg/pill</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Pillen pro Flasche</label>
                    <input type="number" value={form.pillsPerBottle} onChange={(e) => setForm({ ...form, pillsPerBottle: Number(e.target.value) })} className="w-full bg-[#111111] rounded-2xl p-4" />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Anzahl der Flaschen</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={
                        form.type === "Oral" ? form.currentBottles :
                        form.type === "AI (Aromatase Inhibitor)" ? form.currentBottlesAI :
                        form.currentBottlesSARM
                      } 
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0
                        if (form.type === "Oral") setForm({ ...form, currentBottles: val })
                        else if (form.type === "AI (Aromatase Inhibitor)") setForm({ ...form, currentBottlesAI: val })
                        else if (form.type === "SARM") setForm({ ...form, currentBottlesSARM: val })
                      }} 
                      className="w-full bg-[#111111] rounded-2xl p-4" 
                    />
                  </div>
                </>
              )}

              {/* Injectable Felder */}
              {form.type === "Injectable" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">Konzentration <span className="text-red-500">*</span></label>
                      <input type="number" value={form.concentration} onChange={(e) => setForm({ ...form, concentration: Number(e.target.value) })} className="w-full bg-[#111111] rounded-2xl p-4" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">Einheit</label>
                      <select value={form.concentrationUnit} onChange={(e) => setForm({ ...form, concentrationUnit: e.target.value })} className="w-full bg-[#111111] rounded-2xl p-4">
                        <option value="mg/ml">mg/ml</option>
                        <option value="mcg/ml">mcg/ml</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Verpackung <span className="text-red-500">*</span></label>
                    <select value={form.packaging} onChange={(e) => setForm({ ...form, packaging: e.target.value as "Vial" | "Ampulle" })} className="w-full bg-[#111111] rounded-2xl p-4">
                      <option value="">Bitte auswählen...</option>
                      <option value="Vial">Vial</option>
                      <option value="Ampulle">Ampulle</option>
                    </select>
                  </div>

                  {form.packaging && (
                    <>
                      <div>
                        <label className="text-sm text-muted-foreground block mb-1">Anzahl der {form.packaging === "Vial" ? "Vials" : "Ampullen"}</label>
                        <input type="number" min="0" value={form.packaging === "Vial" ? form.currentVials : form.currentAmpoules} onChange={(e) => {
                          const val = Number(e.target.value) || 0
                          if (form.packaging === "Vial") setForm({ ...form, currentVials: val })
                          else setForm({ ...form, currentAmpoules: val })
                        }} className="w-full bg-[#111111] rounded-2xl p-4" />
                      </div>

                      <div>
                        <label className="text-sm text-muted-foreground block mb-1">Größe pro {form.packaging} (ml)</label>
                        <input type="number" min="0.1" step="0.1" value={form.sizeMl} onChange={(e) => setForm({ ...form, sizeMl: Number(e.target.value) })} className="w-full bg-[#111111] rounded-2xl p-4" />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">Injektionsmethode</label>
                    <div className="flex gap-3">
                      <button onClick={() => setForm({ ...form, method: "IM" })} className={`flex-1 py-4 rounded-2xl font-medium ${form.method === "IM" ? "bg-primary text-white" : "bg-[#111111]"}`}>IM</button>
                      <button onClick={() => setForm({ ...form, method: "SubQ" })} className={`flex-1 py-4 rounded-2xl font-medium ${form.method === "SubQ" ? "bg-primary text-white" : "bg-[#111111]"}`}>SubQ</button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Marke / Hersteller <span className="text-red-500">*</span></label>
                <input type="text" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="w-full bg-[#111111] rounded-2xl p-4" />
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Preis (€) <span className="text-red-500">*</span></label>
                <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="w-full bg-[#111111] rounded-2xl p-4" />
              </div>

              <button onClick={handleSave} className="w-full bg-primary py-4 rounded-2xl font-semibold">
                {editingCompound ? "Änderungen speichern" : "Substanz hinzufügen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/90 z-[80] flex items-center justify-center px-5">
          <div className="bg-[#0A0A0A] rounded-3xl p-8 w-full max-w-sm text-center">
            <Trash2 className="w-14 h-14 text-red-500 mx-auto mb-5" />
            <h3 className="text-xl font-semibold mb-2">Substanz löschen?</h3>
            <p className="text-muted-foreground mb-8">Das kann nicht rückgängig gemacht werden.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 bg-[#111111] rounded-2xl font-medium">Abbrechen</button>
              <button onClick={confirmDelete} className="flex-1 py-4 bg-red-600 rounded-2xl font-medium">Ja, löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}