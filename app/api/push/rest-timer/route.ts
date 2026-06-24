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

export async function GET() {
  const now = new Date().toISOString()

  const { data: timers, error } = await supabaseAdmin
    .from("rest_timers")
    .select("*")
    .lte("ends_at", now)
    .is("notified_at", null)
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  for (const timer of timers || []) {
    const { data: subscriptions } = await supabaseAdmin
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", timer.user_id)

    for (const sub of subscriptions || []) {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title: "Pause vorbei",
            body: "Weiter trainieren 💪",
          })
        )
      } catch (err) {
        console.error("Rest timer push failed:", err)
      }
    }

    await supabaseAdmin
      .from("rest_timers")
      .update({
        notified_at: new Date().toISOString(),
      })
      .eq("id", timer.id)
  }

  return NextResponse.json({
    ok: true,
    checked: timers?.length || 0,
  })
}