"use client"

import Link from "next/link"
import { ChevronLeft, Shield } from "lucide-react"

export default function CombatPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-foreground">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <Link href="/performance" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">Combat</h1>
          <div className="h-10 w-10" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pt-6">
        <div className="rounded-[32px] border border-red-400/20 bg-red-500/[0.06] p-6 shadow-[0_0_32px_rgba(248,113,113,0.10)]">
          <Shield className="h-8 w-8 text-red-400" />
          <h2 className="mt-4 text-2xl font-bold">Combat kommt als Nächstes</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Hier kommen später Kickboxen, Sparring, Techniktraining, Dauer und Intensität rein.
          </p>
        </div>
      </main>
    </div>
  )
}