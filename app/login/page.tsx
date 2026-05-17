"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [loading, setLoading] = useState(false)

  // Prüft ob ?confirmed=true in der URL ist
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get("confirmed") === "true") {
      setMessage({ 
        text: "✅ E-Mail erfolgreich bestätigt! Du kannst dich jetzt einloggen.", 
        type: "success" 
      })
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isLogin) {
             const { error } = await supabase.auth.signInWithPassword({ email, password })
             if (error) throw error
             window.location.href = "/"
          } else {
            const inviteRes = await fetch("/api/check-invite", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inviteCode }),
        })

        const inviteResult = await inviteRes.json()

        if (!inviteRes.ok || !inviteResult.ok) {
          throw new Error(inviteResult.message || "Falscher Invite-Code")
        }
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { 
            emailRedirectTo: "https://cycleguard.xyz/login?confirmed=true" 
          }
        })
        if (error) throw error
        
        setMessage({ 
          text: "✅ Registrierung erfolgreich! Bitte bestätige deine E-Mail.", 
          type: "success" 
        })
      }
    } catch (err: any) {
      setMessage({ 
        text: err.message || "Etwas ist schiefgelaufen", 
        type: "error" 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tighter">CycleGuard</h1>
          <p className="text-muted-foreground mt-2">Dein Cycle Protokoll Manager</p>
        </div>

        <div className="bg-[#0A0A0A] rounded-3xl p-8">
          <div className="flex border-b border-border/30 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 pb-4 text-lg font-medium ${isLogin ? "border-b-2 border-primary text-white" : "text-muted-foreground"}`}
            >
              Einloggen
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 pb-4 text-lg font-medium ${!isLogin ? "border-b-2 border-primary text-white" : "text-muted-foreground"}`}
            >
              Registrieren
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="email"
                placeholder="E-Mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#111111] rounded-2xl p-4 outline-none"
                required
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#111111] rounded-2xl p-4 outline-none"
                required
              />
            </div>

            {!isLogin && (
              <div>
                <input
                  type="text"
                  placeholder="Invite Code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full bg-[#111111] rounded-2xl p-4 outline-none"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 py-4 rounded-2xl font-semibold disabled:opacity-50"
            >
              {loading ? "Wird verarbeitet..." : isLogin ? "Einloggen" : "Registrieren"}
            </button>
          </form>

          {message && (
            <p className={`mt-4 text-center text-sm ${message.type === "success" ? "text-emerald-400" : "text-red-500"}`}>
              {message.text}
            </p>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          CycleGuard v0.1 • cycleguard.xyz
        </p>
      </div>
    </div>
  )
}