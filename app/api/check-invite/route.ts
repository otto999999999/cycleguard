import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { inviteCode } = await req.json()
    const code = String(inviteCode || "").trim()

    if (!code) {
      return NextResponse.json(
        { ok: false, message: "Invite-Code fehlt" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("invite_codes")
      .select("id")
      .eq("code", code)
      .eq("active", true)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, message: "Falscher oder deaktivierter Invite-Code" },
        { status: 401 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || "Fehler beim Prüfen" },
      { status: 500 }
    )
  }
}