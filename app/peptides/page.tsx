
"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  House,
  CalendarDays,
  Package,
  Plus,
  X,
  Trash2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock3,
  Activity,
  RotateCcw,
} from "lucide-react"

type PeptideLog = {
  id: string
  user_id: string
  protocol_id: string | null
  peptide_name: string
  logged_at: string
  notes: string | null
}

type Protocol = {
  id: string
  name: string
  peptide_name: string
  start_date: string
  end_date: string | null
  status: "active" | "paused" | "completed"
}

type ProtocolItem = {
  id: string
  protocol_id: string
  peptide_name: string
  start_date: string
  end_date: string | null
  interval_type: string
  weekdays: string[]
}

type InventoryItem = {
  id: string
  name: string
  vial_size_mg: number | null
  quantity: number | null
}

const dateKey = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const parseDate = (value: string) => {
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, m - 1, d)
}

const addDays = (date: Date, days: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const mondayOf = (date: Date) =>
  addDays(date, -((date.getDay() + 6) % 7))

const formatDate = (date: Date) =>
  date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

const weekdays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]

const intervalNames: Record<string, string> = {
  daily: "Täglich",
  every_2_days: "Alle 2 Tage",
  every_3_days: "Alle 3 Tage",
  weekly: "Wöchentlich",
  custom: "Ausgewählte Wochentage",
}

function isScheduled(
  item: ProtocolItem,
  date: string,
  protocol?: Protocol
) {
  if (!protocol || protocol.status !== "active") return false
  if (date < item.start_date) return false
  if (item.end_date && date > item.end_date) return false
  if (date < protocol.start_date) return false
  if (protocol.end_date && date > protocol.end_date) return false

  const target = parseDate(date)
  const start = parseDate(item.start_date)

  const diff = Math.round(
    (Date.UTC(
      target.getFullYear(),
      target.getMonth(),
      target.getDate()
    ) -
      Date.UTC(
        start.getFullYear(),
        start.getMonth(),
        start.getDate()
      )) / 86400000
  )

  switch (item.interval_type) {
    case "daily":
      return true
    case "every_2_days":
      return diff % 2 === 0
    case "every_3_days":
      return diff % 3 === 0
    case "weekly":
      return diff % 7 === 0
    case "custom":
      return (item.weekdays || []).includes(
        weekdays[target.getDay()]
      )
    default:
      return false
  }
}

