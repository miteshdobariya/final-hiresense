import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import mongoose from "mongoose"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { connect } from "@/dbConfig/dbConfig"
import ProctoringEvent from "@/models/proctoringEvents"
import "@/models/rounds"

const DEFAULT_LIMIT = 50

function isValidObjectId(value: string | null): value is string {
  if (!value) return false
  return mongoose.Types.ObjectId.isValid(value)
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  const { searchParams } = new URL(req.url)

  const candidateId = searchParams.get("candidateId")
  const roundId = searchParams.get("roundId")
  const status = searchParams.get("status")
  const limit = Number.parseInt(searchParams.get("limit") ?? "", 10) || DEFAULT_LIMIT

  if (role === "candidate") {
    if (!candidateId || candidateId !== session.user._id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  if (candidateId && !isValidObjectId(candidateId)) {
    return NextResponse.json({ error: "Invalid candidateId" }, { status: 400 })
  }

  if (roundId && !isValidObjectId(roundId)) {
    return NextResponse.json({ error: "Invalid roundId" }, { status: 400 })
  }

  const query: Record<string, unknown> = {}
  if (candidateId) {
    query.candidateId = new mongoose.Types.ObjectId(candidateId)
  }
  if (roundId) {
    query.roundId = new mongoose.Types.ObjectId(roundId)
  }
  if (status) {
    query.status = status
  }

  try {
    await connect()
    const events = await ProctoringEvent.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("candidateId", "username email role")
      .populate("roundId", "roundname type")
      .lean()

    const formatted = events.map((event) => ({
      id: event._id.toString(),
      candidateId: event.candidateId?._id?.toString?.() ?? event.candidateId,
      roundId: event.roundId?._id?.toString?.() ?? event.roundId,
      eventType: event.eventType,
      details: event.details,
      status: event.status,
      decision: event.decision ?? null,
      decisionNotes: event.decisionNotes ?? null,
      broadcastCount: event.broadcastCount ?? 0,
      emittedAt: event.emittedAt ? new Date(event.emittedAt).toISOString() : new Date(event.createdAt ?? Date.now()).toISOString(),
      candidate: event.candidateId && typeof event.candidateId === "object"
        ? {
            name: event.candidateId.username ?? null,
            email: event.candidateId.email ?? null,
            role: event.candidateId.role ?? null,
          }
        : null,
      round: event.roundId && typeof event.roundId === "object"
        ? {
            name: event.roundId.roundname ?? null,
            type: event.roundId.type ?? null,
          }
        : null,
    }))

    return NextResponse.json({ events: formatted })
  } catch (error: any) {
    console.error("[ProctoringEvents] Failed to fetch events:", error?.message ?? error, error)
    return NextResponse.json({
      events: [],
      error: "Failed to fetch proctoring events.",
      details: typeof error?.message === "string" ? error.message : undefined,
    })
  }
}

