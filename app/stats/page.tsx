"use client"

import { BottomNav } from "@/components/bottom-nav"

export default function StatsPage() {
  return (
    <div className="min-h-screen bg-[#050505] pb-32">
      <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-lg border-b border-border/20 px-5 py-4">
        <h1 className="text-2xl font-bold">Statistik</h1>
      </header>

      <div className="p-5">
        <div className="bg-[#0A0A0A] rounded-3xl p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Statistiken kommen bald</h2>
          <p className="text-muted-foreground">Hier siehst du später:</p>
          <ul className="text-left mt-8 space-y-2 text-sm">
            <li>• Gesamtdosis pro Substanz</li>
            <li>• Injektions-Statistiken (rechts/links)</li>
            <li>• Fortschritt im Cycle</li>
            <li>• Gewicht &amp; Blutwerte Trend</li>
          </ul>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}