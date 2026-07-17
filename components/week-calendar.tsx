"use client"

const wochentage = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

type WeekCalendarProps = {
  selectedDate?: string
  onSelectDate?: (date: string) => void
  markedDates?: string[]
  markedDateTypes?: Record<string, "cycle" | "supplement" | "both">
}

const dateKeyLocal = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const parseLocalDate = (dateKey: string) => {
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function WeekCalendar({
  selectedDate,
  onSelectDate,
  markedDates = [],
  markedDateTypes = {},
}: WeekCalendarProps) {
  const today = new Date()
  const todayKey = dateKeyLocal(today)
  const selectedKey = selectedDate || todayKey
  const selectedLocalDate = parseLocalDate(selectedKey)

  const getWeekDates = () => {
    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

    const monday = new Date(today)
    monday.setHours(12, 0, 0, 0)
    monday.setDate(today.getDate() + mondayOffset)

    return wochentage.map((tag, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)

      const key = dateKeyLocal(date)

      return {
        tag,
        key,
        date: date.getDate(),
        isToday: key === todayKey,
        isSelected: key === selectedKey,
        isMarked: markedDates.includes(key),
        markType: markedDateTypes[key],
      }
    })
  }

  const weekDates = getWeekDates()

  return (
    <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-[#101010] to-[#070707] p-5 shadow-[0_0_35px_rgba(255,255,255,0.035)] backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Kalender</p>
          <p className="text-base font-semibold capitalize">
            {selectedLocalDate.toLocaleDateString("de-DE", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
          Diese Woche
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {weekDates.map(({ tag, key, date, isToday, isSelected, isMarked, markType }) => (
          <button
            key={key}
            onClick={() => onSelectDate?.(key)}
            className={`
              relative flex min-h-[72px] flex-col items-center justify-center rounded-2xl border transition-all duration-300 ease-out
              ${
                isSelected
                  ? "scale-[1.04] border-emerald-400/40 bg-emerald-400 text-black shadow-[0_0_22px_rgba(52,211,153,0.22)]"
                  : isToday
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                    : "border-white/5 bg-white/[0.025] text-foreground/80 hover:border-white/10 hover:bg-white/[0.06]"
              }
            `}
          >
            {isToday && !isSelected && (
              <div className="absolute top-1.5 h-1 w-5 rounded-full bg-emerald-400/70" />
            )}

            <span
              className={`mb-1 text-[10px] font-medium uppercase tracking-widest ${
                isSelected ? "text-black/60" : "text-muted-foreground"
              }`}
            >
              {tag}
            </span>

            <span className="text-lg font-bold">{date}</span>

{isMarked && (
  <div
    className={`absolute bottom-2 h-1.5 w-1.5 rounded-full ${
      isSelected
        ? "bg-black/70"
        : markType === "both"
          ? "bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.8)]"
          : markType === "supplement"
            ? "bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]"
            : "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
    }`}
  />
)}
          </button>
        ))}
      </div>
    </div>
  )
}