"use client"

import Link from "next/link"
import { ChevronLeft, HeartPulse } from "lucide-react"

export default function CardioPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-foreground">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <Link href="/performance" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">Cardio</h1>
          <div className="h-10 w-10" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pt-6">
        <div className="rounded-[32px] border border-cyan-400/20 bg-cyan-400/[0.06] p-6 shadow-[0_0_32px_rgba(34,211,238,0.10)]">
          <HeartPulse className="h-8 w-8 text-cyan-400" />
          <h2 className="mt-4 text-2xl font-bold">Cardio kommt als Nächstes</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Hier kommen später Läufe, Fahrrad, Dauer, Distanz, Kalorien und Kondition rein.
          </p>
        </div>
      </main>
    </div>
  )
}