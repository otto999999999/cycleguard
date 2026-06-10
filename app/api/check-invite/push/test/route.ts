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

export async function POST() {
  const { data: subscriptions, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await Promise.all(
    (subscriptions || []).map((sub) =>
      webpush.sendNotification(
        sub.subscription,
        JSON.stringify({
          title: "CycleGuard Test",
          body: "Push vom PC aufs Handy funktioniert 🔥",
        })
      ).catch(() => null)
    )
  )

  return NextResponse.json({ success: true })
}