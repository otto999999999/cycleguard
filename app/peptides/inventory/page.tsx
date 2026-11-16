"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  House,
  Pencil,
  Trash2,
  AlertTriangle,
  CalendarDays,
  Package,
  X,
  Plus,
  Beaker,
} from "lucide-react"

type Vial = {
  id: string
  user_id: string
  name: string
  vial_size_mg: number
  quantity: number
  reconstitution_ml: number
}
export default function PeptideInventoryPage() {
  const [showAddVial, setShowAddVial] = useState(false)
const [peptideName, setPeptideName] = useState("")
const [vialSize, setVialSize] = useState("")
const [quantity, setQuantity] = useState("1")
const [reconstitutionMl, setReconstitutionMl] = useState("")
const [vials, setVials] = useState<Vial[]>([])
const [loading, setLoading] = useState(true)
const [saving, setSaving] = useState(false)
const [editingVial, setEditingVial] = useState<Vial | null>(null)
const [deletingId, setDeletingId] = useState<string | null>(null)

useEffect(() => {
  void loadVials()
}, [])

const loadVials = async () => {
  setLoading(true)

  const { data: { user }, error: authError } =
    await supabase.auth.getUser()

  if (authError || !user) {
    console.error("Nicht angemeldet:", authError)
    setLoading(false)
    return
  }

  const { data, error } = await supabase
    .from("peptide_inventory")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Inventar laden fehlgeschlagen:", error)
  } else {
    setVials((data ?? []) as Vial[])
  }

  setLoading(false)
}

const addVial = async () => {
  if (saving || !peptideName.trim()) return

  const size = Number(vialSize)
  const count = Number(quantity)
  const volume = Number(reconstitutionMl || 0)

  if (!Number.isFinite(size) || size <= 0) return
  if (!Number.isInteger(count) || count < 1) return
  if (!Number.isFinite(volume) || volume < 0) return

  setSaving(true)

  try {
    const { data: { user }, error: authError } =
      await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error("Nicht angemeldet")
    }

    const { error } = await supabase
      .from("peptide_inventory")
      .insert({
        user_id: user.id,
        name: peptideName.trim(),
        vial_size_mg: size,
        quantity: count,
        reconstitution_ml: volume,
      })

    if (error) throw error

    await loadVials()

    setPeptideName("")
    setVialSize("")
    setQuantity("1")
    setReconstitutionMl("")
    setShowAddVial(false)
  } catch (error) {
    console.error("Inventar speichern fehlgeschlagen:", error)
    alert("Speichern fehlgeschlagen. Bitte Konsole prüfen.")
  } finally {
    setSaving(false)
  }
}


const updateVial = async (id: string, updates: Partial<Vial>) => {
  const { data: { user }, error: authError } =
    await supabase.auth.getUser()

  if (authError || !user) {
    alert("Nicht angemeldet")
    return false
  }

  const { error } = await supabase
    .from("peptide_inventory")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    console.error(error)
    alert("Änderung fehlgeschlagen")
    return false
  }

  await loadVials()
  return true
}

const deleteVial = async (id: string) => {
  if (deletingId) return

  const confirmed = window.confirm(
    "Diesen Inventareintrag wirklich löschen?"
  )
  if (!confirmed) return

  setDeletingId(id)

  try {
    const { data: { user }, error: authError } =
      await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error("Nicht angemeldet")
    }

    const { error } = await supabase
      .from("peptide_inventory")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) throw error

    await loadVials()
  } catch (error) {
    console.error(error)
    alert("Löschen fehlgeschlagen")
  } finally {
    setDeletingId(null)
  }
}


