"use client"

const wochentage = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

type WeekCalendarProps = {
  selectedDate?: string
  onSelectDate?: (date: string) => void
  markedDates?: string[]
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
}: WeekCalendarProps) {
  const today = new Date()
  const selectedKey = selectedDate || dateKeyLocal(today)

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
        isToday: key === dateKeyLocal(today),
        isSelected: key === selectedKey,
        isMarked: markedDates.includes(key),
      }
    })
  }

  const weekDates = getWeekDates()

  return (
    <div className="bg-[#0A0A0A] rounded-3xl p-5 border border-border/30">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-foreground">
          {selectedLocalDate.toLocaleDateString("de-DE", {
            month: "long",
            year: "numeric",
          })}
        </span>

        <span className="text-xs text-muted-foreground">Diese Woche</span>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDates.map(({ tag, key, date, isToday, isSelected, isMarked }) => (
          <button
            key={key}
            onClick={() => onSelectDate?.(key)}
            className={`
              flex flex-col items-center py-3 rounded-2xl transition-all relative
              ${
                isSelected
                  ? "bg-primary text-primary-foreground scale-105"
                  : isToday
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-[#111111] text-foreground/80"
              }
            `}
          >
            <span className="text-[10px] uppercase tracking-widest mb-1 text-muted-foreground">
              {tag}
            </span>

            <span className="text-lg font-medium">{date}</span>

            {isMarked && (
              <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}