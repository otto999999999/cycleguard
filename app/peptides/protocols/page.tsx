"use client"

import Link from "next/link"
import {
  House,
  CalendarDays,
  Package,
  Plus,
  ChevronRight,
} from "lucide-react"

export default function PeptideProtocolsPage() {
  return (
    <main className="min-h-screen bg-[#050505] pb-28 text-white">
      <div className="mx-auto max-w-lg px-5 pt-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300/70">
              Peptide
            </p>

            <h1 className="mt-1 text-3xl font-black tracking-tight">
              Protokolle
            </h1>

            <p className="mt-1 text-sm text-white/40">
              Deine aktiven und geplanten Protokolle
            </p>
          </div>

          <button className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-violet-400/20 bg-violet-400/10 text-violet-300">
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* EMPTY STATE */}
        <div className="mt-8 rounded-[30px] border border-white/10 bg-gradient-to-b from-white/[0.055] to-white/[0.025] p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-violet-400/10 text-violet-300">
            <CalendarDays className="h-6 w-6" />
          </div>

          <h2 className="mt-5 text-xl font-black">
            Noch keine Protokolle
          </h2>

          <p className="mt-2 max-w-[300px] text-sm leading-6 text-white/40">
            Erstelle ein Protokoll, um geplante Dosen automatisch in deinem
            Kalender anzuzeigen.
          </p>

          <button className="mt-5 flex w-full items-center justify-between rounded-[20px] border border-violet-400/20 bg-violet-400/10 px-4 py-4 text-violet-200">
            <span className="font-black">
              Neues Protokoll
            </span>

            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto grid max-w-lg grid-cols-3 px-5 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">

          <Link
            href="/peptides"
            className="flex flex-col items-center gap-1.5 py-2 text-white/35"
          >
            <House className="h-5 w-5" />
            <span className="text-[11px] font-bold">Home</span>
          </Link>

          <Link
            href="/peptides/protocols"
            className="flex flex-col items-center gap-1.5 py-2 text-violet-300"
          >
            <CalendarDays className="h-5 w-5" />
            <span className="text-[11px] font-bold">Protokolle</span>
          </Link>

          <Link
            href="/peptides/inventory"
            className="flex flex-col items-center gap-1.5 py-2 text-white/35"
          >
            <Package className="h-5 w-5" />
            <span className="text-[11px] font-bold">Inventar</span>
          </Link>

        </div>
      </nav>
    </main>
  )
}