export default function PeptidesPage() {
  const [selectedDate, setSelectedDate] = useState(
    () => dateKey(new Date())
  )

  const [logs, setLogs] = useState<PeptideLog[]>([])
  const [protocols, setProtocols] = useState<Protocol[]>([])
  const [items, setItems] = useState<ProtocolItem[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [inventoryId, setInventoryId] = useState("")
  const [notes, setNotes] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const selected = parseDate(selectedDate)
  const weekStart = mondayOf(selected)

  const weekDays = Array.from(
    { length: 7 },
    (_, index) => addDays(weekStart, index)
  )

  const cardClass =
    "rounded-3xl border border-white/10 bg-white/[0.04]"

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error("Nicht angemeldet")
      }

      const start = mondayOf(parseDate(selectedDate))
      const end = addDays(start, 7)

      const [logResult, protocolResult, itemResult, invResult] =
        await Promise.all([
          supabase
            .from("peptide_logs")
            .select("*")
            .eq("user_id", user.id)
            .gte("logged_at", start.toISOString())
            .lt("logged_at", end.toISOString())
            .order("logged_at", { ascending: false })
            .limit(1000),

          supabase
            .from("peptide_protocols")
            .select(
              "id,name,peptide_name,start_date,end_date,status"
            )
            .eq("user_id", user.id),

          supabase
            .from("peptide_protocol_items")
            .select(
              "id,protocol_id,peptide_name,start_date,end_date,interval_type,weekdays"
            )
            .eq("user_id", user.id),

          supabase
            .from("peptide_inventory")
            .select("id,name,vial_size_mg,quantity")
            .eq("user_id", user.id)
            .order("name"),
        ])

      if (logResult.error) throw logResult.error
      if (protocolResult.error) throw protocolResult.error
      if (itemResult.error) throw itemResult.error
      if (invResult.error) throw invResult.error

      setLogs((logResult.data || []) as PeptideLog[])
      setProtocols((protocolResult.data || []) as Protocol[])
      setItems((itemResult.data || []) as ProtocolItem[])
      setInventory((invResult.data || []) as InventoryItem[])
      setErrorMessage("")
    } catch (error) {
      console.error(error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Daten konnten nicht geladen werden."
      )
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const logsForDate = (date: string) =>
    logs.filter(
      (log) => dateKey(new Date(log.logged_at)) === date
    )

  const scheduledForDate = (date: string) =>
    items.filter((item) =>
      isScheduled(
        item,
        date,
        protocols.find((p) => p.id === item.protocol_id)
      )
    )

  const dayLogs = logsForDate(selectedDate)
  const dayScheduled = scheduledForDate(selectedDate)

  const matchingLog = (item: ProtocolItem, date: string) =>
    logsForDate(date).find(
      (log) =>
        log.protocol_id === item.protocol_id &&
        log.peptide_name === item.peptide_name
    )

  const saveEntry = async (
    name: string,
    protocolId: string | null,
    entryNotes: string
  ) => {
    if (saving || !name.trim()) return

    setSaving(true)
    setErrorMessage("")

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error("Nicht angemeldet")
      }

      const now = new Date()
      const loggedAt = parseDate(selectedDate)

      loggedAt.setHours(
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        0
      )

      if (protocolId) {
        // Auch direkt in Supabase prüfen, damit ein
        // veralteter lokaler Stand keine Duplikate erzeugt.
        const dayStart = parseDate(selectedDate)
        const dayEnd = addDays(dayStart, 1)

        const { data: existing, error: checkError } =
          await supabase
            .from("peptide_logs")
            .select("id")
            .eq("user_id", user.id)
            .eq("protocol_id", protocolId)
            .eq("peptide_name", name)
            .gte("logged_at", dayStart.toISOString())
            .lt("logged_at", dayEnd.toISOString())
            .limit(1)

        if (checkError) throw checkError

        if (existing && existing.length > 0) {
          throw new Error(
            "Dieser Protokolleintrag wurde bereits geloggt."
          )
        }
      }

      const { error } = await supabase
        .from("peptide_logs")
        .insert({
          user_id: user.id,
          protocol_id: protocolId,
          peptide_name: name.trim(),
          logged_at: loggedAt.toISOString(),
          notes: entryNotes.trim() || null,
        })

      if (error) throw error

      setShowModal(false)
      setInventoryId("")
      setNotes("")
      await loadData()
    } catch (error) {
      console.error(error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Speichern fehlgeschlagen."
      )
    } finally {
      setSaving(false)
    }
  }

  const deleteLog = async (id: string) => {
    if (saving) return

    if (!window.confirm("Diesen Log-Eintrag löschen?")) {
      return
    }

    setSaving(true)
    setErrorMessage("")

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Nicht angemeldet")

      const { error } = await supabase
        .from("peptide_logs")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)

      if (error) throw error

      await loadData()
    } catch (error) {
      console.error(error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Löschen fehlgeschlagen."
      )
    } finally {
      setSaving(false)
    }
  }

  const changeWeek = (direction: number) => {
    setSelectedDate(
      dateKey(addDays(selected, direction * 7))
    )
  }

  const activeProtocols = protocols.filter(
    (p) => p.status === "active"
  )

  return (
    <main className="min-h-screen bg-[#050505] pb-28 text-white">
<div className="mx-auto max-w-lg px-5 pt-6">

  <Link
    href="/"
    className="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
  >
    <ArrowLeft className="h-4 w-4" />
    Hauptmenü
  </Link>

  <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black">
              Peptide
            </h1>
            <p className="mt-1 text-sm capitalize text-white/40">
              {formatDate(selected)}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setSelectedDate(dateKey(new Date()))
            }
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70"
          >
            Heute
          </button>
        </div>

        {/* KALENDER */}
        <section className="mt-9">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold capitalize">
              {selected.toLocaleDateString("de-DE", {
                month: "long",
                year: "numeric",
              })}
            </h2>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => changeWeek(-1)}
                aria-label="Vorherige Woche"
                className="rounded-xl bg-white/5 p-2"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => changeWeek(1)}
                aria-label="Nächste Woche"
                className="rounded-xl bg-white/5 p-2"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className={`mt-4 p-3 ${cardClass}`}>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => {
                const key = dateKey(day)
                const active = key === selectedDate
                const hasLogs = logsForDate(key).length > 0
                const hasScheduled =
                  scheduledForDate(key).length > 0

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    className="flex min-w-0 flex-col items-center gap-2"
                  >
                    <span className="text-[11px] font-bold text-white/40">
                      {day.toLocaleDateString("de-DE", {
                        weekday: "short",
                      })}
                    </span>

                    <div
                      className={`flex h-10 w-10 max-w-full items-center justify-center rounded-full text-sm font-bold ${
                        active
                          ? "border-2 border-violet-400 bg-violet-400/10 text-violet-200"
                          : "bg-white/5 text-white/70"
                      }`}
                    >
                      {day.getDate()}
                    </div>

                    <div className="flex h-1.5 gap-1">
                      {hasScheduled && (
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                      )}
                      {hasLogs && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex justify-center gap-5 text-xs text-white/50">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-400" />
                Geplant
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Geloggt
              </span>
            </div>
          </div>
        </section>

        {errorMessage && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300"
          >
            {errorMessage}
          </p>
        )}

        {/* GEPLANTE PEPTIDE */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-violet-300/70">
                Tagesplanung
              </p>
              <h2 className="mt-1 text-2xl font-black">
                Geplante Peptide
              </h2>
            </div>

            <span className="rounded-full bg-white/5 px-3 py-2 text-xs text-white/60">
              {dayScheduled.length}
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-white/40">
              Lade Planung...
            </p>
          ) : dayScheduled.length === 0 ? (
            <div className={`${cardClass} p-5`}>
              <p className="text-sm text-white/40">
                Für diesen Tag sind keine aktiven
                Protokolleinträge geplant.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dayScheduled.map((item) => {
                const completedLog = matchingLog(
                  item,
                  selectedDate
                )

                const protocol = protocols.find(
                  (p) => p.id === item.protocol_id
                )

                return (
                  <div
                    key={item.id}
                    className={`${cardClass} p-4`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-xl p-3 ${
                          completedLog
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-orange-400/10 text-orange-300"
                        }`}
                      >
                        {completedLog ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <Clock3 className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="break-words font-bold">
                          {item.peptide_name}
                        </p>
                        <p className="mt-1 text-xs text-white/40">
                          {protocol?.name || "Protokoll"}
                        </p>
                        <p className="mt-1 text-xs text-white/50">
                          {intervalNames[item.interval_type] ||
                            item.interval_type}
                        </p>
                      </div>

                      {completedLog ? (
                        <div className="flex flex-col items-end gap-2">
                          <span className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300">
                            Erledigt
                          </span>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              void deleteLog(completedLog.id)
                            }
                            className="flex items-center gap-1 rounded-lg bg-red-400/10 px-2 py-2 text-xs text-red-300 disabled:opacity-40"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Rückgängig
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            void saveEntry(
                              item.peptide_name,
                              item.protocol_id,
                              ""
                            )
                          }
                          className="rounded-xl bg-violet-400 px-3 py-2 text-xs font-bold text-black disabled:opacity-40"
                        >
                          Loggen
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* AKTIVE PROTOKOLLE */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black">
              Aktive Protokolle
            </h2>
            <Link
              href="/peptides/protocols"
              className="text-sm font-semibold text-violet-300"
            >
              Alle ansehen
            </Link>
          </div>

          {loading ? (
            <p className="text-sm text-white/40">
              Lade Protokolle...
            </p>
          ) : activeProtocols.length === 0 ? (
            <div className={`${cardClass} p-5`}>
              <p className="text-sm text-white/40">
                Keine aktiven Protokolle vorhanden.
              </p>
              <Link
                href="/peptides/protocols"
                className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-violet-300"
              >
                <Plus className="h-4 w-4" />
                Protokoll erstellen
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeProtocols.map((protocol) => {
                const protocolItems = items.filter(
                  (item) =>
                    item.protocol_id === protocol.id
                )

                const start = parseDate(
                  protocol.start_date
                ).getTime()

                const end = protocol.end_date
                  ? parseDate(protocol.end_date).getTime()
                  : null

                const today = parseDate(
                  dateKey(new Date())
                ).getTime()

                const progress =
                  end === null
                    ? null
                    : end <= start
                    ? today >= start
                      ? 100
                      : 0
                    : Math.min(
                        100,
                        Math.max(
                          0,
                          Math.round(
                            ((today - start) /
                              (end - start)) *
                              100
                          )
                        )
                      )

                return (
                  <div
                    key={protocol.id}
                    className={`${cardClass} p-5`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-violet-300" />
                          <h3 className="font-bold">
                            {protocol.name}
                          </h3>
                        </div>
                        <p className="mt-2 text-xs text-white/40">
                          {protocol.start_date} –{" "}
                          {protocol.end_date || "Offen"}
                        </p>
                      </div>

                      <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                        Aktiv
                      </span>
                    </div>

                    {progress !== null && (
                      <div className="mt-4">
                        <div className="mb-2 flex justify-between text-xs text-white/50">
                          <span>Zeitlicher Fortschritt</span>
                          <span>{progress}%</span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-violet-400"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {protocolItems.length ? (
                        protocolItems.map((item) => (
                          <span
                            key={item.id}
                            className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70"
                          >
                            {item.peptide_name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-white/40">
                          {protocol.peptide_name}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* GESPEICHERTE EINTRÄGE */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-violet-300/70">
                Tagesübersicht
              </p>
              <h2 className="mt-1 text-2xl font-black">
                Gespeicherte Einträge
              </h2>
            </div>

            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/60">
              {dayLogs.length}
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-white/40">
              Lade Einträge...
            </p>
          ) : (
            <div className={`overflow-hidden ${cardClass}`}>
              {dayLogs.length === 0 ? (
                <p className="p-5 text-sm text-white/40">
                  Für diesen Tag gibt es noch keine Einträge.
                </p>
              ) : (
                dayLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 border-b border-white/10 p-4"
                  >
                    <div className="rounded-xl bg-emerald-400/10 p-3 text-emerald-300">
                      <Check className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-words font-bold">
                        {log.peptide_name}
                      </p>

                      <p className="mt-1 text-xs text-white/40">
                        {new Date(
                          log.logged_at
                        ).toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>

                      {log.protocol_id && (
                        <p className="mt-1 text-xs text-violet-300/70">
                          {protocols.find(
                            (p) => p.id === log.protocol_id
                          )?.name || "Protokolleintrag"}
                        </p>
                      )}

                      {log.notes && (
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-white/50">
                          {log.notes}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void deleteLog(log.id)
                      }
                      disabled={saving}
                      aria-label="Eintrag löschen"
                      className="rounded-xl bg-red-400/10 p-3 text-red-400 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}

              <button
                type="button"
                onClick={() => {
                  setInventoryId("")
                  setNotes("")
                  setErrorMessage("")
                  setShowModal(true)
                }}
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-white/5"
              >
                <div className="rounded-xl bg-violet-400/10 p-3 text-violet-300">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="font-bold">
                  Eintrag hinzufügen
                </span>
              </button>
            </div>
          )}
        </section>
      </div>

      {/* MANUELLER EINTRAG MIT INVENTARAUSWAHL */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 px-4 py-6">
          <div className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#0b0b0d] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Eintrag hinzufügen
              </h2>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-2 text-sm text-white/40">
              {formatDate(selected)}
            </p>

            <label className="mt-5 block text-sm text-white/60">
              Peptid aus Inventar auswählen

              <select
                value={inventoryId}
                onChange={(e) =>
                  setInventoryId(e.target.value)
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#181818] p-3 text-white outline-none focus:border-violet-400"
              >
                <option value="">
                  Peptid auswählen
                </option>

                {inventory.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name} –{" "}
                    {item.vial_size_mg ?? "?"} mg
                    {" · "}
                    {item.quantity ?? 0} Vials
                  </option>
                ))}
              </select>
            </label>

            {inventory.length === 0 && (
              <div className="mt-3 rounded-xl border border-orange-400/20 bg-orange-400/10 p-3">
                <p className="text-sm text-orange-300">
                  Du hast noch keine Peptide im Inventar.
                </p>
                <Link
                  href="/peptides/inventory"
                  className="mt-2 inline-block text-sm font-bold text-violet-300"
                >
                  Zum Inventar
                </Link>
              </div>
            )}

            <label className="mt-4 block text-sm text-white/60">
              Notizen (optional)

              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#181818] p-3 text-white outline-none focus:border-violet-400"
              />
            </label>

            <button
              type="button"
              onClick={() => {
                const selectedItem = inventory.find(
                  (item) => item.id === inventoryId
                )

                if (!selectedItem) return

                void saveEntry(
                  selectedItem.name,
                  null,
                  notes
                )
              }}
              disabled={saving || !inventoryId}
              className="mt-6 w-full rounded-xl bg-violet-400 p-4 font-bold text-black disabled:opacity-40"
            >
              {saving
                ? "Speichere..."
                : "Eintrag speichern"}
            </button>
          </div>
        </div>
      )}

      {/* NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto grid max-w-lg grid-cols-3 px-5 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
          <Link
            href="/peptides"
            className="flex flex-col items-center gap-1 py-2 text-violet-300"
          >
            <House className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Link>

          <Link
            href="/peptides/protocols"
            className="flex flex-col items-center gap-1 py-2 text-white/40"
          >
            <CalendarDays className="h-5 w-5" />
            <span className="text-xs">Protokolle</span>
          </Link>

          <Link
            href="/peptides/inventory"
            className="flex flex-col items-center gap-1 py-2 text-white/40"
          >
            <Package className="h-5 w-5" />
            <span className="text-xs">Inventar</span>
          </Link>
        </div>
      </nav>
    </main>
  )
}
