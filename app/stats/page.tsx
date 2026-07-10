"use client"

import { useEffect, useState } from "react"
import { BottomNav } from "@/components/bottom-nav"
import { supabase } from "@/lib/supabase"
import {
  calculateRemainingAmount,
  getHoursPassed,
} from "@/lib/halfLife"
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts"

interface Compound {
  id: string
  name: string
  half_life_hours?: number | null
}

interface Dose {
  id: string
  compound_id: string
  menge: number
  taken_at?: string | null
}

export default function StatsPage() {
  const [levels, setLevels] = useState<
    {
      name: string
      amount: number
      halfLife: number
    }[]
  >([])
  const [lastUpdated, setLastUpdated] = useState("")
  const [chartData, setChartData] = useState<any[]>([])
  const [hiddenCompounds, setHiddenCompounds] = useState<string[]>([])
  const [fullscreenChart, setFullscreenChart] = useState(false)
  const [rangeHours, setRangeHours] = useState(168)
  const [loading, setLoading] = useState(true)


const currentValue =
  chartData[chartData.length - 1]?.level || 0
useEffect(() => {
  loadStats()

  const interval = setInterval(() => {
    loadStats()
  }, 30000)

  return () => clearInterval(interval)
}, [rangeHours])

const formatMg = (value: number) => {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: value < 10 ? 1 : 0,
    maximumFractionDigits: 2,
  })
}


