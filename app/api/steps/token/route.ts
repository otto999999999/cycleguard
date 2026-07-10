import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const createToken = () => {
  return `steps_${crypto.randomUUID()}_${crypto.randomUUID()}`
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")

    if (!authHeader) {
      return NextResponse.json({ error: "Missing authorization" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("user_step_tokens")
      .select("token")
      .eq("user_id", user.id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

if (existing?.token) {
  return NextResponse.json({
    hasToken: true,
    token: existing.token,
  })
}

const url = new URL(req.url)
const shouldCreate = url.searchParams.get("create") === "true"

if (!shouldCreate) {
  return NextResponse.json({
    hasToken: false,
    token: null,
  })
}

const newToken = createToken()

const { error: insertError } = await supabaseAdmin
  .from("user_step_tokens")
  .insert({
    user_id: user.id,
    token: newToken,
  })

if (insertError) {
  return NextResponse.json({ error: insertError.message }, { status: 500 })
}

return NextResponse.json({
  hasToken: true,
  token: newToken,
})
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    )
  }
}