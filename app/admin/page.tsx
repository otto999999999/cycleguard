"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Crown,
  Dumbbell,
  Loader2,
  Plus,
  Save,
  Search,
  Shield,
  Ticket,
  Trash2,
  UserCog,
  Users,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type Role = "owner" | "premium" | "normal"

export default function AdminPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [email, setEmail] = useState("")

  const [activeTab, setActiveTab] = useState<"users" | "invites" | "exercises">("users")
  const [search, setSearch] = useState("")

  const [users, setUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [exercises, setExercises] = useState<any[]>([])
  const [selectedExercise, setSelectedExercise] = useState<any>(null)
const [showArchivedExercises, setShowArchivedExercises] = useState(false)
const [editingExercise, setEditingExercise] = useState({
  name: "",
  category: "",
  muscle_group: "",
  tracking_type: "reps",
})
  const [inviteCodes, setInviteCodes] = useState<any[]>([])

  const [newInviteCode, setNewInviteCode] = useState("")
  const [newInviteNote, setNewInviteNote] = useState("")
const [newInviteMaxUses, setNewInviteMaxUses] = useState("")

  const [newExercise, setNewExercise] = useState({
    name: "",
    category: "",
    muscle_group: "",
    tracking_type: "reps",
  })

  const [stats, setStats] = useState({
    users: 0,
    compounds: 0,
    cycles: 0,
    exercises: 0,
  })

  useEffect(() => {
    checkOwnerAndLoad()
  }, [])

  const checkOwnerAndLoad = async () => {
    setLoading(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      router.replace("/login")
      return
    }

    setEmail(session.user.email || "")

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle()

    if (profile?.role !== "owner") {
      router.replace("/")
      return
    }

    setIsOwner(true)
    await loadAdminData()
    setLoading(false)
  }

  const loadAdminData = async () => {
    const [
      { data: usersData, count: usersCount },
      { count: compoundsCount },
      { count: cyclesCount },
      { data: exercisesData, count: exercisesCount },
      { data: inviteData },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, display_name, role, banned, created_at", { count: "exact" })
        .order("created_at", { ascending: false }),

      supabase
        .from("compounds")
        .select("*", { count: "exact", head: true }),

      supabase
        .from("cycles")
        .select("*", { count: "exact", head: true }),

supabase
  .from("exercise_library")
  .select("id, name, category, muscle_group, tracking_type, archived", { count: "exact" })
  .order("name"),

      supabase
        .from("invite_codes")
        .select("*")
        .order("created_at", { ascending: false }),
    ])

    setUsers(usersData || [])
    setExercises(exercisesData || [])
    setInviteCodes(inviteData || [])

    setStats({
      users: usersCount || 0,
      compounds: compoundsCount || 0,
      cycles: cyclesCount || 0,
      exercises: exercisesCount || 0,
    })
  }

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return users

    return users.filter((user) =>
      `${user.username || ""} ${user.display_name || ""} ${user.role || ""}`
        .toLowerCase()
        .includes(q)
    )
  }, [users, search])

const filteredExercises = useMemo(() => {
  const q = search.toLowerCase().trim()

  return exercises
    .filter((exercise) =>
      showArchivedExercises ? true : !exercise.archived
    )
    .filter((exercise) => {
      if (!q) return true

      return `${exercise.name || ""} ${exercise.category || ""} ${exercise.muscle_group || ""}`
        .toLowerCase()
        .includes(q)
    })
}, [exercises, search, showArchivedExercises])

const existingCategories = useMemo(() => {
  return Array.from(
    new Set(
      exercises
        .map((exercise) => exercise.category)
        .filter(Boolean)
    )
  ).sort()
}, [exercises])

const existingMuscleGroups = useMemo(() => {
  return Array.from(
    new Set(
      exercises
        .map((exercise) => exercise.muscle_group)
        .filter(Boolean)
    )
  ).sort()
}, [exercises])


  const updateUserRole = async (userId: string, role: Role) => {
    setSaving(true)

    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId)

    if (error) {
      alert(error.message)
    } else {
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, role } : user
        )
      )
    }

    setSaving(false)
  }

