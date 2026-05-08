"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, PenLine, FlaskConical, ShoppingCart, BarChart3, RotateCw } from "lucide-react"

const navItems = [
  { id: "dashboard", label: "Übersicht", icon: LayoutDashboard, href: "/" },
  { id: "logging", label: "Eintragen", icon: PenLine, href: "/logging" },
  { id: "compounds", label: "Substanzen", icon: FlaskConical, href: "/compounds" },
  { id: "cycle", label: "Cycle", icon: RotateCw, href: "/cycle" },           // ← NEUER TAB
  { id: "shopping", label: "Einkauf", icon: ShoppingCart, href: "/shopping" },
  { id: "stats", label: "Statistik", icon: BarChart3, href: "/stats" },
]

export function BottomNav() {
  const pathname = usePathname()
  
  const getIsActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-lg border-t border-border/50 px-1 pb-safe">
      <div className="max-w-lg mx-auto">
        <ul className="flex items-center justify-around py-1.5">
          {navItems.map(({ id, label, icon: Icon, href }) => {
            const isActive = getIsActive(href)
            
            return (
              <li key={id}>
                <Link
                  href={href}
                  className={`
                    flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all active:scale-95
                    ${isActive 
                      ? "text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  <div className={`
                    p-1.5 rounded-lg transition-all
                    ${isActive ? "bg-primary/20" : ""}
                  `}>
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.25 : 1.75} />
                  </div>
                  <span className="text-[10px] font-medium tracking-tight">{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}