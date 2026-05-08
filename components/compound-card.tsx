"use client"

import { Droplet, Pill, Shield, Zap } from "lucide-react"

type CompoundType = "injectable" | "oral" | "ai" | "ancillary"

interface CompoundCardProps {
  name: string
  dosage: string
  frequency: string
  stockRemaining: number
  totalStock: number
  daysLeft: number
  type: CompoundType
}

const typeConfig: Record<CompoundType, { icon: typeof Droplet; color: string }> = {
  injectable: { icon: Droplet, color: "text-primary" },
  oral: { icon: Pill, color: "text-primary" },
  ai: { icon: Shield, color: "text-primary" },
  ancillary: { icon: Zap, color: "text-primary" },
}

export function CompoundCard({
  name,
  dosage,
  frequency,
  stockRemaining,
  totalStock,
  daysLeft,
  type,
}: CompoundCardProps) {
  const { icon: Icon, color } = typeConfig[type]
  const stockPercentage = (stockRemaining / totalStock) * 100
  const isLowStock = stockPercentage < 25
  
  return (
    <div className="bg-card rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
          isLowStock 
            ? "bg-destructive/20 text-destructive" 
            : "bg-primary/10 text-primary"
        }`}>
          {isLowStock ? "Wenig Vorrat" : "Vorrätig"}
        </span>
      </div>
      
      <h3 className="text-sm font-medium text-foreground mb-0.5 leading-tight">{name}</h3>
      <p className="text-xs text-muted-foreground mb-3">
        {dosage} <span className="text-muted-foreground/60">• {frequency}</span>
      </p>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground uppercase tracking-wider">Vorrat</span>
          <span className="text-foreground font-medium">{Math.round(stockPercentage)}%</span>
        </div>
        <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
              isLowStock ? "bg-destructive" : "bg-primary"
            }`}
            style={{ width: `${stockPercentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{stockRemaining} Einheiten</span>
          <span>{daysLeft} Tage verbleibend</span>
        </div>
      </div>
    </div>
  )
}
