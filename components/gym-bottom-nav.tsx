"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Dumbbell, BarChart3, Clock3 } from "lucide-react"

const navItems = [
  {
    href: "/performance/strength",
    label: "Training",
    icon: Dumbbell,
  },
  {
    href: "/performance/progress",
    label: "Fortschritt",
    icon: BarChart3,
  },
  {
    href: "/performance/cooldown",
    label: "Cooldown",
    icon: Clock3,
  },
]

type Props = {
  active?: "training" | "progress" | "cooldown"
}

export default function GymBottomNav({ active }: Props) {
  const pathname = usePathname()

  const isItemActive = (href: string) => {
    if (href === "/performance/strength") {
      return active === "training" || pathname === href
    }

    if (href === "/performance/progress") {
      return active === "progress" || pathname.startsWith(href)
    }

    if (href === "/performance/cooldown") {
      return active === "cooldown" || pathname.startsWith(href)
    }

    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-4 left-0 right-0 z-50 px-4">
      <div className="mx-auto max-w-lg rounded-[28px] border border-white/10 bg-black/70 px-2 py-2 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = isItemActive(item.href)

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