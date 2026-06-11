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

const weekDays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]

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
  const todayShort = weekDays[new Date().getDay()]

  const { data: days, error } = await supabaseAdmin
    .from("training_days")
    .select("*")
    .contains("weekdays", [todayShort])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  for (const day of days || []) {
    const pushKey = `training-${day.user_id}-${day.id}-${todayKey()}`

    const alreadySent = await wasPushAlreadySent(day.user_id, pushKey)
    if (alreadySent) continue

    const { data: exercises } = await supabaseAdmin
      .from("training_day_exercises")
      .select("id")
      .eq("training_day_id", day.id)

    const exerciseCount = exercises?.length || 0

    await sendPushToUser(
      day.user_id,
      "Heute Training",
      `${day.name} • ${exerciseCount} Übungen geplant`
    )

    await markPushAsSent(day.user_id, pushKey)
  }

  return NextResponse.json({
    success: true,
    message: "Training push sent",
  })
}