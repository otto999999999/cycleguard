"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ChevronLeft,
  Copy,
  CheckCircle,
  Smartphone,
  Activity,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function StepsSetupPage() {
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(true)

  const syncUrl = "https://cycleguard.xyz/api/steps/sync"
  const shortcutUrl =
    "https://www.icloud.com/shortcuts/9f2413835d6d457c92d786bdda876aa9"

  useEffect(() => {
    loadToken()
  }, [])

  const loadToken = async () => {
    setLoading(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      toast.error("Nicht eingeloggt")
      setLoading(false)
      return
    }

    const res = await fetch("/api/steps/token?create=true", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    const json = await res.json()

    if (!res.ok) {
      toast.error(json.error || "Token konnte nicht geladen werden")
      setLoading(false)
      return
    }

    setToken(json.token)
    setLoading(false)
  }

  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} kopiert`)
  }

  const exampleJson = `{
  "date": "2026-07-10",
  "steps": 8421,
  "token": "${token || "DEIN_TOKEN"}"
}`

  return (
    <div className="min-h-screen bg-[#050505] pb-20 text-white">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-120px] left-[-80px] h-[320px] w-[320px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[300px] w-[300px] rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <Link
            href="/performance/strength"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>

          <div className="text-center">
            <h1 className="text-xl font-black">Schritte einrichten</h1>
            <p className="text-xs text-muted-foreground">
              Apple Health über Kurzbefehle
            </p>
          </div>

          <div className="h-10 w-10" />
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-5 px-5 pt-6">
        <section className="overflow-hidden rounded-[34px] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/[0.13] via-white/[0.04] to-[#080808] p-6 shadow-[0_0_45px_rgba(34,211,238,0.12)]">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[24px] border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
              <Activity className="h-7 w-7" />
            </div>

            <div>
              <h2 className="text-2xl font-black">Apple Health Sync</h2>
              <p className="text-sm text-muted-foreground">
                Schritte automatisch per iPhone Kurzbefehle senden.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/30 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Deine API URL
            </p>

            <div className="flex items-center gap-3">
              <p className="min-w-0 flex-1 break-all font-mono text-sm text-cyan-300">
                {syncUrl}
              </p>

              <button
                onClick={() => copyText(syncUrl, "URL")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 active:scale-95"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-white/10 bg-black/30 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Dein Token
            </p>

            {loading ? (
              <p className="text-sm text-muted-foreground">Lade Token...</p>
            ) : (
              <div className="flex items-center gap-3">
                <p className="min-w-0 flex-1 break-all font-mono text-sm text-emerald-300">
                  {token}
                </p>

                <button
                  onClick={() => copyText(token, "Token")}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 active:scale-95"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <a
            href={shortcutUrl}
            className="mt-4 flex w-full items-center justify-center rounded-[22px] bg-gradient-to-r from-cyan-400 to-blue-400 py-4 font-black text-black shadow-[0_0_25px_rgba(34,211,238,0.25)] active:scale-[0.98]"
          >
            Kurzbefehl installieren
          </a>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-cyan-300" />
            <h2 className="text-2xl font-black">Tutorial</h2>
          </div>

          <div className="space-y-4">
            {[
              "Drücke oben auf „Kurzbefehl installieren“.",
              "Der iCloud-Link öffnet die Kurzbefehle-App.",
              "Füge den Kurzbefehl zu deiner Sammlung hinzu.",
              "Kopiere deinen CycleGuard Token von oben.",
              "Öffne den importierten Kurzbefehl.",
              "Wenn eine abfrage kommt auf immer erlauben drücken.",
              "Gehe zur Aktion „Inhalte von URL abrufen“.",
              "Prüfe: URL muss https://cycleguard.xyz/api/steps/sync sein.",
              "Prüfe: Methode muss POST sein.",
              "Gehe zu „Haupttext anfordern: JSON“.",
              "Ersetze bei token den Platzhalter mit deinem echten Token.",
              "Drücke Play zum Testen.",
              "Wenn success true kommt, ist alles richtig.",
            ].map((step, index) => (
              <div
                key={step}
                className="flex gap-3 rounded-[22px] border border-white/10 bg-white/[0.035] p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-sm font-black text-black">
                  {index + 1}
                </div>

                <p className="text-sm leading-6 text-white/80">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-300" />
            <h2 className="text-xl font-black">JSON Beispiel</h2>
          </div>

          <pre className="overflow-x-auto rounded-[22px] border border-white/10 bg-black/40 p-4 text-xs text-white/80">
            {exampleJson}
          </pre>

          <button
            onClick={() => copyText(exampleJson, "JSON")}
            className="mt-4 w-full rounded-[22px] bg-gradient-to-r from-cyan-400 to-blue-400 py-4 font-black text-black shadow-[0_0_25px_rgba(34,211,238,0.25)] active:scale-[0.98]"
          >
            JSON kopieren
          </button>
        </section>
      </main>
    </div>
  )
}