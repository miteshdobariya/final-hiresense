import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import mongoose from "mongoose"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { connect } from "@/dbConfig/dbConfig"
import ProctoringEvent from "@/models/proctoringEvents"
import candidates from "@/models/candidates"
import { getSocketServer } from "@/lib/socketServer"
import { SOCKET_EVENTS } from "@/lib/socketEvents"

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  if (!["admin", "hr", "interviewer"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id: eventId } = await context.params
  if (!eventId) {
    return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  let { status, decision, decisionNotes } = body as {
    status?: "pending" | "acknowledged" | "resolved"
    decision?: "allow" | "disqualify" | "warn" | null
    decisionNotes?: string
  }

  if (!status && !decision && typeof decisionNotes !== "string") {
    return NextResponse.json({ error: "No updates supplied" }, { status: 400 })
  }

  try {
    await connect()

    // First, get the event to find the candidateId
    const initialEvent = await ProctoringEvent.findById(eventId)
      .populate("candidateId", "username email")
      .populate("roundId", "roundname type")
      .lean()

    if (!initialEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const candidateIdForBulk =
      typeof initialEvent.candidateId === "object" && initialEvent.candidateId !== null
        ? initialEvent.candidateId._id.toString()
        : initialEvent.candidateId.toString()

    const updates: Record<string, unknown> = {
      handledBy: session.user._id,
      updatedAt: new Date(),
    }
    if (status) updates.status = status
    if (status === "acknowledged" && typeof decision === "undefined") {
      decision = "disqualify"
    }
    if (typeof decision !== "undefined") updates.decision = decision
    if (typeof decisionNotes === "string") updates.decisionNotes = decisionNotes

    // If acknowledging, bulk acknowledge all pending alerts for this candidate
    let allUpdatedEvents: any[] = []
    if (status === "acknowledged") {
      const candidateObjectId = new mongoose.Types.ObjectId(candidateIdForBulk)

      // First, get IDs of all pending events (lightweight query)
      const pendingEventIds = await ProctoringEvent.find({
        candidateId: candidateObjectId,
        status: "pending",
      })
        .select("_id")
        .limit(500) // Safety limit to prevent timeouts
        .lean()
        .then((docs) => docs.map((d) => d._id))

      if (pendingEventIds.length > 0) {
        // Bulk update all pending events in one query
        await ProctoringEvent.updateMany(
          {
            _id: { $in: pendingEventIds },
          },
          {
            $set: {
              ...updates,
              status: "acknowledged",
              decision: decision ?? "disqualify",
            },
          },
        )

        // Fetch all updated events by their IDs (more reliable than timestamp)
        allUpdatedEvents = await ProctoringEvent.find({
          _id: { $in: pendingEventIds },
        })
          .populate("candidateId", "username email")
          .populate("roundId", "roundname type")
          .sort({ createdAt: -1 })
          .lean()
      }
    } else {
      // For non-acknowledge updates, just update the single event
      const eventDoc = await ProctoringEvent.findByIdAndUpdate(
        eventId,
        { $set: updates },
        { new: true },
      )
        .populate("candidateId", "username email")
        .populate("roundId", "roundname type")
        .lean()

      if (eventDoc) {
        allUpdatedEvents = [eventDoc]
      }
    }

    // Format all updated events for response
    const formattedEvents = allUpdatedEvents.map((eventDoc) => {
      const candidateId =
        typeof eventDoc.candidateId === "object" && eventDoc.candidateId !== null
          ? eventDoc.candidateId._id.toString()
          : eventDoc.candidateId.toString()
      const roundId =
        typeof eventDoc.roundId === "object" && eventDoc.roundId !== null
          ? eventDoc.roundId._id?.toString?.() ?? ""
          : eventDoc.roundId?.toString?.() ?? ""

      return {
        id: eventDoc._id.toString(),
        candidateId,
        roundId,
        eventType: eventDoc.eventType,
        emittedAt: eventDoc.emittedAt?.toISOString?.() ?? new Date().toISOString(),
        status: eventDoc.status,
        decision: eventDoc.decision ?? null,
        broadcastCount: eventDoc.broadcastCount ?? 0,
        details: eventDoc.details ?? undefined,
        candidate:
          typeof eventDoc.candidateId === "object" && eventDoc.candidateId !== null
            ? {
                name: eventDoc.candidateId.username ?? null,
                email: eventDoc.candidateId.email ?? null,
              }
            : undefined,
        round:
          typeof eventDoc.roundId === "object" && eventDoc.roundId !== null
            ? {
                name: (eventDoc.roundId as any).roundname ?? null,
                type: (eventDoc.roundId as any).type ?? null,
              }
            : undefined,
      }
    })

    const primaryPayload = formattedEvents[0] || formattedEvents.find((e) => e.id === eventId)

    // If disqualified/acknowledged, apply 6-month freeze to candidate
    let freezeUntil: Date | null = null
    if (
      (status === "acknowledged" || decision === "disqualify" || primaryPayload?.decision === "disqualify") &&
      candidateIdForBulk
    ) {
      freezeUntil = new Date()
      freezeUntil.setMonth(freezeUntil.getMonth() + 6)
      await candidates.findByIdAndUpdate(candidateIdForBulk, {
        $set: {
          freezeUntil,
          freezeReason: "Proctoring violation (alert acknowledged)",
        },
      })
    }

    const io = getSocketServer()
    if (io && primaryPayload) {
      // Broadcast all updated events
      formattedEvents.forEach((payload) => {
        io.emit(SOCKET_EVENTS.ALERT_BROADCAST, payload)
      })

      const shouldAutoDisqualify =
        primaryPayload.status === "acknowledged" || primaryPayload.decision === "disqualify"

      if (shouldAutoDisqualify && primaryPayload.candidateId) {
        const freezeNote =
          freezeUntil && !Number.isNaN(freezeUntil.getTime())
            ? ` Your exam access is frozen until ${freezeUntil.toLocaleString()}.`
            : ""
        const forcePayload = {
          eventId: primaryPayload.id,
          candidateId: primaryPayload.candidateId,
          roundId: primaryPayload.roundId,
          message:
            "You are disqualified for not maintaining the integrity and a proper conduct for exam." + freezeNote,
        }

        io.to(`candidate:${primaryPayload.candidateId}`).emit(
          SOCKET_EVENTS.FORCE_SUBMIT,
          forcePayload,
        )
      }
    }

    return NextResponse.json({
      success: true,
      event: primaryPayload,
      allAcknowledged: formattedEvents,
    })
  } catch (error) {
    console.error("[ProctoringEvents:PATCH] Failed to update event:", error)
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 })
  }
}

