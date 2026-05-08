"use client"

import { Activity } from "lucide-react"

interface CycleStatusProps {
  currentWeek: number
  totalWeeks: number
  cycleName?: string
}

export function CycleStatus({ currentWeek, totalWeeks, cycleName = "Anfänger Aufbau" }: CycleStatusProps) {
  const progress = (currentWeek / totalWeeks) * 100
  
  return (
    <div className="bg-card rounded-xl p-5 mb-5 border border-border/50">
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Aktueller Zyklus</span>
          <h2 className="text-lg font-semibold text-foreground mt-1">{cycleName}</h2>
        </div>
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Activity className="w-5 h-5 text-primary" />
        </div>
      </div>
      
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-3xl font-bold text-foreground">Woche {currentWeek}</span>
        <span className="text-muted-foreground">von {totalWeeks}</span>
      </div>
      
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>Begonnen 10. März</span>
        <span>{totalWeeks - currentWeek} Wochen verbleibend</span>
      </div>
    </div>
  )
}
