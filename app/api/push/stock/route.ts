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

const getDailyUses = (stackItem: any) => {
  const frequency = stackItem?.frequency || "Daily"

  if (frequency === "Twice Daily") return 2
  if (frequency === "Daily") return 1
  if (frequency === "EOD") return 0.5
  if (frequency === "E3D") return 1 / 3
  if (frequency === "Weekly") return 1 / 7

  if (frequency === "Custom") {
    const customCount = Array.isArray(stackItem?.customDays)
      ? stackItem.customDays.length
      : 0

    return customCount > 0 ? customCount / 7 : 1
  }

  return 1
}

const getUsesUntilEmpty = (compound: any, stackItem: any) => {
  const doseAmount = Number(stackItem?.doseAmount ?? 0)
  const concentration = Number(compound.concentration ?? 0)
  const sizeMl = Number(compound.size_ml ?? 0)

  const totalMl =
    compound.packaging === "Vial"
      ? Number(compound.current_vials ?? 0) * sizeMl
      : Number(compound.current_ampoules ?? 0) * sizeMl

  const totalMg = totalMl * concentration

  if (doseAmount <= 0 || totalMg <= 0) return 0

  return Math.floor(totalMg / doseAmount)
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

const { data: cycles } = await supabaseAdmin
  .from("cycles")
  .select("*")
  .eq("active", true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const groupedByUser = new Map<string, string[]>()

  for (const compound of compounds || []) {
    const isOral = ORAL_TYPES.includes(compound.type)

if (isOral) {
  const remaining = Number(compound.remaining_pills ?? 0)

  const activeCycle = (cycles || []).find(
    (cycle) => cycle.user_id === compound.user_id
  )

  const stack = [
    ...(activeCycle?.main_stack || []),
    ...(activeCycle?.pct_stack || []),
  ]

  const stackItem = stack.find(
    (item) =>
      item.id === compound.id ||
      item.name?.toLowerCase() === compound.name?.toLowerCase()
  )

  const dailyUses = getDailyUses(stackItem)

  const dosePerPill = Number(compound.dose_per_pill ?? 0)
  const doseAmount = Number(stackItem?.doseAmount ?? 0)

  const pillsPerUse =
    dosePerPill > 0 && doseAmount > 0
      ? doseAmount / dosePerPill
      : 1

  const pillsPerDay = pillsPerUse * dailyUses

  const daysLeft =
    pillsPerDay > 0
      ? Math.floor(remaining / pillsPerDay)
      : remaining

  if (remaining > 0 && daysLeft <= 14) {
    const message = `${compound.name}: reicht noch ca. ${daysLeft} Tag${
      daysLeft === 1 ? "" : "e"
    } (${remaining} Tabletten)`

    if (!groupedByUser.has(compound.user_id)) {
      groupedByUser.set(compound.user_id, [])
    }

    groupedByUser.get(compound.user_id)?.push(message)
  }
} else {
  const activeCycle = (cycles || []).find(
    (cycle) => cycle.user_id === compound.user_id
  )

  const stack = [
    ...(activeCycle?.main_stack || []),
    ...(activeCycle?.pct_stack || []),
  ]

  const stackItem = stack.find(
    (item) =>
      item.id === compound.id ||
      item.name?.toLowerCase() === compound.name?.toLowerCase()
  )

  const usesLeft = getUsesUntilEmpty(compound, stackItem)

  if (usesLeft > 0 && usesLeft <= 4) {
    const message = `${compound.name}: reicht noch ca. ${usesLeft} Injektion${
      usesLeft === 1 ? "" : "en"
    }`

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