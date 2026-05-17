"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  List,
  Calendar,
  BarChart3,
  ShoppingCart,
  Syringe,
} from "lucide-react"

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/compounds", label: "Stack", icon: List },
  { href: "/cycle", label: "Cycle", icon: Calendar },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/einkauf", label: "Shop", icon: ShoppingCart },
  { href: "/logging", label: "Log", icon: Syringe },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-4 left-0 right-0 z-50 px-4">
      <div className="mx-auto max-w-lg rounded-[28px] border border-white/10 bg-black/70 px-2 py-2 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-2xl px-2 py-2 text-[10px] font-medium transition-all duration-300 ease-out ${
                  isActive
                    ? "bg-white text-black shadow-lg"
                    : "text-zinc-500 hover:bg-white/5 hover:text-white"
                }`}
              >
                {isActive && (
                  <div className="absolute -top-1 h-1 w-8 rounded-full bg-white" />
                )}

                <Icon
                  className={`mb-1 h-5 w-5 transition-transform duration-200 ${
                    isActive ? "scale-110 -translate-y-[2px]" : ""
                  }`}
                />

                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}