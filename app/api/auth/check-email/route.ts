import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { exists: false, error: "E-Mail fehlt." },
        { status: 400 }
      )
    }

    const cleanEmail = String(email).trim().toLowerCase()

    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (error) {
      return NextResponse.json(
        { exists: false, error: error.message },
        { status: 500 }
      )
    }

    const exists = data.users.some(
      (user) => user.email?.toLowerCase() === cleanEmail
    )

    return NextResponse.json({ exists })
  } catch (error: any) {
    return NextResponse.json(
      { exists: false, error: error.message || "Prüfung fehlgeschlagen." },
      { status: 500 }
    )
  }
}