const toggleCompound = (name: string) => {
  setHiddenCompounds((prev) =>
    prev.includes(name)
      ? prev.filter((n) => n !== name)
      : [...prev, name]
  )
}

  const loadStats = async () => {
    setLoading(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setLevels([])
      setChartData([])
      setLoading(false)
      return
    }

    const { data: compounds } = await supabase
      .from("compounds")
      .select("*")
      .eq("user_id", session.user.id)

    const { data: logs } = await supabase
      .from("doses")
      .select("*")
      .eq("user_id", session.user.id)

    const activeMap: Record<
      string,
      {
        amount: number
        halfLife: number
      }
    > = {}

    for (const log of (logs || []) as Dose[]) {
      const compound = (compounds || []).find(
        (c: Compound) => c.id === log.compound_id
      )

      if (!compound?.half_life_hours) continue
      if (!log.taken_at) continue

      const hours = getHoursPassed(log.taken_at)

      const remaining = calculateRemainingAmount(
        Number(log.menge),
        Number(compound.half_life_hours),
        hours
      )

      if (!activeMap[compound.name]) {
        activeMap[compound.name] = {
          amount: 0,
          halfLife: Number(compound.half_life_hours),
        }
      }

      activeMap[compound.name].amount += remaining
    }

    setLevels(
      Object.entries(activeMap)
        .map(([name, data]) => ({
          name,
          amount: Number(data.amount.toFixed(2)),
          halfLife: data.halfLife,
        }))
        .sort((a, b) => b.amount - a.amount)
    )

    const points: any[] = []

    for (let i = rangeHours; i >= 0; i -= 2) {
      const now = new Date()

      now.setHours(now.getHours() - i)

      const point: any = {
        time:
          now.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
          }) +
          " " +
          now.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          }),
      }

      for (const compound of (compounds || []) as Compound[]) {
        if (!compound.half_life_hours) continue

        let total = 0

        for (const log of (logs || []) as Dose[]) {
          if (log.compound_id !== compound.id) continue
          if (!log.taken_at) continue

          const hoursAgo =
            (new Date(now).getTime() -
              new Date(log.taken_at).getTime()) /
            (1000 * 60 * 60)

          if (hoursAgo < 0) continue

          total += calculateRemainingAmount(
            Number(log.menge),
            Number(compound.half_life_hours),
            hoursAgo
          )
        }

        point[compound.name] = Number(total.toFixed(2))
      }

      points.push(point)
    }

    setChartData(points)

    setLastUpdated(
      new Date().toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    )
    setLoading(false)
  }
    const chartColors = [
      "#34d399",
      "#60a5fa",
      "#f59e0b",
      "#a78bfa",
      "#f87171",
      "#22d3ee",
      "#f472b6",
    ]


  return (
    <div className="min-h-screen bg-[#050505] pb-32">
      <header className="sticky top-0 z-50 border-b border-border/20 bg-black/60 px-5 py-4 backdrop-blur-lg">
        <h1 className="text-2xl font-bold">Statistik</h1>
      </header>

      <div className="space-y-5 p-5">
        <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#101010] to-[#080808] p-5 shadow-xl">
          <div className="mb-5">
            <p className="text-sm text-muted-foreground">
              Verlauf
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Active Levels
              <p className="mt-2 text-xs text-muted-foreground">
  Zuletzt aktualisiert: {lastUpdated || "--"}
</p>
            </h2>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
  {[
    { label: "24H", value: 24 },
    { label: "7D", value: 168 },
    { label: "14D", value: 336 },
    { label: "30D", value: 720 },
  ].map((item) => (
    <button
      key={item.value}
      onClick={() => setRangeHours(item.value)}
      className={`rounded-2xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
        rangeHours === item.value
          ? "bg-emerald-400 text-black"
          : "border border-white/10 bg-white/[0.03]"
      }`}
    >
      {item.label}
    </button>
  ))}
</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {levels.map((item, index) => (
                
                <button
                  key={item.name}
                  onClick={() => toggleCompound(item.name)}
                  className={`flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm transition-all duration-200 ${
                    hiddenCompounds.includes(item.name)
                      ? "bg-white/[0.02] opacity-40"
                      : "bg-white/[0.03]"
                  }`}
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      background:
                        chartColors[index % chartColors.length],
                    }}
                  />

                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>

<div
  className="relative h-[260px] cursor-pointer"
  onClick={() => setFullscreenChart(true)}
>
  {loading && (
  <div className="absolute right-4 top-4 z-20 rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-muted-foreground backdrop-blur-md">
    Aktualisiere...
  </div>
)}
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="time"
                  stroke="#666"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#666"
                  tickLine={false}
                  axisLine={false}
                  domain={[0, "auto"]}
                />

                <Tooltip
  contentStyle={{
    background: "#0A0A0A",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
  }}
/>
{levels
  .filter((item) => !hiddenCompounds.includes(item.name))
  .map((item, index) => {
    const currentValue =
      chartData[chartData.length - 1]?.[item.name] ?? 0

    if (!currentValue) return null

    return (
      <ReferenceLine
        key={`ref-${item.name}`}
        y={currentValue}
        stroke="#ef4444"
strokeOpacity={0.22}
        strokeDasharray="6 6"
        
      />
    )
  })}
{levels
  .filter(
    (item) => !hiddenCompounds.includes(item.name)
  )
  .map((item, index) => (
<Line
  key={item.name}
  type="monotone"
  dataKey={item.name}
  stroke={chartColors[index % chartColors.length]}
  strokeWidth={3}
  dot={false}
  connectNulls
  isAnimationActive
  animationDuration={600}
  animationEasing="ease-out"
  activeDot={{
    r: 6,
    strokeWidth: 0,
    fill: chartColors[index % chartColors.length],
  }}
/>
  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[32px] border border-emerald-400/20 bg-gradient-to-br from-[#111111] to-[#080808] p-6 shadow-[0_0_40px_rgba(52,211,153,0.08)]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Geschätzte aktive Menge
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                Current Levels
              </h2>
            </div>

            <button
  onClick={loadStats}
  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-white/[0.06] active:scale-95"
>
  Aktualisieren
</button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-3xl bg-white/[0.03]"
                />
              ))}
            </div>
          ) : levels.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
              <p className="text-lg font-semibold">
                Keine Daten vorhanden
              </p>

              <p className="mt-2 text-sm text-muted-foreground">
                Du brauchst Logs + Halbwertszeiten.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {levels.map((item) => {
                const percentage = Math.min(
                  100,
                  Math.max(8, item.amount / 5)
                )

                return (
                  <div
                    key={item.name}
                    className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {item.name}
                        </h3>

                        <p className="mt-1 text-sm text-muted-foreground">
                          Halbwertszeit: {item.halfLife}h
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-3xl font-bold text-emerald-400">
                          {formatMg(item.amount)} mg
                        </p>

                        <p className="text-xs text-muted-foreground">
                          aktiv geschätzt
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 h-3 overflow-hidden rounded-full bg-black/40">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.45)]"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
{fullscreenChart && (
  <div className="fixed inset-0 z-[120] bg-[#050505]">
    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Vollbildansicht
        </p>

        <h2 className="text-xl font-bold">
          Active Levels
          <p className="mt-2 text-xs text-muted-foreground">
  Zuletzt aktualisiert: {lastUpdated || "--"}
</p>
        </h2>
      </div>

      <button
        onClick={() => setFullscreenChart(false)}
        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2"
      >
        Schließen
      </button>
    </div>

    <div className="h-[85vh] p-4">
      {loading && (
  <div className="absolute right-4 top-4 z-20 rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-muted-foreground backdrop-blur-md">
    Aktualisiere...
  </div>
)}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <XAxis
            dataKey="time"
            stroke="#666"
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            stroke="#666"
            tickLine={false}
            axisLine={false}
            domain={[0, "auto"]}
          />

          <Tooltip
  contentStyle={{
    background: "#0A0A0A",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
  }}
/>
{levels
  .filter((item) => !hiddenCompounds.includes(item.name))
  .map((item, index) => {
    const currentValue =
      chartData[chartData.length - 1]?.[item.name] ?? 0

    if (!currentValue) return null

    return (
      <ReferenceLine
        key={`ref-${item.name}`}
        y={currentValue}
        stroke="#ef4444"
strokeOpacity={0.22}
        strokeDasharray="6 6"
        
      />
    )
  })}
{levels
  .filter(
    (item) => !hiddenCompounds.includes(item.name)
  )
  .map((item, index) => (
<Line
  key={item.name}
  type="monotone"
  dataKey={item.name}
  stroke={chartColors[index % chartColors.length]}
  strokeWidth={3}
  dot={false}
  connectNulls
  isAnimationActive
  animationDuration={600}
  animationEasing="ease-out"
  activeDot={{
    r: 6,
    strokeWidth: 0,
    fill: chartColors[index % chartColors.length],
  }}
/>
  ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
)}
      <BottomNav />
    </div>
  )
}