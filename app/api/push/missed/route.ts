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

const DAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
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
const todayKey = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const getDueForToday = (cycle: any) => {
  if (!cycle?.start_date) return []

  const today = new Date()
  const dayShort = DAYS[today.getDay()]
  const stack = [...(cycle.main_stack || []), ...(cycle.pct_stack || [])]

  return stack.filter((item) => {
    const start = new Date(cycle.start_date)
    const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000)

    if (diffDays < 0) return false

    const currentWeek = Math.floor(diffDays / 7) + 1
    const startWeek = item.startWeek || 1
    const endWeek = item.endWeek || cycle.duration_weeks || 12

    if (currentWeek < startWeek || currentWeek > endWeek) return false

    if (item.frequency === "Daily" || item.frequency === "Twice Daily") return true
    if (item.frequency === "Custom") return (item.customDays || []).includes(dayShort)
    if (item.frequency === "EOD") return diffDays % 2 === 0
    if (item.frequency === "E3D") return diffDays % 3 === 0
    if (item.frequency === "Weekly") return diffDays % 7 === 0

    return false
  })
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

export async function GET() {
  const { data: cycles, error } = await supabaseAdmin
    .from("cycles")
    .select("*")
    .eq("active", true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

for (const cycle of cycles || []) {
  const dueToday = getDueForToday(cycle)

  if (dueToday.length === 0) continue

  const pushKey = `missed-${cycle.user_id}-${cycle.id}-${todayKey()}`

  const alreadySent = await wasPushAlreadySent(cycle.user_id, pushKey)

  if (alreadySent) continue
const { data: doses } = await supabaseAdmin
  .from("doses")
  .select("*")
  .eq("user_id", cycle.user_id)
  .eq("datum", todayKey())

const openItems = dueToday.filter((item) => {
  return !(doses || []).some((dose) => dose.compound_id === item.id)
})

if (openItems.length === 0) continue
const body = openItems
  .map((item) => `${item.name} wurde heute noch nicht geloggt.`)
  .join("\n")

  const title =
  cycle.plan_category === "supplement"
    ? "Supplemente vergessen?"
    : "Dosis vergessen?"
  await sendPushToUser(cycle.user_id, title, body)
  await markPushAsSent(cycle.user_id, pushKey)
}

  return NextResponse.json({
    success: true,
    message: "Missed dose push checked",
  })
}