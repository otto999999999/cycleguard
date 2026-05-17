import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { inviteCode } = await req.json()

  if (inviteCode !== process.env.INVITE_CODE) {
    return NextResponse.json(
      { ok: false, message: "Falscher Invite-Code" },
      { status: 401 }
    )
  }

  return NextResponse.json({ ok: true })
}