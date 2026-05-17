"use client"

import { useState, useEffect } from "react"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

interface Compound {
  id: string
  name: string
  concentration?: number
  concentrationUnit?: string
}

export default function LogDosePage() {
  const [compounds, setCompounds] = useState<Compound[]>([])
  const [selectedCompound, setSelectedCompound] = useState<Compound | null>(null)
  const [showCompoundList, setShowCompoundList] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<"IM" | "SubQ" | "Oral">("IM")
  const [injectionSite, setInjectionSite] = useState<"Rechte Schulter" | "Linke Schulter">("Rechte Schulter")
  const [dateDisplay, setDateDisplay] = useState("")
  const [time, setTime] = useState("")
  const [notes, setNotes] = useState("")
  const [saved, setSaved] = useState(false)

  // Compounds nur vom aktuellen User laden
  useEffect(() => {
    loadUserCompounds()

    const now = new Date()
    const y = now.getFullYear()
    const m = (now.getMonth() + 1).toString().padStart(2, "0")
    const d = now.getDate().toString().padStart(2, "0")
    setDateDisplay(`${d}.${m}.${y}`)
    setTime(`${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`)
  }, [])

  const loadUserCompounds = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase
      .from('compounds')
      .select('id, name, concentration, concentration_unit')
      .eq('user_id', session.user.id)
      .order('name')

    if (error) console.error(error)
    else setCompounds(data || [])
  }

  const filteredCompounds = compounds.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectCompound = (compound: Compound) => {
    setSelectedCompound(compound)
    setShowCompoundList(false)
    setSearchQuery("")
    if (compound.concentration) {
      setAmount(compound.concentration.toString())
    }
  }

  const calculatedMl = selectedCompound?.concentration && amount
    ? (parseFloat(amount) / selectedCompound.concentration).toFixed(2)
    : null

  const handleSave = async () => {
    if (!selectedCompound || !amount) {
      alert("Bitte Substanz und Menge auswählen!")
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const dose = {
      name: selectedCompound.name,
      menge: parseFloat(amount),
      methode: method,
      stelle: injectionSite,
      datum: dateDisplay.split('.').reverse().join('-'),
      zeit: time,
      notes: notes.trim() || null,
      user_id: session.user.id
    }

    const { error } = await supabase.from('doses').insert(dose)

    if (error) {
      console.error(error)
      alert("Fehler beim Speichern")
    } else {
      setSaved(true)
      setTimeout(() => {
        window.location.href = "/logging"
      }, 1200)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-foreground pb-32">
      <header className="sticky top-0 z-50 bg-[#050505] border-b border-border/20 px-5 py-4 flex items-center">
        <Link href="/logging" className="mr-4">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-semibold">Dosis eintragen</h1>
      </header>

      <div className="p-5 space-y-8">
        {/* Substanz Auswahl */}
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">SUBSTANZ</label>
          <div 
            className="bg-[#0A0A0A] rounded-3xl p-4 cursor-pointer" 
            onClick={() => setShowCompoundList(!showCompoundList)}
          >
            {selectedCompound ? selectedCompound.name : "Substanz auswählen..."}
          </div>

          {showCompoundList && (
            <div className="mt-2 bg-[#0A0A0A] rounded-3xl p-4">
              <input
                type="text"
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111111] rounded-2xl p-4 mb-3"
              />
              <div className="max-h-60 overflow-y-auto space-y-1">
                {filteredCompounds.length > 0 ? (
                  filteredCompounds.map((c) => (
                    <div 
                      key={c.id} 
                      className="py-3 px-4 hover:bg-[#111111] rounded-2xl cursor-pointer"
                      onClick={() => handleSelectCompound(c)}
                    >
                      {c.name}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">Keine Substanz gefunden</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Menge */}
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">MENGE</label>
          <div className="flex gap-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-[#0A0A0A] rounded-3xl p-5 text-3xl font-medium"
              placeholder="0"
            />
            <div className="bg-[#0A0A0A] rounded-3xl px-6 flex items-center text-lg font-medium">mg</div>
          </div>
          {calculatedMl && <p className="text-emerald-400 text-sm mt-2">≈ {calculatedMl} ml</p>}
        </div>

        {/* Datum & Uhrzeit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">DATUM</label>
            <input type="text" value={dateDisplay} className="w-full bg-[#0A0A0A] rounded-3xl p-4" readOnly />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">UHRZEIT</label>
            <div className="flex gap-2">
              <input type="text" value={time} className="flex-1 bg-[#0A0A0A] rounded-3xl p-4" readOnly />
              <button 
                onClick={() => {
                  const now = new Date()
                  setTime(`${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`)
                }}
                className="px-5 bg-[#0A0A0A] rounded-3xl text-sm"
              >
                Jetzt
              </button>
            </div>
          </div>
        </div>

        {/* Methode */}
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">METHODE</label>
          <div className="grid grid-cols-3 gap-2">
            {["IM", "SubQ", "Oral"].map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m as any)}
                className={`py-3 rounded-2xl text-sm font-medium transition-all ${method === m ? "bg-primary text-white" : "bg-[#0A0A0A]"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Injektionsstelle */}
        {(method === "IM" || method === "SubQ") && (
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">INJEKTIONSSTELLE <span className="text-red-500">*</span></label>
            <select 
              value={injectionSite} 
              onChange={(e) => setInjectionSite(e.target.value as "Rechte Schulter" | "Linke Schulter")}
              className="w-full bg-[#0A0A0A] rounded-3xl p-4"
            >
              <option value="Rechte Schulter">Rechte Schulter</option>
              <option value="Linke Schulter">Linke Schulter</option>
            </select>
          </div>
        )}

        {/* Notizen */}
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">NOTIZEN (OPTIONAL)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notizen hinzufügen..."
            rows={3}
            className="w-full bg-[#0A0A0A] rounded-3xl p-4 border border-border/30 focus:border-primary/50 resize-none"
          />
        </div>

        {/* Speichern Button */}
        <button
          onClick={handleSave}
          disabled={!selectedCompound || !amount}
          className={`w-full py-5 rounded-3xl font-semibold text-lg transition-all ${saved ? "bg-emerald-500" : "bg-primary disabled:bg-gray-700"}`}
        >
          {saved ? "✅ Dosis gespeichert!" : "Dosis eintragen"}
        </button>
      </div>
    </div>
  )
}