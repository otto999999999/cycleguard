import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ message: "Nicht eingeloggt." }, { status: 401 })
    }

    const {
      data: { user: requester },
      error: requesterError,
    } = await supabaseAdmin.auth.getUser(token)

    if (requesterError || !requester) {
      return NextResponse.json({ message: "Session ungültig." }, { status: 401 })
    }

    const { data: requesterProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", requester.id)
      .maybeSingle()

    if (requesterProfile?.role !== "owner") {
      return NextResponse.json({ message: "Kein Owner-Zugriff." }, { status: 403 })
    }

const [
  authUserResult,
  profileResult,
  compoundsResult,
  cyclesResult,
  dosesResult,
  trainingPlansResult,
  trainingDaysResult,
  trainingDayExercisesResult,
  workoutSessionsResult,
  pushResult,
] = await Promise.all([
  supabaseAdmin.auth.admin.getUserById(userId),

  supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle(),

  supabaseAdmin
    .from("compounds")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false }),

  supabaseAdmin
    .from("cycles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false }),

  supabaseAdmin
    .from("doses")
    .select("*")
    .eq("user_id", userId)
    .order("datum", { ascending: false })
    .order("zeit", { ascending: false })
    .limit(200),

  supabaseAdmin
    .from("training_plans")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false }),

  supabaseAdmin
    .from("training_days")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false }),

  supabaseAdmin
    .from("training_day_exercises")
    .select(`
      *,
      exercise_library (
        id,
        name,
        category,
        muscle_group,
        tracking_type
      )
    `)
    .eq("user_id", userId)
    .order("position", { ascending: true }),

  supabaseAdmin
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(100),

  supabaseAdmin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId),
])

    const sessionIds = workoutSessionsResult.data?.map((session) => session.id) || []

const { data: workoutSets } =
  sessionIds.length > 0
    ? await supabaseAdmin
        .from("workout_sets")
        .select("*")
        .in("session_id", sessionIds)
        .order("set_number", { ascending: true })
    : { data: [] }

    const compounds = compoundsResult.data || []
    const cycles = cyclesResult.data || []
    const doses = dosesResult.data || []
    const workoutSessions = workoutSessionsResult.data || []
    const trainingPlans = trainingPlansResult.data || []
    const trainingDays = trainingDaysResult.data || []
    const trainingDayExercises = trainingDayExercisesResult.data || []

    const finishedWorkouts = workoutSessions.filter((s) => s.finished_at)
    const activeCycles = cycles.filter((c) => c.active)
    const supplementPlans = cycles.filter((c) => c.plan_category === "supplement")
    const steroidCycles = cycles.filter((c) => c.plan_category !== "supplement")

    const stats = {
      compounds: compounds.length,
      cycles: steroidCycles.length,
      supplementPlans: supplementPlans.length,
      activeCycles: activeCycles.length,
      doses: doses.length,
      trainingPlans: trainingPlans.length,
      trainingDays: trainingDays.length,
      workouts: workoutSessions.length,
      finishedWorkouts: finishedWorkouts.length,
      workoutSets: workoutSets?.length || 0,
      pushDevices: pushResult.data?.length || 0,
    }

    return NextResponse.json({
      authUser: {
        id: authUserResult.data.user?.id,
        email: authUserResult.data.user?.email,
        phone: authUserResult.data.user?.phone,
        created_at: authUserResult.data.user?.created_at,
        last_sign_in_at: authUserResult.data.user?.last_sign_in_at,
        email_confirmed_at: authUserResult.data.user?.email_confirmed_at,
      },
      profile: profileResult.data,
      stats,
      gym: {
        trainingPlans,
        trainingDays,
        workoutSessions,
        trainingDayExercises,
        workoutSets: workoutSets || [],
      },
      substances: {
        compounds,
        cycles: steroidCycles,
        supplementPlans,
        activeCycles,
        doses,
      },
      pushSubscriptions: pushResult.data || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Admin User Fehler." },
      { status: 500 }
    )
  }
}