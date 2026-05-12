"use client"

import Link from "next/link"
import { Home, List, Calendar, BarChart3, ShoppingCart, Syringe } from "lucide-react"

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-border/30 z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2">
        
        <Link href="/" className="flex flex-col items-center py-1 px-3 text-muted-foreground hover:text-foreground transition-colors">
          <Home className="w-6 h-6" />
          <span className="text-[10px] mt-1">Dashboard</span>
        </Link>

        <Link href="/compounds" className="flex flex-col items-center py-1 px-3 text-muted-foreground hover:text-foreground transition-colors">
          <List className="w-6 h-6" />
          <span className="text-[10px] mt-1">Substanzen</span>
        </Link>

        <Link href="/cycle" className="flex flex-col items-center py-1 px-3 text-muted-foreground hover:text-foreground transition-colors">
          <Calendar className="w-6 h-6" />
          <span className="text-[10px] mt-1">Cycle</span>
        </Link>

        <Link href="/stats" className="flex flex-col items-center py-1 px-3 text-muted-foreground hover:text-foreground transition-colors">
          <BarChart3 className="w-6 h-6" />
          <span className="text-[10px] mt-1">Statistik</span>
        </Link>

        <Link href="/einkauf" className="flex flex-col items-center py-1 px-3 text-muted-foreground hover:text-foreground transition-colors">
          <ShoppingCart className="w-6 h-6" />
          <span className="text-[10px] mt-1">Einkauf</span>
        </Link>

        <Link href="/logging" className="flex flex-col items-center py-1 px-3 text-muted-foreground hover:text-foreground transition-colors">
          <Syringe className="w-6 h-6" />   {/* Import Syringe von lucide-react */}
          <span className="text-[10px] mt-1">Log</span>
        </Link>

      </div>
    </nav>
  )
}