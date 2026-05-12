"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronLeft, Pencil, Plus, Syringe, Trash2 } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"
import { supabase } from "@/lib/supabase"

interface Compound {
  id: string
  name: string
  type: string
  concentration?: number | null
  concentration_unit?: string | null
  packaging?: "Vial" | "Ampulle" | null
  size_ml?: number | null
  current_vials?: number | null
  current_ampoules?: number | null
  method?: "IM" | "SubQ" | "Oral" | null
  dose_per_pill?: number | null
  pill_unit?: string | null
  pills_per_bottle?: number | null
  current_bottles?: number | null
  remaining_pills?: number | null
  manufacturer?: string | null
  price?: number | null
}

const compoundTypes = [
  "Injectable",
  "Oral",
  "AI (Aromatase Inhibitor)",
  "SARM",
  "Peptide",
  "PCT",
  "Supplement",
]

const ORAL_TYPES = ["Oral", "AI (Aromatase Inhibitor)", "SARM", "PCT", "Supplement"]

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
    packaging: "" as "" | "Vial" | "Ampulle",
    sizeMl: 10,
    currentVials: 0,
    currentAmpoules: 0,
    method: "IM" as "IM" | "SubQ" | "Oral",
    dosePerPill: 25,
    pillUnit: "mg/pill",
    pillsPerBottle: 100,
    currentBottles: 1,
    remainingPills: 100,
    manufacturer: "",
    price: 0,
  })

  const isOralType = (type: string) => ORAL_TYPES.includes(type)

  const resetForm = () => {
    setForm({
      name: "",
      type: "",
      concentration: 250,
      concentrationUnit: "mg/ml",
      packaging: "",
      sizeMl: 10,
      currentVials: 0,
      currentAmpoules: 0,
      method: "IM",
      dosePerPill: 25,
      pillUnit: "mg/pill",
      pillsPerBottle: 100,
      currentBottles: 1,
      remainingPills: 100,
      manufacturer: "",
      price: 0,
    })
  }

  const loadCompounds = async () => {
    setLoading(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setCompounds([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("compounds")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (error) {
      alert("Fehler beim Laden: " + error.message)
      setCompounds([])
    } else {
      setCompounds(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadCompounds()
  }, [])

  const openAddModal = () => {
    setEditingCompound(null)
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (c: Compound) => {
    setEditingCompound(c)

    setForm({
      name: c.name || "",
      type: c.type || "",
      concentration: c.concentration ?? 250,
      concentrationUnit: c.concentration_unit || "mg/ml",
      packaging: c.packaging || "",
      sizeMl: c.size_ml ?? 10,
      currentVials: c.current_vials ?? 0,
      currentAmpoules: c.current_ampoules ?? 0,
      method: c.method || "IM",
      dosePerPill: c.dose_per_pill ?? 25,
      pillUnit: c.pill_unit || "mg/pill",
      pillsPerBottle: c.pills_per_bottle ?? 100,
      currentBottles: c.current_bottles ?? 1,
      remainingPills: c.remaining_pills ?? c.pills_per_bottle ?? 100,
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

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      alert("Du bist nicht eingeloggt.")
      return
    }

    const payload: any = {
      name: form.name.trim(),
      type: form.type,
      manufacturer: form.manufacturer.trim() || null,
      price: form.price || null,
      user_id: session.user.id,
    }

    if (form.type === "Injectable") {
      payload.concentration = form.concentration
      payload.concentration_unit = form.concentrationUnit
      payload.packaging = form.packaging || null
      payload.size_ml = form.sizeMl
      payload.method = form.method
      payload.current_vials = form.packaging === "Vial" ? form.currentVials : 0
      payload.current_ampoules = form.packaging === "Ampulle" ? form.currentAmpoules : 0
      payload.current_bottles = 0
      payload.remaining_pills = 0
    } else if (isOralType(form.type)) {
      payload.dose_per_pill = form.dosePerPill
      payload.pill_unit = form.pillUnit
      payload.pills_per_bottle = form.pillsPerBottle
      payload.current_bottles = form.currentBottles
      payload.remaining_pills = form.remainingPills
      payload.method = "Oral"
      payload.packaging = null
      payload.concentration = null
      payload.concentration_unit = null
      payload.size_ml = null
      payload.current_vials = 0
      payload.current_ampoules = 0
    }

    try {
      if (editingCompound) {
        const { error } = await supabase
          .from("compounds")
          .update(payload)
          .eq("id", editingCompound.id)
          .eq("user_id", session.user.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("compounds").insert(payload)
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

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return

    const { error } = await supabase
      .from("compounds")
      .delete()
      .eq("id", compoundToDelete)
      .eq("user_id", session.user.id)

    if (error) {
      alert("Fehler beim Löschen: " + error.message)
      return
    }

    setShowDeleteConfirm(false)
    setCompoundToDelete(null)
    await loadCompounds()
  }

  const getStockInfo = (c: Compound) => {
    let count = 0
    let unit = ""

    if (isOralType(c.type)) {
      count = c.current_bottles ?? 0
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

  const inputClass =
    "w-full bg-[#181818] border border-white/5 focus:border-primary rounded-2xl p-4 outline-none transition"

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
              <Plus className="w-5 h-5" />
              Neue Substanz hinzufügen
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {compounds.map((c) => {
              const { count, unit, stockColor } = getStockInfo(c)
              const oral = isOralType(c.type)

              return (
                <div key={c.id} className="bg-[#0A0A0A] rounded-3xl p-5 border border-border/30">
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg truncate">{c.name}</h3>

                      {oral ? (
                        <p className="text-sm text-blue-400">
                          {c.dose_per_pill} {c.pill_unit} • {c.pills_per_bottle} Pillen/Flasche
                        </p>
                      ) : (
                        <p className="text-sm text-blue-400">
                          {c.concentration} {c.concentration_unit} • {c.packaging} {c.size_ml}ml • {c.method}
                        </p>
                      )}

                      <p className={`font-medium mt-1 ${stockColor}`}>
                        {count} {unit} in Stock{c.price ? ` • €${c.price} pro Stk.` : ""}
                      </p>

                      {oral && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {c.remaining_pills ?? 0} Pillen übrig
                        </p>
                      )}

                      {c.manufacturer && (
                        <p className="text-xs text-muted-foreground mt-1">{c.manufacturer}</p>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0">
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

      {showModal && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-end">
          <div className="bg-[#0A0A0A] w-full rounded-t-3xl p-6 max-h-[92vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold mb-1">
              {editingCompound ? "Substanz bearbeiten" : "Neue Substanz hinzufügen"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Trage Dosierung, Bestand und Hersteller sauber ein.
            </p>

            <div className="space-y-6">
              <div className="space-y-5">
                <Field label="Name der Substanz">
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="z. B. Testosterone Enanthate"
                    className={inputClass}
                  />
                </Field>

                <Field label="Kategorie">
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
                    <option value="">Bitte auswählen...</option>
                    {compoundTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {isOralType(form.type) && (
                <div className="bg-[#111111] rounded-3xl p-5 space-y-5 border border-white/5">
                  <div>
                    <h3 className="font-semibold text-lg">Pillen / Oral Bestand</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Gilt für Oral, AI, SARM, PCT und Supplements.
                    </p>
                  </div>

                  <Field label="Dosierung pro Pille">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        value={form.dosePerPill}
                        onChange={(e) => setForm({ ...form, dosePerPill: Number(e.target.value) })}
                        className={inputClass}
                      />

                      <select value={form.pillUnit} onChange={(e) => setForm({ ...form, pillUnit: e.target.value })} className={inputClass}>
                        <option value="mg/pill">mg/pill</option>
                        <option value="mcg/pill">mcg/pill</option>
                      </select>
                    </div>
                  </Field>

                  <Field label="Pillen pro Flasche">
                    <input
                      type="number"
                      value={form.pillsPerBottle}
                      onChange={(e) => {
                        const pills = Number(e.target.value)
                        setForm({ ...form, pillsPerBottle: pills, remainingPills: form.currentBottles * pills })
                      }}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Anzahl Flaschen">
                    <input
                      type="number"
                      value={form.currentBottles}
                      onChange={(e) => {
                        const bottles = Number(e.target.value)
                        setForm({ ...form, currentBottles: bottles, remainingPills: bottles * form.pillsPerBottle })
                      }}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Verbleibende Pillen gesamt">
                    <input
                      type="number"
                      value={form.remainingPills}
                      onChange={(e) => setForm({ ...form, remainingPills: Number(e.target.value) })}
                      className={inputClass}
                    />
                  </Field>
                </div>
              )}

              {form.type === "Injectable" && (
                <div className="bg-[#111111] rounded-3xl p-5 space-y-5 border border-white/5">
                  <div>
                    <h3 className="font-semibold text-lg">Injectable Bestand</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Konzentration, Verpackung und verfügbare Menge.
                    </p>
                  </div>

                  <Field label="Konzentration">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        value={form.concentration}
                        onChange={(e) => setForm({ ...form, concentration: Number(e.target.value) })}
                        className={inputClass}
                      />

                      <select value={form.concentrationUnit} onChange={(e) => setForm({ ...form, concentrationUnit: e.target.value })} className={inputClass}>
                        <option value="mg/ml">mg/ml</option>
                        <option value="mcg/ml">mcg/ml</option>
                      </select>
                    </div>
                  </Field>

                  <Field label="Verpackung">
                    <select
                      value={form.packaging}
                      onChange={(e) => setForm({ ...form, packaging: e.target.value as "" | "Vial" | "Ampulle" })}
                      className={inputClass}
                    >
                      <option value="">Bitte auswählen...</option>
                      <option value="Vial">Vial</option>
                      <option value="Ampulle">Ampulle</option>
                    </select>
                  </Field>

                  {form.packaging === "Vial" && (
                    <Field label="Anzahl Vials">
                      <input
                        type="number"
                        value={form.currentVials}
                        onChange={(e) => setForm({ ...form, currentVials: Number(e.target.value) })}
                        className={inputClass}
                      />
                    </Field>
                  )}

                  {form.packaging === "Ampulle" && (
                    <Field label="Anzahl Ampullen">
                      <input
                        type="number"
                        value={form.currentAmpoules}
                        onChange={(e) => setForm({ ...form, currentAmpoules: Number(e.target.value) })}
                        className={inputClass}
                      />
                    </Field>
                  )}

                  <Field label="Größe pro Einheit in ml">
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={form.sizeMl}
                      onChange={(e) => setForm({ ...form, sizeMl: Number(e.target.value) })}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Methode">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, method: "IM" })}
                        className={`flex-1 py-4 rounded-2xl font-medium ${form.method === "IM" ? "bg-primary text-white" : "bg-[#181818]"}`}
                      >
                        IM
                      </button>

                      <button
                        type="button"
                        onClick={() => setForm({ ...form, method: "SubQ" })}
                        className={`flex-1 py-4 rounded-2xl font-medium ${form.method === "SubQ" ? "bg-primary text-white" : "bg-[#181818]"}`}
                      >
                        SubQ
                      </button>
                    </div>
                  </Field>
                </div>
              )}

              <div className="bg-[#111111] rounded-3xl p-5 space-y-5 border border-white/5">
                <h3 className="font-semibold text-lg">Zusatzinfos</h3>

                <Field label="Marke / Hersteller">
                  <input
                    value={form.manufacturer}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    placeholder="z. B. Deus Medical"
                    className={inputClass}
                  />
                </Field>

                <Field label="Preis pro Stück / Flasche / Vial">
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    placeholder="z. B. 45"
                    className={inputClass}
                  />
                </Field>
              </div>

              <button onClick={handleSave} className="w-full bg-primary py-4 rounded-2xl font-semibold">
                {editingCompound ? "Änderungen speichern" : "Substanz hinzufügen"}
              </button>

              <button onClick={() => setShowModal(false)} className="w-full bg-[#111111] py-4 rounded-2xl font-semibold">
                Abbrechen
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
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 bg-[#111111] rounded-2xl font-medium">
                Abbrechen
              </button>

              <button onClick={confirmDelete} className="flex-1 py-4 bg-red-600 rounded-2xl font-medium">
                Ja, löschen
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-white">{label}</label>
      {children}
    </div>
  )
}