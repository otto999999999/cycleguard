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
  concentration?: number
  concentrationUnit?: string
  packaging?: "Vial" | "Ampulle"
  sizeMl?: number
  currentVials: number
  halfLife?: number
  method: string
  manufacturer?: string
  price?: number
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
    packaging: "" as "" | "Vial" | "Ampulle",
    sizeMl: 10,
    currentVials: 1,
    halfLife: 168,
    method: "IM",
    manufacturer: "",
    price: 0,
  })

  // Compounds nur vom aktuellen User laden
  const loadCompounds = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      setCompounds([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('compounds')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) console.error("Fehler:", error)
    else setCompounds(data || [])
    
    setLoading(false)
  }

  useEffect(() => {
    loadCompounds()
  }, [])

  const handleSave = async () => {
    if (!form.name.trim() || !form.type) {
      alert("Name und Typ sind erforderlich!")
      return
    }
    if (form.type === "Injectable") {
      if (!form.packaging || !form.manufacturer?.trim() || !form.price) {
        alert("Bei Injectable sind Verpackung, Marke und Preis erforderlich!")
        return
      }
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const payload = {
      name: form.name,
      type: form.type,
      concentration: form.concentration,
      concentration_unit: form.concentrationUnit,
      packaging: form.packaging || null,
      size_ml: form.sizeMl,
      current_vials: form.currentVials,
      half_life: form.halfLife,
      method: form.method,
      manufacturer: form.manufacturer || null,
      price: form.price || null,
      user_id: session.user.id
    }

    if (editingCompound) {
      await supabase.from('compounds').update(payload).eq('id', editingCompound.id)
    } else {
      await supabase.from('compounds').insert(payload)
    }

    setShowModal(false)
    loadCompounds()
  }

  const openAddModal = () => {
    setEditingCompound(null)
    setForm({
      name: "", type: "", concentration: 250, concentrationUnit: "mg/ml",
      packaging: "", sizeMl: 10, currentVials: 1, halfLife: 168,
      method: "IM", manufacturer: "", price: 0,
    })
    setShowModal(true)
  }

  const openEditModal = (compound: Compound) => {
    setEditingCompound(compound)
    setForm({
      name: compound.name,
      type: compound.type,
      concentration: compound.concentration || 250,
      concentrationUnit: compound.concentrationUnit || "mg/ml",
      packaging: (compound.packaging as "Vial" | "Ampulle") || "",
      sizeMl: compound.sizeMl || 10,
      currentVials: compound.currentVials,
      halfLife: compound.halfLife || 168,
      method: compound.method,
      manufacturer: compound.manufacturer || "",
      price: compound.price || 0,
    })
    setShowModal(true)
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
    loadCompounds()
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
            <p className="text-muted-foreground mt-3 mb-8">Füge deine ersten Anabolika hinzu</p>
            <button onClick={openAddModal} className="bg-primary px-8 py-4 rounded-2xl font-medium flex items-center gap-2 mx-auto">
              <Plus className="w-5 h-5" /> Neue Substanz hinzufügen
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {compounds.map((c) => (
              <div key={c.id} className="bg-[#0A0A0A] rounded-3xl p-5 border border-border/30">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{c.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {c.concentration} {c.concentrationUnit} • {c.method} • {c.type}
                    </p>
                    {c.manufacturer && <p className="text-xs text-muted-foreground">Marke: {c.manufacturer}</p>}
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-500 font-medium">
                      {c.currentVials} {c.packaging === "Ampulle" ? "Ampullen" : "Vials"}
                    </div>
                    {c.price && <div className="text-sm text-emerald-400">€{c.price}</div>}
                  </div>
                </div>

                <div className="flex gap-2 mt-5">
                  <button onClick={() => openEditModal(c)} className="flex-1 bg-[#111111] py-3 rounded-2xl flex items-center justify-center gap-2">
                    <Pencil className="w-4 h-4" /> Bearbeiten
                  </button>
                  <button onClick={() => handleDeleteClick(c.id)} className="flex-1 bg-red-500/10 text-red-400 py-3 rounded-2xl flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" /> Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={openAddModal} className="fixed bottom-24 right-6 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-2xl">
        <Plus className="w-7 h-7" />
      </button>

      <BottomNav />

      {/* Modal zum Hinzufügen / Bearbeiten */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-end">
          <div className="bg-[#0A0A0A] w-full rounded-t-3xl p-6 max-h-[92vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold mb-6">
              {editingCompound ? "Substanz bearbeiten" : "Neue Substanz hinzufügen"}
            </h2>

            <div className="space-y-6">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-[#111111] rounded-2xl p-4" placeholder="Testosterone Enanthate" />
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Typ <span className="text-red-500">*</span></label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-[#111111] rounded-2xl p-4">
                  <option value="">Bitte auswählen...</option>
                  {compoundTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {form.type === "Injectable" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">Konzentration <span className="text-red-500">*</span></label>
                      <input type="number" value={form.concentration} onChange={(e) => setForm({ ...form, concentration: Number(e.target.value) })} className="w-full bg-[#111111] rounded-2xl p-4" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">Einheit <span className="text-red-500">*</span></label>
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
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">
                        {form.packaging === "Ampulle" ? "Ampulle Größe (ml)" : "Vial Größe (ml)"} <span className="text-red-500">*</span>
                      </label>
                      <input type="number" value={form.sizeMl} onChange={(e) => setForm({ ...form, sizeMl: Number(e.target.value) })} className="w-full bg-[#111111] rounded-2xl p-4" />
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Marke / Hersteller <span className="text-red-500">*</span></label>
                    <input type="text" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="w-full bg-[#111111] rounded-2xl p-4" placeholder="Hersteller / Marke" />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Preis (€) <span className="text-red-500">*</span></label>
                    <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="w-full bg-[#111111] rounded-2xl p-4" placeholder="45.00" />
                  </div>
                </>
              )}

              <button onClick={handleSave} className="w-full bg-primary py-4 rounded-2xl font-semibold">
                {editingCompound ? "Änderungen speichern" : "Substanz hinzufügen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lösch-Bestätigung */}
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