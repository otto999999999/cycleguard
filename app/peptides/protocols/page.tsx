
"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  House,
  CalendarDays,
  Package,
  Plus,
  Pencil,
  Trash2,
  X,
  Pause,
  Play,
  Check,
  ChevronDown,
} from "lucide-react"

type Status = "active" | "paused" | "completed"

type Interval =
  | "daily"
  | "every_2_days"
  | "every_3_days"
  | "weekly"
  | "custom"

type InventoryPeptide = {
  id: string
  name: string
  vial_size_mg: number | null
  quantity: number | null
}

type Protocol = {
  id: string
  user_id: string
  name: string
  peptide_name: string
  start_date: string
  end_date: string | null
  status: Status
  notes: string | null
}

type ProtocolItem = {
  id: string
  protocol_id: string
  user_id: string
  inventory_id: string | null
  peptide_name: string
  start_date: string
  end_date: string | null
  interval_type: Interval
  weekdays: string[]
}

type ItemForm = {
  localId: string
  dbId?: string
  inventory_id: string
  peptide_name: string
  start_date: string
  end_date: string
  interval_type: Interval
  weekdays: string[]
}

type FormData = {
  name: string
  start_date: string
  end_date: string
  notes: string
  items: ItemForm[]
}

const emptyForm = (): FormData => ({
  name: "",
  start_date: "",
  end_date: "",
  notes: "",
  items: [],
})

const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

const intervalLabels: Record<Interval, string> = {
  daily: "Täglich",
  every_2_days: "Alle 2 Tage",
  every_3_days: "Alle 3 Tage",
  weekly: "Wöchentlich",
  custom: "Bestimmte Wochentage",
}

const statusLabels: Record<Status, string> = {
  active: "Aktiv",
  paused: "Pausiert",
  completed: "Abgeschlossen",
}

const newItem = (
  start = "",
  end = ""
): ItemForm => ({
  localId: crypto.randomUUID(),
  inventory_id: "",
  peptide_name: "",
  start_date: start,
  end_date: end,
  interval_type: "daily",
  weekdays: [],
})