const toggleUserBan = async (user: any) => {
  if (user.role === "owner") {
    alert("Owner kann nicht gesperrt werden.")
    return
  }

  const nextBanned = !user.banned

  if (
    !confirm(
      nextBanned
        ? `User "${user.display_name || user.username}" wirklich sperren?`
        : `User "${user.display_name || user.username}" entsperren?`
    )
  ) {
    return
  }

  setSaving(true)

  const { error } = await supabase
    .from("profiles")
    .update({ banned: nextBanned })
    .eq("id", user.id)

  if (error) {
    alert(error.message)
  } else {
    setUsers((prev) =>
      prev.map((item) =>
        item.id === user.id ? { ...item, banned: nextBanned } : item
      )
    )
  }

  setSaving(false)
}

  const createInviteCode = async () => {
    const code = newInviteCode.trim()

    if (!code) {
      alert("Code eingeben.")
      return
    }

    setSaving(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

const { error } = await supabase.from("invite_codes").insert({
  code,
  active: true,
  created_by: user?.id,
  note: newInviteNote.trim() || null,
  max_uses: newInviteMaxUses ? Number(newInviteMaxUses) : null,
  
})

    if (error) {
      alert(error.message)
    } else {
      setNewInviteCode("")
setNewInviteNote("")
setNewInviteMaxUses("")
await loadAdminData()
    }

    setSaving(false)
  }

  const toggleInviteCode = async (invite: any) => {
    setSaving(true)

    const { error } = await supabase
      .from("invite_codes")
      .update({ active: !invite.active })
      .eq("id", invite.id)

    if (error) {
      alert(error.message)
    } else {
      await loadAdminData()
    }

    setSaving(false)
  }

  const deleteInviteCode = async (invite: any) => {
  if (!confirm(`Invite-Code "${invite.code}" wirklich löschen?`)) return

  setSaving(true)

  const { error } = await supabase
    .from("invite_codes")
    .delete()
    .eq("id", invite.id)

  if (error) {
    alert(error.message)
  } else {
    setInviteCodes((prev) => prev.filter((item) => item.id !== invite.id))
  }

  setSaving(false)
}

const copyInviteCode = async (code: string) => {
  await navigator.clipboard.writeText(code)
  alert("Invite-Code kopiert.")
}

  const createExercise = async () => {
    if (!newExercise.name.trim()) {
      alert("Übungsname fehlt.")
      return
    }

    setSaving(true)

    const { error } = await supabase.from("exercise_library").insert({
      name: newExercise.name.trim(),
      category: newExercise.category.trim(),
      muscle_group: newExercise.muscle_group.trim(),
      tracking_type: newExercise.tracking_type,
    })

    if (error) {
      alert(error.message)
    } else {
      setNewExercise({
        name: "",
        category: "",
        muscle_group: "",
        tracking_type: "reps",
      })
      await loadAdminData()
    }

    setSaving(false)
  }

const openExerciseEditor = (exercise: any) => {
  setSelectedExercise(exercise)
  setEditingExercise({
    name: exercise.name || "",
    category: exercise.category || "",
    muscle_group: exercise.muscle_group || "",
    tracking_type: exercise.tracking_type || "reps",
  })
}

const saveExerciseChanges = async () => {
  if (!selectedExercise) return

  if (!editingExercise.name.trim()) {
    alert("Name fehlt.")
    return
  }

  setSaving(true)

  const { error } = await supabase
    .from("exercise_library")
    .update({
      name: editingExercise.name.trim(),
      category: editingExercise.category,
      muscle_group: editingExercise.muscle_group,
      tracking_type: editingExercise.tracking_type,
    })
    .eq("id", selectedExercise.id)

  if (error) {
    alert(error.message)
  } else {
    setExercises((prev) =>
      prev.map((exercise) =>
        exercise.id === selectedExercise.id
          ? { ...exercise, ...editingExercise }
          : exercise
      )
    )
    setSelectedExercise(null)
  }

  setSaving(false)
}

const archiveExercise = async (exercise: any) => {
  if (!confirm(`Übung "${exercise.name}" wirklich archivieren?`)) return

  setSaving(true)

  const { error } = await supabase
    .from("exercise_library")
    .update({ archived: true })
    .eq("id", exercise.id)

  if (error) {
    alert(error.message)
  } else {
    setExercises((prev) =>
      prev.map((item) =>
        item.id === exercise.id ? { ...item, archived: true } : item
      )
    )
    setSelectedExercise(null)
  }

  setSaving(false)
}

const restoreExercise = async (exercise: any) => {
  setSaving(true)

  const { error } = await supabase
    .from("exercise_library")
    .update({ archived: false })
    .eq("id", exercise.id)

  if (error) {
    alert(error.message)
  } else {
    setExercises((prev) =>
      prev.map((item) =>
        item.id === exercise.id ? { ...item, archived: false } : item
      )
    )
    setSelectedExercise(null)
  }

  setSaving(false)
}

const deleteExercise = async (exercise: any) => {
  if (!confirm(`Übung "${exercise.name}" wirklich löschen?`)) return

  setSaving(true)

  const { error } = await supabase
    .from("exercise_library")
    .delete()
    .eq("id", exercise.id)

  if (error) {
    alert(error.message)
  } else {
    setExercises((prev) => prev.filter((item) => item.id !== exercise.id))
    setStats((prev) => ({
      ...prev,
      exercises: Math.max(0, prev.exercises - 1),
    }))
  }

  setSaving(false)
}

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-9 w-9 animate-spin text-yellow-200" />
          <p className="text-sm text-muted-foreground">
            Admin-Zugriff wird geprüft...
          </p>
        </div>
      </div>
    )
  }

  if (!isOwner) return null

  return (
    <div className="min-h-screen bg-[#050505] pb-20 text-white">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-80px] top-[-120px] h-[340px] w-[340px] rounded-full bg-yellow-300/10 blur-3xl" />
        <div className="absolute right-[-120px] top-[220px] h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-[-140px] left-[18%] h-[320px] w-[320px] rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-300/20 bg-yellow-300/10 text-yellow-200">
            <Crown className="h-5 w-5" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pt-6">
        <section className="relative overflow-hidden rounded-[36px] border border-yellow-300/20 bg-gradient-to-br from-yellow-300/[0.12] via-white/[0.035] to-white/[0.015] p-6 shadow-2xl backdrop-blur-xl">
          <div className="absolute right-[-70px] top-[-70px] h-[180px] w-[180px] rounded-full bg-yellow-300/10 blur-3xl" />

          <div className="relative">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1.5 text-xs font-black text-yellow-200">
              <Shield className="h-3.5 w-3.5" />
              Owner Zugriff
            </div>

            <h2 className="text-4xl font-black tracking-tight">
              CycleGuard
              <span className="block text-yellow-200">Verwaltung.</span>
            </h2>

            <p className="mt-4 max-w-[320px] text-sm leading-6 text-muted-foreground">
              Verwalte User, Rollen, Invite Codes und Exercise Library.
            </p>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3">
          <StatCard icon={Users} value={stats.users} label="User" color="text-yellow-200" />
          <StatCard icon={Shield} value={stats.compounds} label="Substanzen" color="text-emerald-300" />
          <StatCard icon={Ticket} value={stats.cycles} label="Pläne" color="text-purple-300" />
          <StatCard icon={Dumbbell} value={stats.exercises} label="Übungen" color="text-cyan-300" />
        </section>

        <section className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.035] p-2">
          <div className="grid grid-cols-3 gap-2">
            <TabButton active={activeTab === "users"} onClick={() => setActiveTab("users")}>
              User
            </TabButton>

            <TabButton active={activeTab === "invites"} onClick={() => setActiveTab("invites")}>
              Invites
            </TabButton>

            <TabButton active={activeTab === "exercises"} onClick={() => setActiveTab("exercises")}>
              Übungen
            </TabButton>
          </div>
        </section>

        <section className="mt-5">
          <div className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3">
            <Search className="h-5 w-5 text-white/35" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-white/25"
            />
          </div>
        </section>

        {activeTab === "users" && (
          <section className="mt-5 space-y-3">
{filteredUsers.map((user) => (
  <div
    key={user.id}
    className="w-full rounded-[28px] border border-white/10 bg-white/[0.04] p-4"
  >
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => router.push(`/admin/users/${user.id}`)}
        className="flex min-w-0 flex-1 items-center gap-4 text-left active:scale-[0.98]"
      >
        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[22px] border border-yellow-300/15 bg-yellow-300/10 text-yellow-200">
          <UserCog className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
<div className="flex items-center gap-2">
  <p className="truncate font-black">
    {user.display_name || user.username || "Unbenannt"}
  </p>

  {user.banned && (
    <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-black text-red-300">
      Gesperrt
    </span>
  )}
</div>
          <p className="truncate text-xs text-muted-foreground">
            {user.id}
          </p>
        </div>
      </button>

<div className="flex w-[92px] shrink-0 flex-col gap-2">
  <select
    value={user.role || "normal"}
    onChange={(e) => updateUserRole(user.id, e.target.value as Role)}
    disabled={saving || user.role === "owner" || user.banned}
    className="h-9 w-full appearance-none rounded-2xl border border-white/10 bg-black/40 px-3 text-center text-xs font-black outline-none disabled:opacity-60"
  >
    <option value="normal">Normal</option>
    <option value="premium">Premium</option>
    {user.role === "owner" && <option value="owner">Owner</option>}
  </select>

<button
  type="button"
  onClick={() => toggleUserBan(user)}
  disabled={saving || user.role === "owner"}
className={`h-9 w-full rounded-2xl border px-3 text-center text-xs font-black active:scale-95 disabled:opacity-50 ${
  user.banned
    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
    : "border-red-400/20 bg-red-500/10 text-red-300"
}`}
>
  {user.banned ? "Entsperren" : "Sperren"}
</button>
</div>
    </div>
  </div>
))}
          </section>
        )}

        {activeTab === "invites" && (
          <section className="mt-5 space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
              <p className="mb-3 font-black">Invite Code erstellen</p>

<div className="space-y-3">
  <input
    value={newInviteCode}
    onChange={(e) => setNewInviteCode(e.target.value)}
    placeholder="z.B. CYCLE2026"
    className="w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-white/25"
  />

  <input
    value={newInviteNote}
    onChange={(e) => setNewInviteNote(e.target.value)}
    placeholder="Notiz / Für wen?"
    className="w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-white/25"
  />

<input
  type="number"
  min="1"
  value={newInviteMaxUses}
  onChange={(e) => setNewInviteMaxUses(e.target.value)}
  placeholder="Max Uses"
  className="w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-white/25"
/>

  <button
    onClick={createInviteCode}
    disabled={saving}
    className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-yellow-300 py-3 font-black text-black active:scale-[0.98] disabled:opacity-50"
  >
    <Plus className="h-5 w-5" />
    Code erstellen
  </button>
</div>

           
            </div>

{inviteCodes.map((invite) => (
  <div
    key={invite.id}
    className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4"
  >
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => toggleInviteCode(invite)}
        disabled={saving}
        className="min-w-0 flex-1 text-left active:scale-[0.98]"
      >
<p className="truncate font-black">{invite.code}</p>

<p className="text-xs text-muted-foreground">
  {invite.active ? "Aktiv" : "Deaktiviert"}
  {invite.note ? ` • ${invite.note}` : ""}
</p>

<p className="mt-1 text-xs text-white/35">
  Uses: {invite.used_count || 0}
  {invite.max_uses ? ` / ${invite.max_uses}` : " / ∞"}
  {invite.expires_at
    ? ` • bis ${new Date(invite.expires_at).toLocaleDateString("de-DE")}`
    : ""}
</p>
      </button>

      <button
        type="button"
        onClick={() => toggleInviteCode(invite)}
        disabled={saving}
        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black active:scale-95 ${
          invite.active
            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
            : "border-red-400/20 bg-red-500/10 text-red-300"
        }`}
      >
        {invite.active ? "ON" : "OFF"}
      </button>

        <button
  type="button"
  onClick={() => copyInviteCode(invite.code)}
  disabled={saving}
  className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-black text-white/60 active:scale-95"
>
  Copy
</button>

      <button
        type="button"
        onClick={() => deleteInviteCode(invite)}
        disabled={saving}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-400/20 bg-red-500/10 text-red-300 active:scale-95 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  </div>
))}
          </section>
        )}

        {activeTab === "exercises" && (
          <section className="mt-5 space-y-4">
            <button
  type="button"
  onClick={() => setShowArchivedExercises(!showArchivedExercises)}
  className="w-full rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white/70 active:scale-[0.98]"
>
  {showArchivedExercises ? "Nur aktive Übungen anzeigen" : "Archivierte Übungen anzeigen"}
</button>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
              <p className="mb-3 font-black">Neue Übung</p>

              <div className="space-y-3">
                <input
                  value={newExercise.name}
                  onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                  placeholder="Name"
                  className="w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-white/25"
                />

<div className="grid grid-cols-2 gap-2">
  <select
    value={newExercise.category}
    onChange={(e) =>
      setNewExercise({ ...newExercise, category: e.target.value })
    }
    className="w-full min-w-0 appearance-none rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 pr-8 text-sm outline-none"
  >
    <option value="">Kategorie</option>
    {existingCategories.map((category) => (
      <option key={category} value={category}>
        {category}
      </option>
    ))}
  </select>

  <select
    value={newExercise.muscle_group}
    onChange={(e) =>
      setNewExercise({ ...newExercise, muscle_group: e.target.value })
    }
    className="w-full min-w-0 appearance-none rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 pr-8 text-sm outline-none"
  >
    <option value="">Muskelgruppe</option>
    {existingMuscleGroups.map((muscleGroup) => (
      <option key={muscleGroup} value={muscleGroup}>
        {muscleGroup}
      </option>
    ))}
  </select>
</div>

                <div className="flex gap-2">
<select
  value={newExercise.tracking_type}
  onChange={(e) =>
    setNewExercise({ ...newExercise, tracking_type: e.target.value })
  }
  className="min-w-0 flex-1 appearance-none rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 pr-8 text-sm outline-none"
>
  <option value="reps">Reps</option>
  <option value="seconds">Sekunden</option>
</select>

                  <button
                    onClick={createExercise}
                    disabled={saving}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-yellow-300 text-black active:scale-95 disabled:opacity-50"
                  >
                    <Save className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

{filteredExercises.slice(0, 80).map((exercise) => (
  <button
    key={exercise.id}
    type="button"
    onClick={() => openExerciseEditor(exercise)}
    className={`w-full rounded-[24px] border p-4 text-left active:scale-[0.98] ${
      exercise.archived
        ? "border-red-400/15 bg-red-500/10 opacity-70"
        : "border-white/10 bg-white/[0.035]"
    }`}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-black">{exercise.name}</p>

          {exercise.archived && (
            <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-black text-red-300">
              Archiviert
            </span>
          )}
        </div>

        <p className="mt-1 truncate text-xs text-muted-foreground">
          {exercise.category || "Keine Kategorie"} •{" "}
          {exercise.muscle_group || "Keine Muskelgruppe"} •{" "}
          {exercise.tracking_type || "reps"}
        </p>
      </div>

      <span className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-xs font-black text-yellow-200">
        Bearbeiten
      </span>
    </div>
  </button>
))}
          </section>
        )}
      </main>

      {selectedUser && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/80 px-4 pb-4 backdrop-blur-md sm:items-center sm:p-6">
          <div className="w-full max-w-md rounded-[34px] border border-white/10 bg-gradient-to-b from-[#111111] to-[#070707] p-5 shadow-2xl shadow-black/50">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-xs font-black text-yellow-200">
                  <UserCog className="h-3.5 w-3.5" />
                  User Profil
                </div>

                <h2 className="text-2xl font-black tracking-tight">
                  {selectedUser.display_name || selectedUser.username || "Unbenannt"}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Details und Rolle dieses Accounts.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/60 active:scale-95"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
                  Display Name
                </p>
                <p className="mt-2 font-black">
                  {selectedUser.display_name || "Nicht gesetzt"}
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
                  Username
                </p>
                <p className="mt-2 font-black">
                  {selectedUser.username || "Nicht gesetzt"}
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
                  User ID
                </p>
                <p className="mt-2 break-all text-sm font-bold text-white/70">
                  {selectedUser.id}
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
                  Rolle
                </p>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${
                      selectedUser.role === "owner"
                        ? "border-yellow-300/25 bg-yellow-300/10 text-yellow-200"
                        : selectedUser.role === "premium"
                          ? "border-purple-300/25 bg-purple-400/10 text-purple-200"
                          : "border-white/10 bg-white/[0.05] text-white/55"
                    }`}
                  >
                    {selectedUser.role === "owner"
                      ? "Owner"
                      : selectedUser.role === "premium"
                        ? "Premium"
                        : "Normal"}
                  </span>

                  <select
                    value={selectedUser.role || "normal"}
                    onChange={async (e) => {
                      const nextRole = e.target.value as Role
                      await updateUserRole(selectedUser.id, nextRole)
                      setSelectedUser({ ...selectedUser, role: nextRole })
                    }}
                    disabled={saving || selectedUser.role === "owner"}
                    className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-black outline-none disabled:opacity-60"
                  >
                    <option value="normal">Normal</option>
                    <option value="premium">Premium</option>
                    {selectedUser.role === "owner" && <option value="owner">Owner</option>}
                  </select>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
                  Erstellt am
                </p>
                <p className="mt-2 font-bold text-white/70">
                  {selectedUser.created_at
                    ? new Date(selectedUser.created_at).toLocaleString("de-DE")
                    : "Unbekannt"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedUser(null)}
              className="mt-5 w-full rounded-[22px] bg-yellow-300 py-4 font-black text-black active:scale-[0.98]"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
      {selectedExercise && (
  <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/80 px-4 pb-4 backdrop-blur-md sm:items-center sm:p-6">
    <div className="w-full max-w-md rounded-[34px] border border-white/10 bg-gradient-to-b from-[#111111] to-[#070707] p-5 shadow-2xl shadow-black/50">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-xs font-black text-yellow-200">
            Übung
          </div>

          <h2 className="text-2xl font-black tracking-tight">
            Übung bearbeiten
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Name, Kategorie, Muskelgruppe und Tracking ändern.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSelectedExercise(null)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/60 active:scale-95"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <input
          value={editingExercise.name}
          onChange={(e) =>
            setEditingExercise({ ...editingExercise, name: e.target.value })
          }
          placeholder="Name"
          className="w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-white/25"
        />

        <select
          value={editingExercise.category}
          onChange={(e) =>
            setEditingExercise({ ...editingExercise, category: e.target.value })
          }
          className="w-full appearance-none rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
        >
          <option value="">Kategorie</option>
          {existingCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          value={editingExercise.muscle_group}
          onChange={(e) =>
            setEditingExercise({
              ...editingExercise,
              muscle_group: e.target.value,
            })
          }
          className="w-full appearance-none rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
        >
          <option value="">Muskelgruppe</option>
          {existingMuscleGroups.map((muscleGroup) => (
            <option key={muscleGroup} value={muscleGroup}>
              {muscleGroup}
            </option>
          ))}
        </select>

        <select
          value={editingExercise.tracking_type}
          onChange={(e) =>
            setEditingExercise({
              ...editingExercise,
              tracking_type: e.target.value,
            })
          }
          className="w-full appearance-none rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
        >
          <option value="reps">Reps</option>
          <option value="seconds">Sekunden</option>
        </select>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={saveExerciseChanges}
          disabled={saving}
          className="rounded-[20px] bg-yellow-300 py-4 font-black text-black active:scale-[0.98] disabled:opacity-50"
        >
          Speichern
        </button>

        {selectedExercise.archived ? (
          <button
            type="button"
            onClick={() => restoreExercise(selectedExercise)}
            disabled={saving}
            className="rounded-[20px] border border-emerald-400/20 bg-emerald-400/10 py-4 font-black text-emerald-300 active:scale-[0.98] disabled:opacity-50"
          >
            Wiederherstellen
          </button>
        ) : (
          <button
            type="button"
            onClick={() => archiveExercise(selectedExercise)}
            disabled={saving}
            className="rounded-[20px] border border-red-400/20 bg-red-500/10 py-4 font-black text-red-300 active:scale-[0.98] disabled:opacity-50"
          >
            Archivieren
          </button>
        )}
      </div>
    </div>
  </div>
)}
    </div>
  )
}
function StatCard({ icon: Icon, value, label, color }: any) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
      <Icon className={`mb-3 h-6 w-6 ${color}`} />
      <p className="text-2xl font-black">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function TabButton({ active, onClick, children }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[22px] px-3 py-3 text-xs font-black transition active:scale-95 ${
        active
          ? "bg-yellow-300 text-black"
          : "text-white/45 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {children}
    </button>
  )
}