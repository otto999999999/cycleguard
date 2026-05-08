"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleAuth = async () => {
    setLoading(true)
    setMessage("")

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage("Falsche E-Mail oder Passwort")
      else window.location.href = "/"
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage("Fehler bei Registrierung")
      else setMessage("Bestätigungs-Mail gesendet! Schau in deinen Spam-Ordner.")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-[#0A0A0A] rounded-3xl p-8">
        <h1 className="text-3xl font-bold text-center mb-8">CycleGuard</h1>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setIsLogin(true)} className={`flex-1 py-3 rounded-2xl ${isLogin ? "bg-primary" : "bg-[#111111]"}`}>Anmelden</button>
          <button onClick={() => setIsLogin(false)} className={`flex-1 py-3 rounded-2xl ${!isLogin ? "bg-primary" : "bg-[#111111]"}`}>Registrieren</button>
        </div>

        <input
          type="email"
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-[#111111] rounded-2xl p-4 mb-3"
        />
        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-[#111111] rounded-2xl p-4 mb-6"
        />

        <button 
          onClick={handleAuth} 
          disabled={loading}
          className="w-full bg-primary py-4 rounded-2xl font-semibold disabled:opacity-50"
        >
          {loading ? "..." : isLogin ? "Anmelden" : "Registrieren"}
        </button>

        {message && <p className="text-center mt-4 text-sm">{message}</p>}

        <p className="text-center text-xs text-muted-foreground mt-8">
          Daten bleiben privat pro Account
        </p>
      </div>
    </div>
  )
}