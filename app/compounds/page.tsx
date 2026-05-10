"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, Pencil, Plus, Syringe, Trash2 } from "lucide-react"
import Link from "next/link"
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
  method?: "IM" | "SubQ" | null
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
    method: "IM" as "IM" | "SubQ",
    manufacturer: "",
    price: 0,
  })

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
      manufacturer: "",
      price: 0,
    })
  }

  const openAddModal = () => {
    setEditingCompound(null)
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (compound: Compound) => {
    setEditingCompound(compound)
    setForm({
      name: compound.name || "",
      type: compound.type || "",
      concentration: compound.concentration ?? 250,
      concentrationUnit: compound.concentration_unit || "mg/ml",
      packaging: compound.packaging || "",
      sizeMl: compound.size_ml ?? 10,
      currentVials: compound.current_vials ?? 0,
      currentAmpoules: compound.current_ampoules ?? 0,
      method: compound.method || "IM",
      manufacturer: compound.manufacturer || "",
      price: compound.price ?? 0,
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

    const isInjectable = form.type === "Injectable"

    const payload: any = {
      name: form.name.trim(),
      type: form.type,
      concentration: isInjectable ? form.concentration : null,
      concentration_unit: isInjectable ? form.concentrationUnit : null,
      packaging: isInjectable ? form.packaging || null : null,
      size_ml: isInjectable ? form.sizeMl : null,
      current_vials: isInjectable && form.packaging === "Vial" ? form.currentVials : 0,
      current_ampoules: isInjectable && form.packaging === "Ampulle" ? form.currentAmpoules : 0,
      manufacturer: isInjectable ? form.manufacturer.trim() || null : null,
      price: isInjectable ? form.price || null : null,
      method: isInjectable ? form.method : null,
      user_id: session.user.id,
    }

    console.log("Speichere Compound:", payload)

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

      alert("✅ Gespeichert!")
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

    if (!session) {
      alert("Du bist nicht eingeloggt.")
      return
    }

    try {
      const { error } = await supabase
        .from("compounds")
        .delete()
        .eq("id", compoundToDelete)
        .eq("user_id", session.user.id)

      if (error) throw error

      setShowDeleteConfirm(false)
      setCompoundToDelete(null)
      await loadCompounds()
    } catch (error: any) {
      alert("Fehler beim Löschen: " + error.message)
    }
  }

  const getStockInfo = (c: Compound) => {
    const count =
      c.packaging === "Vial"
        ? c.current_vials ?? 0
        : c.current_ampoules ?? 0

    const unit =
      c.packaging === "Vial"
        ? count === 1
          ? "Vial"
          : "Vials"
        : count === 1
          ? "Ampulle"
          : "Ampullen"

    let stockColor = "text-emerald-400"
    if (count === 0) stockColor = "text-red-500"
    else if (count === 1) stockColor = "text-orange-400"

    return { count, unit, stockColor }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-foreground pb-24">
      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-lg border-b border-border/20">
        <div className="flex items-center justify-between px-5 py-4">
          <Link
            href="/"
            className="w-10 h-10 rounded-xl bg-[#0A0A0A] flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          <h1 className="text-xl font-semibold">Substanzen</h1>

          <div className="w-10" />
        </div>
      </header>

      <div className="px-5 pt-6">
        {loading ? (
          <p className="text-center text-muted-foreground py-20">
            Lade Substanzen...
          </p>
        ) : compounds.length === 0 ? (
          <div className="text-center py-20">
            <Syringe className="w-20 h-20 mx-auto text-muted-foreground mb-6" />
            <h2 className="text-2xl font-medium">Keine Substanzen</h2>
            <p className="text-muted-foreground mt-3 mb-8">
              Füge deine ersten Substanzen hinzu
            </p>

            <button
              onClick={openAddModal}
              className="bg-primary px-8 py-4 rounded-2xl font-medium flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Neue Substanz hinzufügen
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {compounds.map((c) => {
              const { count, unit, stockColor } = getStockInfo(c)

              return (
                <div
                  key={c.id}
                  className="bg-[#0A0A0A] rounded-3xl p-5 border border-border/30"
                >
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {c.name}
                      </h3>

                      <p className="text-sm text-blue-400">
                        {c.type === "Injectable"
                          ? `${c.concentration ?? "-"} ${c.concentration_unit ?? ""} • ${c.packaging ?? "-"} ${c.size_ml ?? "-"}ml • ${c.method ?? "-"}`
                          : c.type}
                      </p>

                      {c.type === "Injectable" && (
                        <p className={`font-medium mt-1 ${stockColor}`}>
                          {count} {unit} in Stock
                          {c.price ? ` • €${c.price} pro Stk.` : ""}
                        </p>
                      )}

                      {c.manufacturer && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {c.manufacturer}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-3 bg-[#111111] rounded-2xl"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => handleDeleteClick(c.id)}
                        className="p-3 bg-red-500/10 text-red-400 rounded-2xl"
                      >
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

      <button
        onClick={openAddModal}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-2xl z-50"
      >
        <Plus className="w-7 h-7" />
      </button>

      <BottomNav />

      {showModal && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-end">
          <div className="bg-[#0A0A0A] w-full rounded-t-3xl p-6 max-h-[92vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold mb-6">
              {editingCompound
                ? "Substanz bearbeiten"
                : "Neue Substanz hinzufügen"}
            </h2>

            <div className="space-y-6">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="w-full bg-[#111111] rounded-2xl p-4"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Typ <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value })
                  }
                  className="w-full bg-[#111111] rounded-2xl p-4"
                >
                  <option value="">Bitte auswählen...</option>
                  {compoundTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {form.type === "Injectable" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">
                        Konzentration
                      </label>
                      <input
                        type="number"
                        value={form.concentration}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            concentration: Number(e.target.value),
                          })
                        }
                        className="w-full bg-[#111111] rounded-2xl p-4"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">
                        Einheit
                      </label>
                      <select
                        value={form.concentrationUnit}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            concentrationUnit: e.target.value,
                          })
                        }
                        className="w-full bg-[#111111] rounded-2xl p-4"
                      >
                        <option value="mg/ml">mg/ml</option>
                        <option value="mcg/ml">mcg/ml</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">
                      Verpackung
                    </label>
                    <select
                      value={form.packaging}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          packaging: e.target.value as
                            | ""
                            | "Vial"
                            | "Ampulle",
                        })
                      }
                      className="w-full bg-[#111111] rounded-2xl p-4"
                    >
                      <option value="">Bitte auswählen...</option>
                      <option value="Vial">Vial</option>
                      <option value="Ampulle">Ampulle</option>
                    </select>
                  </div>

                  {form.packaging && (
                    <>
                      <div>
                        <label className="text-sm text-muted-foreground block mb-1">
                          Anzahl der{" "}
                          {form.packaging === "Vial" ? "Vials" : "Ampullen"}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={
                            form.packaging === "Vial"
                              ? form.currentVials
                              : form.currentAmpoules
                          }
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0

                            if (form.packaging === "Vial") {
                              setForm({ ...form, currentVials: val })
                            } else {
                              setForm({ ...form, currentAmpoules: val })
                            }
                          }}
                          className="w-full bg-[#111111] rounded-2xl p-4"
                        />
                      </div>

                      <div>
                        <label className="text-sm text-muted-foreground block mb-1">
                          Größe pro {form.packaging} (ml)
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={form.sizeMl}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              sizeMl: Number(e.target.value),
                            })
                          }
                          className="w-full bg-[#111111] rounded-2xl p-4"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">
                      Injektionsmethode
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, method: "IM" })}
                        className={`flex-1 py-4 rounded-2xl font-medium transition-all ${
                          form.method === "IM"
                            ? "bg-primary text-white"
                            : "bg-[#111111]"
                        }`}
                      >
                        IM
                      </button>

                      <button
                        type="button"
                        onClick={() => setForm({ ...form, method: "SubQ" })}
                        className={`flex-1 py-4 rounded-2xl font-medium transition-all ${
                          form.method === "SubQ"
                            ? "bg-primary text-white"
                            : "bg-[#111111]"
                        }`}
                      >
                        SubQ
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">
                      Marke / Hersteller
                    </label>
                    <input
                      type="text"
                      value={form.manufacturer}
                      onChange={(e) =>
                        setForm({ ...form, manufacturer: e.target.value })
                      }
                      className="w-full bg-[#111111] rounded-2xl p-4"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">
                      Preis (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={(e) =>
                        setForm({ ...form, price: Number(e.target.value) })
                      }
                      className="w-full bg-[#111111] rounded-2xl p-4"
                    />
                  </div>
                </>
              )}

              <button
                onClick={handleSave}
                className="w-full bg-primary py-4 rounded-2xl font-semibold"
              >
                {editingCompound
                  ? "Änderungen speichern"
                  : "Substanz hinzufügen"}
              </button>

              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingCompound(null)
                }}
                className="w-full bg-[#111111] py-4 rounded-2xl font-semibold"
              >
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

            <p className="text-muted-foreground mb-8">
              Das kann nicht rückgängig gemacht werden.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setCompoundToDelete(null)
                }}
                className="flex-1 py-4 bg-[#111111] rounded-2xl font-medium"
              >
                Abbrechen
              </button>

              <button
                onClick={confirmDelete}
                className="flex-1 py-4 bg-red-600 rounded-2xl font-medium"
              >
                Ja, löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}