const getStockStatus = (quantity: number) => {
  if (quantity === 0) {
    return {
      label: "Leer",
      color: "text-red-400",
      background: "bg-red-400/10 border-red-400/20",
    }
  }

  if (quantity <= 2) {
    return {
      label: "Fast leer",
      color: "text-orange-400",
      background: "bg-orange-400/10 border-orange-400/20",
    }
  }

  return {
    label: "Auf Lager",
    color: "text-emerald-400",
    background: "bg-emerald-400/10 border-emerald-400/20",
  }
}


  return (
    <main className="min-h-screen bg-[#050505] pb-28 text-white">
      {/* PAGE CONTENT */}
      <div className="mx-auto max-w-lg px-5 pt-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300/70">
              Peptide
            </p>

            <h1 className="mt-1 text-3xl font-black tracking-tight">
              Inventar
            </h1>

            <p className="mt-1 text-sm text-white/40">
              Vials und Bestand verwalten
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddVial(true)}
            className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-violet-400/20 bg-violet-400/10 text-violet-300 active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* EMPTY STATE */}
        {vials.length === 0 && (
          <div className="mt-8 rounded-[30px] border border-white/10 bg-gradient-to-b from-white/[0.055] to-white/[0.025] p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-violet-400/10 text-violet-300">
              <Beaker className="h-6 w-6" />
            </div>

            <h2 className="mt-5 text-xl font-black">
              Noch keine Vials
            </h2>

            <p className="mt-2 max-w-[300px] text-sm leading-6 text-white/40">
              Füge deine Vials hinzu, um Bestand und Verbrauch zu verfolgen.
            </p>

            <button
              type="button"
              onClick={() => setShowAddVial(true)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-[20px] border border-violet-400/20 bg-violet-400/10 px-4 py-4 font-black text-violet-200 active:scale-[0.98]"
            >
              <Plus className="h-5 w-5" />
              Vial hinzufügen
            </button>
          </div>
        )}

      

{/* VIAL LIST */}
{vials.length > 0 && (
  <div className="mt-8 space-y-3">
    {vials.map((vial) => {
      const status = getStockStatus(vial.quantity)

      return (
        <div
          key={vial.id}
          className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-violet-400/10 p-3 text-violet-300">
              <Beaker className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold">
                {vial.name}
              </p>
              <p className="mt-1 text-sm text-white/45">
                {vial.vial_size_mg} mg pro Vial
              </p>
            </div>

            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${status.color} ${status.background}`}
            >
              {status.label}
            </span>
          </div>

          {vial.quantity <= 2 && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-orange-400/15 bg-orange-400/[0.06] p-3 text-xs text-orange-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {vial.quantity === 0
                ? "Kein Bestand mehr vorhanden."
                : `Achtung: Nur noch ${vial.quantity} Vial(s) vorhanden.`}
            </div>
          )}

<div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
  <div>
    <p className="text-xs text-white/40">Aktueller Bestand</p>
    <p className="mt-1 text-lg font-bold">
      {vial.quantity} {vial.quantity === 1 ? "Vial" : "Vials"}
    </p>
  </div>

  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => setEditingVial(vial)}
      className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm text-white/70"
    >
      <Pencil className="h-4 w-4" />
      Bearbeiten
    </button>

    <button
      type="button"
      onClick={() => void deleteVial(vial.id)}
      disabled={deletingId === vial.id}
      className="rounded-xl bg-red-400/10 p-3 text-red-400 disabled:opacity-40"
      aria-label="Löschen"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  </div>
</div>
        </div>
      )
    })}
  </div>
)}

      </div>


{editingVial && (
<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-6">
  <div className="w-full max-w-lg max-h-[85dvh] space-y-4 overflow-y-auto overscroll-contain rounded-3xl border border-white/10 bg-[#0b0b0d] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Vial bearbeiten</h2>
        <button
  type="button"
  onClick={() => setEditingVial(null)}
  className="text-white/60 hover:text-white"
>
  <X className="h-5 w-5" />
</button>
      </div>

      <label className="block text-sm text-white/60">
        Name
        <input
          value={editingVial.name}
          onChange={(e) =>
            setEditingVial({ ...editingVial, name: e.target.value })
          }
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
        />
      </label>

      <label className="block text-sm text-white/60">
        Vial-Größe (mg)
        <input
          type="number"
          min="0.01"
          step="any"
          value={editingVial.vial_size_mg}
          onChange={(e) =>
            setEditingVial({
              ...editingVial,
              vial_size_mg: Number(e.target.value),
            })
          }
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
        />
      </label>

      <label className="block text-sm text-white/60">
        Anzahl
        <input
          type="number"
          min="0"
          step="1"
          value={editingVial.quantity}
          onChange={(e) =>
            setEditingVial({
              ...editingVial,
              quantity: Number(e.target.value),
            })
          }
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
        />
      </label>

      <label className="block text-sm text-white/60">
        Rekonstitutionsvolumen (ml)
        <input
          type="number"
          min="0"
          step="any"
          value={editingVial.reconstitution_ml}
          onChange={(e) =>
            setEditingVial({
              ...editingVial,
              reconstitution_ml: Number(e.target.value),
            })
          }
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
        />
      </label>

      <button
        disabled={
          saving ||
          !editingVial.name.trim() ||
          !Number.isFinite(editingVial.vial_size_mg) ||
          editingVial.vial_size_mg <= 0 ||
          !Number.isInteger(editingVial.quantity) ||
          editingVial.quantity < 0 ||
          !Number.isFinite(editingVial.reconstitution_ml) ||
          editingVial.reconstitution_ml < 0
        }
        onClick={async () => {
          if (!editingVial || saving) return
          setSaving(true)

          try {
            const success = await updateVial(editingVial.id, {
              name: editingVial.name.trim(),
              vial_size_mg: editingVial.vial_size_mg,
              quantity: editingVial.quantity,
              reconstitution_ml: editingVial.reconstitution_ml,
            })

            if (success) setEditingVial(null)
          } finally {
            setSaving(false)
          }
        }}
        className="w-full rounded-xl p-4 font-bold disabled:opacity-40"
style={{
  backgroundColor: "#a78bfa",
  color: "#000000",
}}
      >
        {saving ? "Speichere..." : "Änderungen speichern"}
      </button>
    </div>
  </div>
)}



      {/* ADD VIAL MODAL */}
      {showAddVial && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-t-[32px] border border-white/10 bg-[#0b0b0d] p-5">
            {/* MODAL HEADER */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300/70">
                  Inventar
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Vial hinzufügen
                </h2>

                <p className="mt-1 text-sm text-white/40">
                  Neues Peptid zu deinem Bestand hinzufügen
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddVial(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/50 active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* FORM */}
            <div className="mt-6 space-y-4">
              {/* PEPTIDE */}
              <div>
                <label className="mb-2 block text-xs font-bold text-white/50">
                  PEPTID
                </label>

                <input
                  value={peptideName}
                  onChange={(e) => setPeptideName(e.target.value)}
                  placeholder="z. B. BPC-157"
                  className="w-full rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-white/20 focus:border-violet-400/40"
                />
              </div>

              {/* VIAL SIZE + AMOUNT */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-xs font-bold text-white/50">
                    VIAL-GRÖSSE
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      placeholder="5"
                      value={vialSize}
onChange={(e) => setVialSize(e.target.value)}
                      className="w-full rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4 pr-12 text-white outline-none placeholder:text-white/20 focus:border-violet-400/40"
                    />

                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/30">
                      mg
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-white/50">
                    ANZAHL
                  </label>

<input
  type="number"
  min="1"
  value={quantity}
  onChange={(e) => setQuantity(e.target.value)}
  placeholder="1"
  className="w-full rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-white/20 focus:border-violet-400/40"
/>
                </div>
              </div>

              {/* RECONSTITUTION */}
              <div>
                <label className="mb-2 block text-xs font-bold text-white/50">
                  REKONSTITUIERT MIT
                </label>

                <div className="relative">
<input
  type="number"
  step="0.1"
  value={reconstitutionMl}
  onChange={(e) => setReconstitutionMl(e.target.value)}
  placeholder="2.0"
  className="w-full rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4 pr-12 text-white outline-none placeholder:text-white/20 focus:border-violet-400/40"
/>

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/30">
                    ml
                  </span>
                </div>
              </div>
            </div>

            {/* ADD BUTTON */}
            <button
              type="button"
              onClick={addVial}
              disabled={saving || !peptideName.trim()}
              className="mt-6 w-full rounded-[20px] bg-violet-400 py-4 font-black text-black transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
            >
              Vial hinzufügen
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto grid max-w-lg grid-cols-3 px-5 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
          <Link
            href="/peptides"
            className="flex flex-col items-center gap-1.5 py-2 text-white/35"
          >
            <House className="h-5 w-5" />
            <span className="text-[11px] font-bold">
              Home
            </span>
          </Link>

          <Link
            href="/peptides/protocols"
            className="flex flex-col items-center gap-1.5 py-2 text-white/35"
          >
            <CalendarDays className="h-5 w-5" />
            <span className="text-[11px] font-bold">
              Protokolle
            </span>
          </Link>

          <Link
            href="/peptides/inventory"
            className="flex flex-col items-center gap-1.5 py-2 text-violet-300"
          >
            <Package className="h-5 w-5" />
            <span className="text-[11px] font-bold">
              Inventar
            </span>
          </Link>
        </div>
      </nav>
    </main>
  )
}