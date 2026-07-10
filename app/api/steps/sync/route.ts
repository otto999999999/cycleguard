import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const token = body.token
    const date = body.date
    const steps = Number(body.steps)

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 })
    }

    if (!date || Number.isNaN(steps)) {
      return NextResponse.json(
        { error: "Missing date or steps" },
        { status: 400 }
      )
    }

    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from("user_step_tokens")
      .select("user_id")
      .eq("token", token)
      .maybeSingle()

    if (tokenError) {
      return NextResponse.json({ error: tokenError.message }, { status: 500 })
    }

    if (!tokenRow?.user_id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { error } = await supabaseAdmin
      .from("daily_steps")
      .upsert(
        {
          user_id: tokenRow.user_id,
          date,
          steps,
          source: "apple_shortcuts",
          sync_token: token,
        },
        {
          onConflict: "user_id,date",
        }
      )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      date,
      steps,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    )
  }
}