"use client"

import Link from "next/link"
import { ChevronLeft, Dumbbell, HeartPulse, Shield, Sparkles } from "lucide-react"

const cards = [
  {
    title: "Strength",
    subtitle: "Krafttraining, Übungen und PRs",
    stat: "Gym Progress",
    href: "/performance/strength",
    icon: Dumbbell,
    className:
      "border-emerald-400/20 bg-gradient-to-br from-emerald-400/[0.12] to-white/[0.025] shadow-[0_0_40px_rgba(52,211,153,0.12)]",
    iconClass: "bg-emerald-400/12 text-emerald-300",
    badgeClass: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  },
  {
    title: "Combat",
    subtitle: "Kampfsport, Sparring und Technik",
    stat: "Fight Mode",
    href: "/performance/combat",
    icon: Shield,
    className:
      "border-red-400/20 bg-gradient-to-br from-red-500/[0.13] to-white/[0.025] shadow-[0_0_40px_rgba(248,113,113,0.12)]",
    iconClass: "bg-red-500/12 text-red-300",
    badgeClass: "border-red-400/20 bg-red-500/10 text-red-300",
  },
  {
    title: "Cardio",
    subtitle: "Ausdauer, Läufe und Kondition",
    stat: "Conditioning",
    href: "/performance/cardio",
    icon: HeartPulse,
    className:
      "border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.12] to-white/[0.025] shadow-[0_0_40px_rgba(34,211,238,0.12)]",
    iconClass: "bg-cyan-400/12 text-cyan-300",
    badgeClass: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
  },
]

export default function PerformancePage() {
  return (
    <div className="min-h-screen bg-[#050505] text-foreground pb-20">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-120px] left-[-80px] h-[340px] w-[340px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-[220px] right-[-120px] h-[300px] w-[300px] rounded-full bg-red-500/10 blur-3xl" />
        <div className="absolute bottom-[-140px] left-[18%] h-[320px] w-[320px] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition-all hover:bg-white/[0.07] active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>

          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">Performance</h1>
            <p className="text-xs text-muted-foreground">Athlete Mode</p>
          </div>

          <div className="h-10 w-10" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pt-6">
        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-white/[0.015] p-6 shadow-2xl backdrop-blur-xl">
          <div className="absolute right-[-70px] top-[-70px] h-[180px] w-[180px] rounded-full bg-emerald-400/12 blur-3xl" />
          <div className="absolute bottom-[-80px] left-[-50px] h-[160px] w-[160px] rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Athlete Mode aktiviert
            </div>

            <h2 className="text-4xl font-black tracking-tight">
              Track deine
              <span className="block bg-gradient-to-r from-emerald-300 via-cyan-300 to-white bg-clip-text text-transparent">
                Performance.
              </span>
            </h2>

            <p className="mt-4 max-w-[320px] text-sm leading-6 text-muted-foreground">
              Stärke, Kampfsport und Ausdauer getrennt erfassen. Trainingspläne, Workouts und Fortschritt an einem Ort.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-3 text-center">
                <p className="text-lg font-bold text-emerald-300">01</p>
                <p className="text-[10px] text-muted-foreground">Strength</p>
              </div>

              <div className="rounded-2xl border border-red-400/15 bg-red-500/[0.06] p-3 text-center">
                <p className="text-lg font-bold text-red-300">02</p>
                <p className="text-[10px] text-muted-foreground">Combat</p>
              </div>

              <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] p-3 text-center">
                <p className="text-lg font-bold text-cyan-300">03</p>
                <p className="text-[10px] text-muted-foreground">Cardio</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {cards.map((card) => {
            const Icon = card.icon

            return (
              <Link
                key={card.title}
                href={card.href}
                className={`group relative block overflow-hidden rounded-[32px] border p-5 backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] ${card.className}`}
              >
                <div className="absolute right-[-30px] top-[-30px] h-[110px] w-[110px] rounded-full bg-white/[0.035] blur-2xl" />

                <div className="relative flex items-center gap-4">
                  <div
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] ${card.iconClass}`}
                  >
                    <Icon className="h-8 w-8" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-2xl font-black tracking-tight">{card.title}</h3>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${card.badgeClass}`}
                      >
                        {card.stat}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground">{card.subtitle}</p>
                  </div>

                  <span className="text-2xl text-muted-foreground transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </Link>
            )
          })}
        </section>
      </main>
    </div>
  )
}