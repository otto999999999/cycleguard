"use client"

import { useState, useEffect } from "react"
import { WeekCalendar } from "@/components/week-calendar"
import { BottomNav } from "@/components/bottom-nav"
import { Bell, Settings, Plus, Syringe, PlayCircle, User, Download, Trash2, LogOut } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export default function CycleGuardDashboard() {
  const hasActiveCycle = false // Später dynamisch machen

  const [showSettings, setShowSettings] = useState(false)
  const [displayName, setDisplayName] = useState("")

  const saveProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        id: session.user.id, 
        display_name: displayName.trim() 
      })

    if (!error) {
      alert("Anzeigename gespeichert!")
    }
  }
  // Auth Check + User-spezifische Daten
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = "/login"
      }
    })
  }, [])
  // E-Mail dynamisch laden
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        const emailEl = document.getElementById('user-email')
        if (emailEl) emailEl.textContent = session.user.email
      }
    })
  }, [showSettings])
  
  return (
    <div className="min-h-screen bg-[#050505] text-foreground pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-lg border-b border-border/20">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tighter">CycleGuard</h1>
            <p className="text-xs text-muted-foreground -mt-1">Dein Protokoll Manager</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-2xl bg-[#0A0A0A] flex items-center justify-center hover:bg-[#111111] transition-colors border border-border/30">
              <Bell className="w-5 h-5" />
            </button>
            
            <button 
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 rounded-2xl bg-[#0A0A0A] flex items-center justify-center hover:bg-[#111111] transition-colors border border-border/30"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-6">
        <WeekCalendar />

        {/* Cycle Status */}
        <div className="mt-6">
          {hasActiveCycle ? (
            <div className="bg-[#0A0A0A] rounded-3xl p-5 border border-primary/30">
              {/* Echter Cycle Status kommt später */}
            </div>
          ) : (
            <div className="bg-[#0A0A0A] rounded-3xl p-8 text-center border border-border/30">
              <div className="mx-auto w-16 h-16 bg-[#111111] rounded-2xl flex items-center justify-center mb-5">
                <PlayCircle className="w-9 h-9 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium mb-2">Kein aktiver Cycle</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-[280px] mx-auto">
                Starte einen neuen Zyklus, um Fortschritt zu tracken, Wochen zu zählen und alles übersichtlich zu haben.
              </p>
              <Link
                href="/cycle"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3.5 rounded-2xl font-medium flex items-center gap-2 mx-auto inline-flex"
              >
                <Plus className="w-5 h-5" />
                Neuen Cycle starten
              </Link>
            </div>
          )}
        </div>

        {/* Aktive Substanzen */}
        <div className="flex items-center justify-between mt-8 mb-4">
          <h2 className="text-lg font-semibold">Aktive Substanzen</h2>
          <Link href="/compounds" className="text-sm text-primary hover:underline">
            Alle verwalten
          </Link>
        </div>

        <div className="bg-[#0A0A0A] rounded-3xl p-8 text-center border border-border/30">
          <div className="mx-auto w-16 h-16 bg-[#111111] rounded-2xl flex items-center justify-center mb-4">
            <Syringe className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Noch keine Substanzen</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-[260px] mx-auto">
            Füge deine aktuellen Substanzen hinzu, um den Überblick zu behalten.
          </p>
          <Link
            href="/compounds"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-2xl font-medium flex items-center gap-2 mx-auto inline-flex"
          >
            <Plus className="w-4 h-4" />
            Substanz hinzufügen
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <Link 
            href="/logging"
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.985]"
          >
            <Syringe className="w-4 h-4" />
            Dosis eintragen
          </Link>
          
          <Link 
            href="/compounds"
            className="bg-[#0A0A0A] hover:bg-[#111111] border border-border/50 hover:border-primary/50 rounded-2xl py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            Substanz hinzufügen
          </Link>
        </div>
      </main>

      <BottomNav />

      {/* ==================== SETTINGS MODAL ==================== */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-end">
          <div className="bg-[#0A0A0A] w-full rounded-t-3xl p-6 max-h-[88vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-semibold">Einstellungen</h2>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-3xl text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Account Info - Dynamisch */}
              <div className="bg-[#111111] rounded-3xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Mein Account</p>
                    <p className="text-sm text-muted-foreground">Verwalte dein Profil</p>
                  </div>
                </div>

                <div className="py-4 border-t border-border/30">
                  <p className="text-xs text-muted-foreground mb-1">E-Mail Adresse</p>
                  <p className="font-medium text-lg" id="user-email">Wird geladen...</p>
                </div>
              </div>

              {/* Ausloggen */}
              <div 
                className="bg-[#111111] rounded-2xl p-5 flex items-center gap-4 cursor-pointer active:scale-[0.985]"
                onClick={async () => {
                  if (confirm("Wirklich ausloggen?")) {
                    await supabase.auth.signOut()
                    window.location.href = "/login"
                  }
                }}
              >
                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                  <LogOut className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="font-medium text-red-400">Ausloggen</p>
                </div>
              </div>
            </div>

            <div className="mt-10 text-center text-xs text-muted-foreground">
              CycleGuard v0.1 • cycleguard.xyz
            </div>
          </div>
        </div>
      )}
    </div>
  )
}