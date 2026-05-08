"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function OnboardingPage() {
  const [displayName, setDisplayName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login")
      }
    }
    checkUser()
  }, [router])

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError("Bitte gib einen Anzeigenamen ein")
      return
    }

    setLoading(true)
    setError("")

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      router.push("/login")
      return
    }

    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: session.user.id,
        display_name: displayName.trim()
      })

    if (insertError) {
      setError("Fehler: " + insertError.message)
    } else {
      router.push("/") // Zur Hauptseite
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-[#0A0A0A] rounded-3xl p-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold">Willkommen bei CycleGuard!</h1>
          <p className="text-muted-foreground mt-3">Wie sollen wir dich nennen?</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-sm text-muted-foreground block mb-2">
              Anzeigename <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="z.B. Len, BigLen, CycleKing..."
              className="w-full bg-[#111111] rounded-2xl p-4 text-lg"
              maxLength={20}
            />
          </div>

          {error && <p className="text-red-500 text-center">{error}</p>}

          <button
            onClick={handleSave}
            disabled={loading || !displayName.trim()}
            className="w-full bg-primary py-4 rounded-2xl font-semibold disabled:opacity-50"
          >
            {loading ? "Wird gespeichert..." : "Profil erstellen & Loslegen"}
          </button>
        </div>
      </div>
    </div>
  )
}