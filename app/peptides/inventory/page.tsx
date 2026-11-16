"use client"

import Link from "next/link"
import { useState } from "react"
import {
  House,
  CalendarDays,
  Package,
  X,
  Plus,
  Beaker,
} from "lucide-react"

type Vial = {
  name: string
  vialSizeMg: number
  quantity: number
  reconstitutionMl: number
}
export default function PeptideInventoryPage() {
  const [showAddVial, setShowAddVial] = useState(false)
const [peptideName, setPeptideName] = useState("")
const [vialSize, setVialSize] = useState("")
const [quantity, setQuantity] = useState("1")
const [reconstitutionMl, setReconstitutionMl] = useState("")
const [vials, setVials] = useState<Vial[]>([])

const addVial = () => {
  if (!peptideName.trim()) return
  if (!vialSize || Number(vialSize) <= 0) return
  if (!quantity || Number(quantity) <= 0) return

  const newVial: Vial = {
    name: peptideName.trim(),
    vialSizeMg: Number(vialSize),
    quantity: Number(quantity),
    reconstitutionMl: Number(reconstitutionMl || 0),
  }

  setVials((current) => [...current, newVial])

  setPeptideName("")
  setVialSize("")
  setQuantity("1")
  setReconstitutionMl("")

  setShowAddVial(false)
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
            {vials.map((vial, index) => (
              <div
                key={`${vial.name}-${index}`}
                className="rounded-[26px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.025] p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-violet-400/10 text-violet-300">
                    <Beaker className="h-6 w-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-black">
                      {vial.name}
                    </p>

<p className="mt-1 text-sm text-white/45">
  {vial.vialSizeMg} mg pro Vial · {vial.quantity}{" "}
  {vial.quantity === 1 ? "Vial" : "Vials"}
</p>

{vial.reconstitutionMl > 0 && (
  <p className="mt-1 text-xs text-white/30">
    Rekonstituiert mit {vial.reconstitutionMl} ml
  </p>
)}
                  </div>

                  <span className="shrink-0 rounded-full border border-emerald-400/15 bg-emerald-400/[0.08] px-3 py-1.5 text-xs font-bold text-emerald-300">
                    Auf Lager
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
              disabled={!peptideName.trim()}
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