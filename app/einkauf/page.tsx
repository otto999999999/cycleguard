"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Calendar, Edit, Pill, Plus, Syringe, X } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"
import { supabase } from "@/lib/supabase"

const ORAL_TYPES = ["Oral", "AI (Aromatase Inhibitor)", "SARM", "PCT", "Supplement"]

export default function EinkaufPage() {
  const [compounds, setCompounds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [showStockSelect, setShowStockSelect] = useState(false)
  const [showStockEdit, setShowStockEdit] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [editForm, setEditForm] = useState({
    current_vials: 0,
    current_ampoules: 0,
    current_bottles: 0,
    remaining_pills: 0,
  })

  const isOral = (c: any) => ORAL_TYPES.includes(c.type)

  const loadCompounds = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setCompounds([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("compounds")
      .select("*")
      .eq("user_id", session.user.id)
      .order("name")

    if (error) alert("Fehler beim Laden: " + error.message)
    setCompounds(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadCompounds()
  }, [])

  const getTotalPills = (c: any) => (c.pills_per_bottle || 0) * (c.current_bottles || 0)

  const getPercentage = (c: any) => {
    const total = getTotalPills(c)
    if (!total) return 0
    return Math.min(100, Math.round(((c.remaining_pills || 0) / total) * 100))
  }

  const getQuantity = (c: any) => {
    if (isOral(c)) return c.current_bottles || 0
    if (c.packaging === "Vial") return c.current_vials || 0
    return c.current_ampoules || 0
  }

  const getUnit = (c: any, qty: number) => {
    if (isOral(c)) return qty === 1 ? "Flasche" : "Flaschen"
    if (c.packaging === "Vial") return qty === 1 ? "Vial" : "Vials"
    return qty === 1 ? "Ampulle" : "Ampullen"
  }


  const breakdown = compounds.map((c) => {
    const quantity = getQuantity(c)
    return {
      name: c.name,
      quantity,
      unit: getUnit(c, quantity),
      totalValue: quantity * (c.price || 0),
    }
  })

const totalValue = breakdown.reduce((sum, item) => sum + item.totalValue, 0)

  const stats = compounds.reduce(
    (acc, c) => {
      const qty = getQuantity(c)

      acc.gesamtwert += qty * (c.price || 0)
      if (c.type === "Injectable") acc.injectables++
      if (isOral(c)) acc.orals += c.remaining_pills || 0

      const low = isOral(c)
        ? (c.remaining_pills || 0) < 20
        : qty < 1

      if (low) acc.lowStock++
      return acc
    },
    { gesamtwert: 0, injectables: 0, orals: 0, lowStock: 0 }
  )

  const lowStockItems = compounds.filter((c) =>
    isOral(c) ? (c.remaining_pills || 0) < 20 : getQuantity(c) < 1
  )

  const selectCompoundForEdit = (c: any) => {
    setSelected(c)
    setEditForm({
      current_vials: c.current_vials || 0,
      current_ampoules: c.current_ampoules || 0,
      current_bottles: c.current_bottles || 0,
      remaining_pills: c.remaining_pills || c.pills_per_bottle || 0,
    })
    setShowStockSelect(false)
    setShowStockEdit(true)
  }

  const saveStockEdit = async () => {
    if (!selected) return

    const updateData = isOral(selected)
      ? {
          current_bottles: editForm.current_bottles,
          remaining_pills: editForm.remaining_pills,
        }
      : selected.packaging === "Vial"
        ? { current_vials: editForm.current_vials }
        : { current_ampoules: editForm.current_ampoules }

    const { error } = await supabase
      .from("compounds")
      .update(updateData)
      .eq("id", selected.id)

    if (error) {
      alert("Fehler: " + error.message)
      return
    }

    alert("✅ Bestand aktualisiert!")
    setShowStockEdit(false)
    setSelected(null)
    loadCompounds()
  }

  return (
    <div className="min-h-screen bg-[#050505] pb-24 text-foreground">
      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-lg border-b border-border/20 px-5 py-4">
        <h1 className="text-2xl font-bold tracking-tight">Einkauf</h1>
      </header>

      <div className="px-5 pt-6 grid grid-cols-2 gap-3">
        <StatCard title="Gesamtwert" value={`€${Math.round(stats.gesamtwert)}`} icon="💰" wide onClick={() => setShowBreakdown(true)} />
        <StatCard title="Injectables" value={stats.injectables} icon={<Syringe className="w-5 h-5 text-green-400" />} />
        <StatCard title="Pillen" value={stats.orals} icon={<Pill className="w-5 h-5 text-blue-400" />} />
        <StatCard title="Low Stock" value={stats.lowStock} icon={<AlertTriangle className="w-5 h-5 text-orange-400" />} wide orange />
      </div>

      <section className="px-5 mt-8">
        <div className="bg-[#0A0A0A] rounded-3xl p-6">
          <h3 className="font-semibold mb-4">Aktueller Bestand</h3>

          {loading ? (
            <p className="text-center py-12 text-muted-foreground">Lade...</p>
          ) : compounds.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">Noch keine Substanzen</p>
          ) : (
            <div className="space-y-4">
              {compounds.map((c) => {
                const oral = isOral(c)
                const qty = getQuantity(c)
                const percentage = oral ? getPercentage(c) : qty > 0 ? 100 : 0
                const totalPills = getTotalPills(c)

                return (
                  <div key={c.id} className="bg-[#111111] rounded-3xl p-5">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.type}</p>
                        {oral && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {c.pills_per_bottle || 0} Pillen pro Flasche
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        {oral ? (
                          <>
                            <p className="font-semibold">{c.remaining_pills || 0} Pillen</p>
                            <p className="text-xs text-muted-foreground">{c.current_bottles || 0} Flaschen</p>
                          </>
                        ) : (
                          <p className="font-semibold">
                            {qty} {c.packaging}
                          </p>
                        )}
                      </div>
                    </div>

                    {oral && (
                      <div className="mt-4">
                        <div className="h-2.5 rounded-full overflow-hidden bg-[#222]">
                          <div
                            className={`h-full transition-all ${
                              percentage <= 20
                                ? "bg-red-500"
                                : percentage <= 50
                                  ? "bg-orange-400"
                                  : "bg-gradient-to-r from-emerald-400 to-green-500"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-xs mt-1">
                          <span className={percentage <= 20 ? "text-red-500" : percentage <= 50 ? "text-orange-400" : "text-emerald-400"}>
                            {percentage}% verbleibend
                          </span>
                          <span className="text-muted-foreground">
                            {c.remaining_pills || 0}/{totalPills} Pillen
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section className="px-5 mt-8 space-y-6">
        <Panel title="Low Stock Alerts" icon={<AlertTriangle className="w-5 h-5 text-red-500" />} red>
          {lowStockItems.length === 0 ? (
            <p className="text-muted-foreground">Alles im grünen Bereich.</p>
          ) : (
            <div className="space-y-3 text-sm">
              {lowStockItems.map((c) => (
                <div key={c.id}>
                  <p>{c.name}</p>
                  <p className="text-xs text-muted-foreground">Bestand niedrig</p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Vorschau & Planung" icon={<Calendar className="w-5 h-5 text-purple-400" />}>
          <div className="text-center py-10 text-muted-foreground">Noch kein aktiver Cycle</div>
        </Panel>

        <Panel title="Schnellaktionen">
          <div className="space-y-3">
            <Link href="/compounds" className="flex items-center gap-3 bg-[#111111] rounded-2xl p-4">
              <IconBox><Plus className="w-5 h-5" /></IconBox>
              <div className="font-medium">Neue Substanz hinzufügen</div>
            </Link>

            <button onClick={() => setShowStockSelect(true)} className="w-full flex items-center gap-3 bg-[#111111] rounded-2xl p-4 text-left">
              <IconBox orange><Edit className="w-5 h-5" /></IconBox>
              <div className="font-medium">Bestand manuell anpassen</div>
            </button>
          </div>
        </Panel>
      </section>

      <BottomNav />

      {showStockSelect && (
        <Modal title="Substanz auswählen" onClose={() => setShowStockSelect(false)}>
          <div className="space-y-2">
            {compounds.map((c) => (
              <button key={c.id} onClick={() => selectCompoundForEdit(c)} className="w-full text-left bg-[#111111] rounded-2xl p-4">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.type}</p>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {showStockEdit && selected && (
        <Modal title={selected.name} onClose={() => setShowStockEdit(false)}>
          <div className="space-y-6">
        {isOral(selected) ? (
        <>
            <NumberInput
            label="Anzahl Flaschen"
            value={editForm.current_bottles}
            onChange={(v: number) => setEditForm({ ...editForm, current_bottles: v })}
            />

            <NumberInput
            label="Verbleibende Pillen"
            value={editForm.remaining_pills}
            onChange={(v: number) => setEditForm({ ...editForm, remaining_pills: v })}
            />
        </>
        ) : selected.packaging === "Vial" ? (
        <NumberInput
            label="Anzahl Vials"
            value={editForm.current_vials}
            onChange={(v: number) => setEditForm({ ...editForm, current_vials: v })}
        />
        ) : (
        <NumberInput
            label="Anzahl Ampullen"
            value={editForm.current_ampoules}
            onChange={(v: number) => setEditForm({ ...editForm, current_ampoules: v })}
        />
        )}

            <div className="flex gap-3 pt-6">
              <button onClick={() => setShowStockEdit(false)} className="flex-1 py-4 bg-[#111] rounded-2xl">Abbrechen</button>
              <button onClick={saveStockEdit} className="flex-1 py-4 bg-primary rounded-2xl font-semibold">Speichern</button>
            </div>
          </div>
        </Modal>
      )}

      {showBreakdown && (
        <Modal title="Gesamtwert" onClose={() => setShowBreakdown(false)}>
          <div className="space-y-4 pb-8">
            {breakdown.map((item, i) => (
              <div key={i} className="bg-[#111111] rounded-2xl p-5 flex justify-between">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.quantity} {item.unit}</p>
                </div>
                <div className="text-right font-semibold">€{item.totalValue}</div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-6 text-center">
            <p className="opacity-75">Gesamt</p>
            <p className="text-4xl font-bold">€{Math.round(totalValue)}</p>
          </div>
        </Modal>
      )}
    </div>
  )
}

function StatCard({ title, value, icon, wide, orange, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#0A0A0A] rounded-3xl p-5 ${wide ? "col-span-2" : ""} ${orange ? "border border-orange-500/30" : ""} ${onClick ? "cursor-pointer active:scale-[0.985]" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-500/10 rounded-2xl flex items-center justify-center text-2xl">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold ${orange ? "text-orange-400" : ""}`}>{value}</p>
        </div>
      </div>
    </div>
  )
}

function Panel({ title, icon, children, red }: any) {
  return (
    <div className="bg-[#0A0A0A] rounded-3xl p-6">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className={`font-semibold ${red ? "text-red-400" : ""}`}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

function IconBox({ children, orange }: any) {
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${orange ? "bg-orange-500/10" : "bg-blue-500/10"}`}>
      {children}
    </div>
  )
}

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/90 z-[80] flex items-end">
      <div className="bg-[#0A0A0A] w-full rounded-t-3xl p-6 max-h-[85vh] overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose}><X className="w-6 h-6" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function NumberInput({ label, value, onChange }: any) {
  return (
    <div>
      <label className="text-sm text-muted-foreground mb-2 block">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-[#111] rounded-2xl p-4 text-lg"
      />
    </div>
  )
}