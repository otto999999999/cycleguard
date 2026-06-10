import { NextResponse } from "next/server"
import webpush from "web-push"
import { createClient } from "@supabase/supabase-js"

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ORAL_TYPES = [
  "Oral",
  "Medication",
  "AI (Aromatase Inhibitor)",
  "SARM",
  "PCT",
  "Supplement",
]

const todayKey = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const sendPushToUser = async (userId: string, title: string, body: string) => {
  const { data: subscriptions } = await supabaseAdmin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)

  await Promise.all(
    (subscriptions || []).map((sub) =>
      webpush
        .sendNotification(
          sub.subscription,
          JSON.stringify({
            title,
            body,
          })
        )
        .catch((err) => {
          console.error("Push error:", err)
        })
    )
  )
}

const wasPushAlreadySent = async (userId: string, pushKey: string) => {
  const { data } = await supabaseAdmin
    .from("push_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("push_key", pushKey)
    .maybeSingle()

  return !!data
}

const markPushAsSent = async (userId: string, pushKey: string) => {
  await supabaseAdmin.from("push_logs").insert({
    user_id: userId,
    push_key: pushKey,
  })
}

export async function GET() {
  const { data: compounds, error } = await supabaseAdmin
    .from("compounds")
    .select("*")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const groupedByUser = new Map<string, string[]>()

  for (const compound of compounds || []) {
    const isOral = ORAL_TYPES.includes(compound.type)

    if (isOral) {
      const remaining = compound.remaining_pills ?? 0

      if (remaining > 0 && remaining <= 20) {
        const message = `${compound.name}: nur noch ${remaining} Tabletten übrig`

        if (!groupedByUser.has(compound.user_id)) {
          groupedByUser.set(compound.user_id, [])
        }

        groupedByUser.get(compound.user_id)?.push(message)
      }
    } else {
      const remaining =
        compound.packaging === "Vial"
          ? compound.current_vials ?? 0
          : compound.current_ampoules ?? 0

      if (remaining > 0 && remaining <= 1) {
        const unit = compound.packaging || "Einheit"
        const message = `${compound.name}: nur noch ${remaining} ${unit} übrig`

        if (!groupedByUser.has(compound.user_id)) {
          groupedByUser.set(compound.user_id, [])
        }

        groupedByUser.get(compound.user_id)?.push(message)
      }
    }
  }

  for (const [userId, messages] of groupedByUser.entries()) {
    if (messages.length === 0) continue

    const pushKey = `stock-${userId}-${todayKey()}`
    const alreadySent = await wasPushAlreadySent(userId, pushKey)

    if (alreadySent) continue

    await sendPushToUser(
      userId,
      "Low Stock",
      messages.join("\n")
    )

    await markPushAsSent(userId, pushKey)
  }

  return NextResponse.json({
    success: true,
    message: "Stock push sent",
  })
}