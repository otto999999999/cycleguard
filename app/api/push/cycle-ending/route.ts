import { NextResponse } from "next/server"
import webpush from "web-push"
import { createClient } from "@supabase/supabase-js"

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || "mailto:lenwweith99@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
          JSON.stringify({ title, body })
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
  const { data: cycles, error } = await supabaseAdmin
    .from("cycles")
    .select("*")
    .eq("active", true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const cycle of cycles || []) {
    if (!cycle.start_date || !cycle.duration_weeks) continue

    const start = new Date(cycle.start_date)
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setDate(start.getDate() + cycle.duration_weeks * 7)

    const daysLeft = Math.ceil(
      (end.getTime() - today.getTime()) / 86400000
    )

    if (![14, 7, 3, 1].includes(daysLeft)) continue

    const pushKey = `cycle-ending-${cycle.id}-${daysLeft}-${todayKey()}`

    const alreadySent = await wasPushAlreadySent(cycle.user_id, pushKey)
    if (alreadySent) continue

    await sendPushToUser(
      cycle.user_id,
      "Cycle endet bald",
      `${cycle.name || "Dein Cycle"} endet in ${daysLeft} Tag${daysLeft === 1 ? "" : "en"}.`
    )

    await markPushAsSent(cycle.user_id, pushKey)
  }

  return NextResponse.json({
    success: true,
    message: "Cycle ending push sent",
  })
}