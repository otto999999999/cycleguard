"use client"

import { useState } from "react"

const wochentage = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

export function WeekCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Beispiel: Injektionstage (nur wenn Cycle aktiv ist)
  const hasActiveCycle = false // ← Später auf true setzen, wenn Cycle läuft

  const getWeekDates = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset)

    return wochentage.map((tag, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)
      
      const isToday = date.toDateString() === today.toDateString()
      const isSelected = date.toDateString() === selectedDate.toDateString()

      // Fake Punkte entfernen → nur bei aktivem Cycle echte Injektionstage
      const isInjectionDay = hasActiveCycle && (index === 0 || index === 3 || index === 6)

      return {
        tag,
        date: date.getDate(),
        fullDate: date,
        isToday,
        isSelected,
        isInjectionDay,
      }
    })
  }

  const weekDates = getWeekDates()

  return (
    <div className="bg-[#0A0A0A] rounded-3xl p-5 border border-border/30">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-foreground">
          {selectedDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
        </span>
        <span className="text-xs text-muted-foreground">Mai 2026</span>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDates.map(({ tag, date, fullDate, isToday, isSelected, isInjectionDay }) => (
          <button
            key={tag}
            onClick={() => setSelectedDate(fullDate)}
            className={`
              flex flex-col items-center py-3 rounded-2xl transition-all relative
              ${isSelected 
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

            {/* Injektionstag Punkt - nur bei aktivem Cycle */}
            {isInjectionDay && (
              <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}