"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"

const INVITE_CODE = "CYCLE2026"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "">("")
  const router = useRouter()
  const searchParams = useSearchParams()

  // Prüfen ob gerade E-Mail bestätigt wurde
  useEffect(() => {
    const confirmed = searchParams.get('confirmed')
    if (confirmed === 'true') {
      setMessage("E-Mail erfolgreich bestätigt! Du kannst dich jetzt anmelden.")
      setMessageType("success")
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push("/")
    })
  }, [searchParams, router])

  const handleAuth = async () => {
    setLoading(true)
    setMessage("")

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push("/")
      } else {
        if (inviteCode !== INVITE_CODE) throw new Error("Falscher Access Code")
        
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: "https://cycleguard.xyz/login?confirmed=true"
          }
        })
        if (error) throw error

        setMessage("Registrierung erfolgreich! Bitte bestätige deine E-Mail und logge dich danach ein.")
        setMessageType("success")
      }
    } catch (error: any) {
      setMessage(error.message)
      setMessageType("error")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-[#0A0A0A] rounded-3xl p-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tighter">CycleGuard</h1>
          <p className="text-muted-foreground mt-2">Dein Protokoll Manager</p>
        </div>

        <div className="flex gap-2 mb-8 bg-[#111111] rounded-2xl p-1">
          <button onClick={() => setIsLogin(true)} className={`flex-1 py-3 rounded-xl text-sm font-medium ${isLogin ? "bg-primary text-white" : ""}`}>
            Anmelden
          </button>
          <button onClick={() => setIsLogin(false)} className={`flex-1 py-3 rounded-xl text-sm font-medium ${!isLogin ? "bg-primary text-white" : ""}`}>
            Registrieren
          </button>
        </div>

        <input type="email" placeholder="E-Mail Adresse" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#111111] rounded-2xl p-4 mb-3" />
        <input type="password" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#111111] rounded-2xl p-4 mb-4" />

        {!isLogin && (
          <input type="text" placeholder="Access Code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} className="w-full bg-[#111111] rounded-2xl p-4 mb-6" />
        )}

        <button 
          onClick={handleAuth}
          disabled={loading || !email || !password || (!isLogin && !inviteCode)}
          className="w-full bg-primary py-4 rounded-2xl font-semibold disabled:opacity-50"
        >
          {loading ? "..." : isLogin ? "Anmelden" : "Registrieren"}
        </button>

        {message && (
          <p className={`text-center mt-6 text-sm ${messageType === "success" ? "text-emerald-400" : "text-red-500"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}