import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { connect } from "@/dbConfig/dbConfig"
import Candidate from "@/models/candidates"

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { candidateId } = await req.json().catch(() => ({}))
  if (!candidateId) {
    return NextResponse.json({ error: "candidateId is required" }, { status: 400 })
  }

  await connect()

  const candidate = await Candidate.findById(candidateId)
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
  }

  candidate.freezeUntil = undefined
  candidate.freezeReason = undefined
  await candidate.save()

  return NextResponse.json({ success: true })
}


