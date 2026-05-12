"use client"

const wochentage = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

type WeekCalendarProps = {
  selectedDate?: string
  onSelectDate?: (date: string) => void
  markedDates?: string[]
}

const toDateKey = (date: Date) => date.toISOString().split("T")[0]

export function WeekCalendar({
  selectedDate,
  onSelectDate,
  markedDates = [],
}: WeekCalendarProps) {
  const selected = selectedDate ? new Date(selectedDate) : new Date()

  const getWeekDates = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset)

    return wochentage.map((tag, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)

      const key = toDateKey(date)

      return {
        tag,
        key,
        date: date.getDate(),
        fullDate: date,
        isToday: key === toDateKey(today),
        isSelected: key === toDateKey(selected),
        isMarked: markedDates.includes(key),
      }
    })
  }

  const weekDates = getWeekDates()

  return (
    <div className="bg-[#0A0A0A] rounded-3xl p-5 border border-border/30">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-foreground">
          {selected.toLocaleDateString("de-DE", {
            month: "long",
            year: "numeric",
          })}
        </span>

        <span className="text-xs text-muted-foreground">
          Diese Woche
        </span>
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
            <span className="text-[10px] uppercase tracking-widest mb-1 opacity-70">
              {tag}
            </span>

            <span className="text-lg font-semibold">{date}</span>

            {isMarked && (
              <span
                className={`absolute bottom-2 w-1.5 h-1.5 rounded-full ${
                  isSelected ? "bg-white" : "bg-red-500"
                }`}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}