export default function PeptideProtocolsPage() {
  const [protocols, setProtocols] = useState<Protocol[]>([])
  const [items, setItems] = useState<ProtocolItem[]>([])
  const [inventory, setInventory] = useState<InventoryPeptide[]>([])

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState<FormData>(emptyForm)
  const [errorMessage, setErrorMessage] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Bitte anmelden")
      }

      const [p, i, inv] = await Promise.all([
        supabase
          .from("peptide_protocols")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("peptide_protocol_items")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at"),

        supabase
          .from("peptide_inventory")
          .select("id, name, vial_size_mg, quantity")
          .eq("user_id", user.id)
          .order("name"),
      ])

      if (p.error) throw p.error
      if (i.error) throw i.error
      if (inv.error) throw inv.error

      setProtocols((p.data || []) as Protocol[])
      setItems((i.data || []) as ProtocolItem[])
      setInventory((inv.data || []) as InventoryPeptide[])
      setErrorMessage("")
    } catch (e) {
      console.error(e)

      setErrorMessage(
        e instanceof Error
          ? e.message
          : "Daten konnten nicht geladen werden"
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const loadInventory = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data, error } = await supabase
      .from("peptide_inventory")
      .select("id, name, vial_size_mg, quantity")
      .eq("user_id", user.id)
      .order("name")

    if (error) {
      setErrorMessage(error.message)
    } else {
      setInventory((data || []) as InventoryPeptide[])
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({
      ...emptyForm(),
      items: [newItem()],
    })
    setErrorMessage("")
    setShowForm(true)
    void loadInventory()
  }

  const openEdit = (protocol: Protocol) => {
    const existing = items.filter(
      (x) => x.protocol_id === protocol.id
    )

    setEditingId(protocol.id)

    setForm({
      name: protocol.name,
      start_date: protocol.start_date,
      end_date: protocol.end_date || "",
      notes: protocol.notes || "",

      items: existing.length
        ? existing.map((x) => ({
            localId: x.id,
            dbId: x.id,
            inventory_id: x.inventory_id || "",
            peptide_name: x.peptide_name,
            start_date: x.start_date,
            end_date: x.end_date || "",
            interval_type: x.interval_type,
            weekdays: x.weekdays || [],
          }))
        : [
            {
              ...newItem(
                protocol.start_date,
                protocol.end_date || ""
              ),
              inventory_id:
                inventory.find(
                  (x) => x.name === protocol.peptide_name
                )?.id || "",
              peptide_name: protocol.peptide_name,
            },
          ],
    })

    setErrorMessage("")
    setShowForm(true)
    void loadInventory()
  }

  const updateItem = (
    localId: string,
    patch: Partial<ItemForm>
  ) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.localId === localId
          ? { ...item, ...patch }
          : item
      ),
    }))
  }

  const saveProtocol = async () => {
    if (busy) return

    if (
      !form.name.trim() ||
      !form.start_date ||
      !form.items.length
    ) {
      setErrorMessage(
        "Protokollname, Startdatum und mindestens ein Peptid sind erforderlich."
      )
      return
    }

    if (
      form.end_date &&
      form.end_date < form.start_date
    ) {
      setErrorMessage(
        "Das Enddatum des Protokolls liegt vor dem Startdatum."
      )
      return
    }

    for (const item of form.items) {
      if (
        !item.inventory_id ||
        !inventory.some(
          (x) =>
            x.id === item.inventory_id &&
            x.name === item.peptide_name
        )
      ) {
        setErrorMessage(
          "Bitte für jedes Peptid einen vorhandenen Inventareintrag auswählen."
        )
        return
      }

      if (
        !item.start_date ||
        (item.end_date &&
          item.end_date < item.start_date)
      ) {
        setErrorMessage(
          "Bitte die Start- und Enddaten der Peptide prüfen."
        )
        return
      }

      if (
        item.interval_type === "custom" &&
        !item.weekdays.length
      ) {
        setErrorMessage(
          "Bei benutzerdefiniertem Intervall mindestens einen Wochentag auswählen."
        )
        return
      }
    }

    setBusy(true)
    setErrorMessage("")

    let createdId: string | null = null

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Nicht angemeldet")
      }

      const payload = {
        name: form.name.trim(),
        peptide_name: form.items[0].peptide_name,
        start_date: form.start_date,
        end_date: form.end_date || null,
        notes: form.notes.trim() || null,
      }

      let protocolId = editingId

      if (editingId) {
        const { data, error } = await supabase
          .from("peptide_protocols")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id)
          .select("id")

        if (error) throw error

        if (!data?.length) {
          throw new Error("Protokoll nicht gefunden")
        }
      } else {
        const { data, error } = await supabase
          .from("peptide_protocols")
          .insert({
            ...payload,
            user_id: user.id,
            status: "active",
          })
          .select("id")
          .single()

        if (error) throw error

        protocolId = data.id
        createdId = data.id
      }

      if (!protocolId) {
        throw new Error("Protokoll-ID fehlt")
      }

      const rows = form.items.map((item) => ({
        id: item.dbId || item.localId,
        user_id: user.id,
        protocol_id: protocolId,
        inventory_id: item.inventory_id,
        peptide_name: item.peptide_name,
        start_date: item.start_date,
        end_date: item.end_date || null,
        interval_type: item.interval_type,
        weekdays:
          item.interval_type === "custom"
            ? item.weekdays
            : [],
      }))

      const { error: upsertError } = await supabase
        .from("peptide_protocol_items")
        .upsert(rows, {
          onConflict: "id",
        })

      if (upsertError) throw upsertError

      const oldIds = items
        .filter((x) => x.protocol_id === protocolId)
        .map((x) => x.id)

      const keptIds = new Set(
        rows.map((x) => x.id)
      )

      const removedIds = oldIds.filter(
        (id) => !keptIds.has(id)
      )

      if (removedIds.length) {
        const { error } = await supabase
          .from("peptide_protocol_items")
          .delete()
          .eq("user_id", user.id)
          .eq("protocol_id", protocolId)
          .in("id", removedIds)

        if (error) throw error
      }

      setShowForm(false)
      setEditingId(null)
      await loadData()
    } catch (e) {
      console.error(e)

      if (createdId) {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          await supabase
            .from("peptide_protocols")
            .delete()
            .eq("id", createdId)
            .eq("user_id", user.id)
        }
      }

      setErrorMessage(
        e instanceof Error
          ? e.message
          : "Speichern fehlgeschlagen"
      )
    } finally {
      setBusy(false)
    }
  }

  const changeStatus = async (
    protocol: Protocol,
    status: Status
  ) => {
    if (busy) return

    setBusy(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Nicht angemeldet")
      }

      const { error } = await supabase
        .from("peptide_protocols")
        .update({ status })
        .eq("id", protocol.id)
        .eq("user_id", user.id)

      if (error) throw error

      await loadData()
    } catch (e) {
      setErrorMessage(
        e instanceof Error
          ? e.message
          : "Statusänderung fehlgeschlagen"
      )
    } finally {
      setBusy(false)
    }
  }

  const deleteProtocol = async (
    protocol: Protocol
  ) => {
    if (
      busy ||
      !window.confirm(
        `"${protocol.name}" wirklich löschen?`
      )
    ) {
      return
    }

    setBusy(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Nicht angemeldet")
      }

      const { error } = await supabase
        .from("peptide_protocols")
        .delete()
        .eq("id", protocol.id)
        .eq("user_id", user.id)

      if (error) throw error

      await loadData()
    } catch (e) {
      setErrorMessage(
        e instanceof Error
          ? e.message
          : "Löschen fehlgeschlagen"
      )
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-[#181818] p-3 text-white outline-none focus:border-violet-400"

  return (
    <main className="min-h-screen bg-[#050505] pb-28 text-white">
      <div className="mx-auto max-w-lg px-5 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-300/70">
              Peptide
            </p>

            <h1 className="mt-1 text-3xl font-black">
              Protokolle
            </h1>

            <p className="mt-1 text-sm text-white/40">
              Deine gespeicherten Protokolle
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            aria-label="Protokoll erstellen"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/10 text-violet-300"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && !showForm && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300"
          >
            {errorMessage}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-white/50">
            Protokolle werden geladen...
          </p>
        ) : protocols.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <CalendarDays className="h-9 w-9 text-violet-300" />

            <h2 className="mt-5 text-xl font-bold">
              Noch keine Protokolle
            </h2>

            <p className="mt-2 text-sm text-white/40">
              Erstelle dein erstes Protokoll.
            </p>

            <button
              type="button"
              onClick={openCreate}
              className="mt-5 w-full rounded-xl bg-violet-400 p-4 font-bold text-black"
            >
              Neues Protokoll
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {protocols.map((protocol) => {
              const list = items.filter(
                (x) => x.protocol_id === protocol.id
              )

              return (
                <div
                  key={protocol.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-lg font-bold">
                        {protocol.name}
                      </h2>

                      <p className="mt-1 text-sm text-white/50">
                        {list.length
                          ? `${list.length} Peptid${
                              list.length !== 1 ? "e" : ""
                            }`
                          : protocol.peptide_name}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                        protocol.status === "active"
                          ? "bg-emerald-400/10 text-emerald-300"
                          : protocol.status === "paused"
                          ? "bg-orange-400/10 text-orange-300"
                          : "bg-white/10 text-white/50"
                      }`}
                    >
                      {statusLabels[protocol.status]}
                    </span>
                  </div>

                  <p className="mt-4 text-sm text-white/50">
                    {protocol.start_date}
                    {" – "}
                    {protocol.end_date || "Offen"}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setExpanded(
                        expanded === protocol.id
                          ? null
                          : protocol.id
                      )
                    }
                    className="mt-3 flex items-center gap-2 text-sm text-violet-300"
                  >
                    Peptide & Intervalle

                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        expanded === protocol.id
                          ? "rotate-180"
                          : ""
                      }`}
                    />
                  </button>

                  {expanded === protocol.id && (
                    <div className="mt-3 space-y-2">
                      {list.length ? (
                        list.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm"
                          >
                            <p className="font-semibold">
                              {item.peptide_name}
                            </p>

                            <p className="mt-1 text-white/50">
                              {intervalLabels[item.interval_type]}

                              {item.interval_type === "custom"
                                ? ` (${item.weekdays.join(", ")})`
                                : ""}
                            </p>

                            <p className="text-white/50">
                              {item.start_date}
                              {" – "}
                              {item.end_date || "Offen"}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-white/50">
                          Altes Protokoll ohne Einzelkonfiguration.
                          Über „Bearbeiten“ ergänzen.
                        </p>
                      )}
                    </div>
                  )}

                  {protocol.notes && (
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm text-white/40">
                      {protocol.notes}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={() => openEdit(protocol)}
                      disabled={busy}
                      className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm disabled:opacity-40"
                    >
                      <Pencil className="h-4 w-4" />
                      Bearbeiten
                    </button>

                    {protocol.status === "active" && (
                      <button
                        type="button"
                        onClick={() =>
                          void changeStatus(
                            protocol,
                            "paused"
                          )
                        }
                        disabled={busy}
                        className="flex items-center gap-2 rounded-xl bg-orange-400/10 px-3 py-2 text-sm text-orange-300 disabled:opacity-40"
                      >
                        <Pause className="h-4 w-4" />
                        Pausieren
                      </button>
                    )}

                    {protocol.status === "paused" && (
                      <button
                        type="button"
                        onClick={() =>
                          void changeStatus(
                            protocol,
                            "active"
                          )
                        }
                        disabled={busy}
                        className="flex items-center gap-2 rounded-xl bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300 disabled:opacity-40"
                      >
                        <Play className="h-4 w-4" />
                        Fortsetzen
                      </button>
                    )}

                    {protocol.status !== "completed" && (
                      <button
                        type="button"
                        onClick={() =>
                          void changeStatus(
                            protocol,
                            "completed"
                          )
                        }
                        disabled={busy}
                        className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm disabled:opacity-40"
                      >
                        <Check className="h-4 w-4" />
                        Abschließen
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        void deleteProtocol(protocol)
                      }
                      disabled={busy}
                      aria-label="Protokoll löschen"
                      className="rounded-xl bg-red-400/10 p-2 text-red-400 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 px-4 py-6">
          <div className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#0b0b0d] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingId
                  ? "Protokoll bearbeiten"
                  : "Neues Protokoll"}
              </h2>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Schließen"
                className="text-white/60"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-sm text-white/60">
                Protokollname *

                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  placeholder="Protokollname"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm text-white/60">
                  Protokollstart *

                  <input
                    type="date"
                    className={inputClass}
                    value={form.start_date}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        start_date: e.target.value,
                        items: prev.items.map((x) =>
                          x.start_date
                            ? x
                            : {
                                ...x,
                                start_date:
                                  e.target.value,
                              }
                        ),
                      }))
                    }
                  />
                </label>

                <label className="block text-sm text-white/60">
                  Protokollende

                  <input
                    type="date"
                    className={inputClass}
                    value={form.end_date}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        end_date: e.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="flex items-center justify-between pt-2">
                <h3 className="font-bold">
                  Peptide im Protokoll
                </h3>

                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      items: [
                        ...prev.items,
                        newItem(
                          prev.start_date,
                          prev.end_date
                        ),
                      ],
                    }))
                  }
                  className="flex items-center gap-1 rounded-xl bg-violet-400/10 px-3 py-2 text-sm font-bold text-violet-300"
                >
                  <Plus className="h-4 w-4" />
                  Peptid hinzufügen
                </button>
              </div>

              {form.items.map((item, index) => (
                <div
                  key={item.localId}
                  className="space-y-3 rounded-2xl border border-violet-400/20 bg-violet-400/[0.04] p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold">
                      Peptid {index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          items: prev.items.filter(
                            (x) =>
                              x.localId !==
                              item.localId
                          ),
                        }))
                      }
                      className="rounded-lg p-2 text-red-300"
                      aria-label="Peptid entfernen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <label className="block text-sm text-white/60">
                    Aus Inventar auswählen *

                    <select
                      className={inputClass}
                      value={item.inventory_id}
                      onChange={(e) => {
                        const found = inventory.find(
                          (x) =>
                            x.id === e.target.value
                        )

                        updateItem(item.localId, {
                          inventory_id:
                            e.target.value,
                          peptide_name:
                            found?.name || "",
                        })
                      }}
                    >
                      <option value="">
                        Peptid auswählen
                      </option>

                      {inventory.map((x) => (
                        <option
                          key={x.id}
                          value={x.id}
                        >
                          {x.name} –{" "}
                          {x.vial_size_mg ?? "?"} mg
                          {" · "}
                          {x.quantity ?? 0} Vials
                        </option>
                      ))}
                    </select>
                  </label>

                  {inventory.length === 0 && (
                    <p className="text-xs text-orange-300">
                      Noch keine Peptide im Inventar vorhanden.
                    </p>
                  )}

                  <label className="block text-sm text-white/60">
                    Intervall *

                    <select
                      className={inputClass}
                      value={item.interval_type}
                      onChange={(e) =>
                        updateItem(item.localId, {
                          interval_type:
                            e.target.value as Interval,
                        })
                      }
                    >
                      {Object.entries(
                        intervalLabels
                      ).map(([value, label]) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {item.interval_type === "custom" && (
                    <div>
                      <p className="text-sm text-white/60">
                        Wochentage auswählen *
                      </p>

                      <div className="mt-2 grid grid-cols-7 gap-1">
                        {days.map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() =>
                              updateItem(
                                item.localId,
                                {
                                  weekdays:
                                    item.weekdays.includes(
                                      day
                                    )
                                      ? item.weekdays.filter(
                                          (x) =>
                                            x !== day
                                        )
                                      : [
                                          ...item.weekdays,
                                          day,
                                        ],
                                }
                              )
                            }
                            className={`rounded-lg py-2 text-xs font-bold ${
                              item.weekdays.includes(day)
                                ? "bg-violet-400 text-black"
                                : "bg-white/10 text-white/60"
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm text-white/60">
                      Startdatum *

                      <input
                        type="date"
                        className={inputClass}
                        value={item.start_date}
                        onChange={(e) =>
                          updateItem(item.localId, {
                            start_date:
                              e.target.value,
                          })
                        }
                      />
                    </label>

                    <label className="block text-sm text-white/60">
                      Enddatum (optional)

                      <input
                        type="date"
                        className={inputClass}
                        value={item.end_date}
                        onChange={(e) =>
                          updateItem(item.localId, {
                            end_date:
                              e.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}

              <label className="block text-sm text-white/60">
                Notizen

                <textarea
                  rows={3}
                  className={inputClass}
                  value={form.notes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Optionale Notizen"
                />
              </label>
            </div>

            {errorMessage && (
              <p
                role="alert"
                className="mt-4 text-sm text-red-400"
              >
                {errorMessage}
              </p>
            )}

            <button
              type="button"
              onClick={() => void saveProtocol()}
              disabled={busy}
              className="mt-6 w-full rounded-xl p-4 font-bold disabled:opacity-40"
              style={{
                backgroundColor: "#a78bfa",
                color: "#000",
              }}
            >
              {busy
                ? "Speichere..."
                : editingId
                ? "Änderungen speichern"
                : "Protokoll erstellen"}
            </button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto grid max-w-lg grid-cols-3 px-5 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
          <Link
            href="/peptides"
            className="flex flex-col items-center gap-1 py-2 text-white/40"
          >
            <House className="h-5 w-5" />
            <span className="text-xs">
              Home
            </span>
          </Link>

          <Link
            href="/peptides/protocols"
            className="flex flex-col items-center gap-1 py-2 text-violet-300"
          >
            <CalendarDays className="h-5 w-5" />
            <span className="text-xs">
              Protokolle
            </span>
          </Link>

          <Link
            href="/peptides/inventory"
            className="flex flex-col items-center gap-1 py-2 text-white/40"
          >
            <Package className="h-5 w-5" />
            <span className="text-xs">
              Inventar
            </span>
          </Link>
        </div>
      </nav>
    </main>
  )
}
