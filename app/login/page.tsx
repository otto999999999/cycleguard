"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Lock, Mail, Shield, Ticket } from "lucide-react"

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)

    if (urlParams.get("confirmed") === "true") {
      setIsLogin(true)
      setMessage({
        text: "E-Mail bestätigt. Du kannst dich jetzt einloggen.",
        type: "success",
      })
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        window.location.href = "/"
        return
      }

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
          emailRedirectTo: "https://cycleguard.xyz/login?confirmed=true",
        },
      })

      if (error) throw error

      setMessage({
        text: "Registrierung erfolgreich. Bitte bestätige deine E-Mail.",
        type: "success",
      })
    } catch (err: any) {
      setMessage({
        text: err.message || "Etwas ist schiefgelaufen.",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-120px] h-[320px] w-[320px] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-8">
        <div className="mb-8">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] border border-emerald-400/20 bg-emerald-400/10">
            <Shield className="h-8 w-8 text-emerald-300" />
          </div>

          <h1 className="text-4xl font-black tracking-tight">CycleGuard</h1>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {isLogin
              ? "Melde dich an und öffne dein persönliches Dashboard."
              : "Erstelle deinen Account mit Invite-Code."}
          </p>
        </div>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-black/30 p-1">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true)
                setMessage(null)
              }}
              className={`rounded-xl py-3 text-sm font-bold transition ${
                isLogin ? "bg-emerald-400 text-black" : "text-white/50"
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                setIsLogin(false)
                setMessage(null)
              }}
              className={`rounded-xl py-3 text-sm font-bold transition ${
                !isLogin ? "bg-emerald-400 text-black" : "text-white/50"
              }`}
            >
              Registrieren
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
              <Mail className="h-5 w-5 text-emerald-300" />
              <input
                type="email"
                placeholder="E-Mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent outline-none placeholder:text-white/25"
                required
              />
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
              <Lock className="h-5 w-5 text-emerald-300" />
              <input
                type="password"
                placeholder="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent outline-none placeholder:text-white/25"
                required
              />
            </div>

            {!isLogin && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
                <Ticket className="h-5 w-5 text-emerald-300" />
                <input
                  type="text"
                  placeholder="Invite-Code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full bg-transparent outline-none placeholder:text-white/25"
                  required
                />
              </div>
            )}

            {message && (
              <div
                className={`rounded-2xl border p-4 text-sm ${
                  message.type === "success"
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                    : "border-red-400/20 bg-red-400/10 text-red-300"
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-emerald-400 py-4 font-black text-black shadow-[0_0_28px_rgba(52,211,153,0.25)] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Bitte warten..." : isLogin ? "Einloggen" : "Account erstellen"}
            </button>
          </form>
        </section>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          CycleGuard v0.1 • cycleguard.xyz
        </p>
      </main>
    </div>
  )
}