"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Settings,
  Syringe,
  Plus,
  Check,
  House,
  CalendarDays,
  Package,
} from "lucide-react"



const weekDays = [
  { day: "FR", date: 2, hasDose: false },
  { day: "SA", date: 3, hasDose: true },
  { day: "SO", date: 4, hasDose: false },
  { day: "MO", date: 5, hasDose: true },
  { day: "DI", date: 6, hasDose: true },
  { day: "MI", date: 7, hasDose: false },
  { day: "DO", date: 8, hasDose: true },
]

const todayDoses = [
  {
    id: 1,
    name: "BPC-157",
    dose: "250 mcg",
    time: "08:00",
  },
  {
    id: 2,
    name: "TB-500",
    dose: "2,5 mg",
    time: "18:00",
  },
]

export default function PeptidesPage() {
    const [selectedDay, setSelectedDay] = useState(5)
    const [loggedDoses, setLoggedDoses] = useState<number[]>([])
    const toggleDose = (id: number) => {
  setLoggedDoses((current) =>
    current.includes(id)
      ? current.filter((doseId) => doseId !== id)
      : [...current, id]
  )
}
return (
  <main className="min-h-screen bg-[#050505] pb-28 text-white">
    <div className="mx-auto max-w-lg px-5 pt-6">

      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            Peptide
          </h1>

          <p className="mt-1 text-sm text-white/40">
            Montag, 5. Oktober
          </p>
        </div>

        <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          <Settings className="h-5 w-5 text-white/70" />
        </button>
      </div>

      {/* MONTH */}
      <div className="mt-9">
        <p className="text-xl font-bold">
          Oktober
        </p>
      </div>

      {/* WEEK CALENDAR */}
      <div className="mt-4 rounded-[30px] border border-white/10 bg-white/[0.035] p-3">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((item) => {
            const active = selectedDay === item.date

            return (
              <button
                key={item.date}
                onClick={() => setSelectedDay(item.date)}
                className="flex flex-col items-center"
              >
                <span
                  className={`mb-2 text-[11px] font-bold ${
                    active
                      ? "text-violet-300"
                      : "text-white/35"
                  }`}
                >
                  {item.day}
                </span>

                <div
                  className={`relative flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    active
                      ? "border-2 border-violet-400 bg-violet-400/10 text-violet-200 shadow-[0_0_22px_rgba(167,139,250,0.20)]"
                      : "bg-white/[0.04] text-white/70"
                  }`}
                >
                  {item.date}

                  {item.hasDose && (
                    <span
                      className={`absolute bottom-1 h-1 w-1 rounded-full ${
                        active
                          ? "bg-violet-300"
                          : "bg-white/35"
                      }`}
                    />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
{/* TODAY DOSES */}
<section className="mt-8">
  <div className="mb-4 flex items-center justify-between">
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300/70">
        Tagesplan
      </p>

      <h2 className="mt-1 text-2xl font-black tracking-tight">
        Heutige Dosis
      </h2>
    </div>

    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/45">
      {loggedDoses.length}/{todayDoses.length}
    </span>
  </div>

  <div className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.055] to-white/[0.025]">
    {todayDoses.map((dose, index) => {
      const logged = loggedDoses.includes(dose.id)

      return (
        <div
          key={dose.id}
          className={`flex items-center gap-3 p-4 ${
            index !== todayDoses.length - 1
              ? "border-b border-white/[0.07]"
              : ""
          }`}
        >
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ${
              logged
                ? "bg-emerald-400/10 text-emerald-300"
                : "bg-violet-400/10 text-violet-300"
            }`}
          >
            {logged ? (
              <Check className="h-5 w-5" />
            ) : (
              <Syringe className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p
              className={`font-black ${
                logged ? "text-white/40 line-through" : "text-white"
              }`}
            >
              {dose.name}
            </p>

            <div className="mt-1 flex items-center gap-2 text-xs text-white/40">
              <span>{dose.dose}</span>
              <span>•</span>
              <span>{dose.time}</span>
            </div>
          </div>

          <button
            onClick={() => toggleDose(dose.id)}
            className={`rounded-2xl border px-4 py-2.5 text-sm font-black transition-all active:scale-95 ${
              logged
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                : "border-violet-400/25 bg-violet-400/10 text-violet-200"
            }`}
          >
            {logged ? "Erledigt" : "Loggen"}
          </button>
        </div>
      )
    })}

    <button className="flex w-full items-center gap-3 border-t border-white/[0.07] p-4 text-left transition-colors hover:bg-white/[0.025]">
      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/[0.05] text-white/45">
        <Plus className="h-5 w-5" />
      </div>

      <div>
        <p className="font-bold text-white/70">
          Einzeldosis loggen
        </p>
        <p className="mt-0.5 text-xs text-white/30">
          Dosis außerhalb eines Protokolls
        </p>
      </div>
    </button>
  </div>
</section>
    </div>
    {/* PEPTIDE BOTTOM NAV */}
<nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#080808]/95 backdrop-blur-xl">
  <div className="mx-auto grid max-w-lg grid-cols-3 px-5 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">

    {/* HOME */}
<Link
  href="/peptides"
  className="flex flex-col items-center gap-1.5 py-2 text-violet-300"
>
  <House className="h-5 w-5" />
  <span className="text-[11px] font-bold">Home</span>
</Link>

<Link
  href="/peptides/protocols"
  className="flex flex-col items-center gap-1.5 py-2 text-white/35"
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