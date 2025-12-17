import type { NextApiRequest, NextApiResponse } from "next"
import type { Server as HTTPServer } from "http"
import type { Socket as NetSocket } from "net"
import { Server as IOServer, type Socket as IOSocket } from "socket.io"
import { getToken } from "next-auth/jwt"
import { setSocketServer, getSocketServer } from "@/lib/socketServer"
import { SOCKET_EVENTS, type ClientJoinRoomsPayload, type SocketAuthPayload } from "@/lib/socketEvents"
import { connect } from "@/dbConfig/dbConfig"
import candidates from "@/models/candidates"
import interviewers from "@/models/interviewers"
import ProctoringEvent from "@/models/proctoringEvents"
import Round from "@/models/rounds"

type NextApiResponseWithSocket = NextApiResponse & {
  socket: NetSocket & {
    server: HTTPServer & {
      io?: IOServer
    }
  }
}

type AuthedUserRole = "admin" | "candidate" | "interviewer" | "hr"

type AuthedUser = {
  id: string
  role: AuthedUserRole
  email?: string | null
  username?: string | null
}

type CandidateProctoringEventType =
  | "TAB_HIDDEN"
  | "TAB_VISIBLE"
  | "WINDOW_BLUR"
  | "WINDOW_FOCUS"
  | "WINDOW_BEFORE_UNLOAD"
  | "WINDOW_PAGE_HIDE"

type CandidateProctoringEventPayload = {
  candidateId: string
  roundId: string
  eventType: CandidateProctoringEventType
  timestamp?: string
  details?: Record<string, unknown>
}

type AlertPayload = {
  id: string
  candidateId: string
  roundId: string
  eventType: CandidateProctoringEventType
  emittedAt: string
  status: string
  decision: string | null
  broadcastCount: number
  details?: Record<string, unknown>
  candidate?: {
    name?: string
    email?: string
  }
  round?: {
    name?: string
    type?: string
  }
}

const MIN_REBROADCAST_INTERVAL_MS = 10_000

export const config = {
  api: {
    bodyParser: false,
  },
}

function isCandidateEventPayload(payload: unknown): payload is CandidateProctoringEventPayload {
  if (!payload || typeof payload !== "object") return false
  const maybe = payload as CandidateProctoringEventPayload
  return (
    typeof maybe.candidateId === "string" &&
    typeof maybe.roundId === "string" &&
    typeof maybe.eventType === "string"
  )
}

function sanitizeJoinPayload(payload: ClientJoinRoomsPayload | undefined): ClientJoinRoomsPayload | null {
  if (!payload) return null
  if (!payload.scope) return null
  return payload
}

function formatAlertPayload(event: any, candidateMeta?: any, roundMeta?: any): AlertPayload {
  return {
    id: event._id.toString(),
    candidateId: event.candidateId.toString(),
    roundId: event.roundId.toString(),
    eventType: event.eventType,
    emittedAt: event.emittedAt?.toISOString?.() ?? new Date().toISOString(),
    status: event.status,
    decision: event.decision ?? null,
    broadcastCount: event.broadcastCount ?? 0,
    details: event.details ?? undefined,
    candidate: candidateMeta
      ? {
          name: candidateMeta.username ?? undefined,
          email: candidateMeta.email ?? undefined,
        }
      : undefined,
    round: roundMeta
      ? {
          name: roundMeta.roundname ?? undefined,
          type: roundMeta.type ?? undefined,
        }
      : undefined,
  }
}

async function resolveAssignedInterviewer(candidateId: string) {
  const candidateDoc = await candidates
    .findById(candidateId)
    .select("assignedInterviewer username email")
    .lean()
  if (!candidateDoc) return { candidateDoc: null, interviewerId: null, interviewerDoc: null }

  const interviewerId = candidateDoc.assignedInterviewer?.interviewerId
    ? candidateDoc.assignedInterviewer.interviewerId.toString()
    : null

  let interviewerDoc: { email?: string | null; name?: string | null } | null = null
  if (interviewerId) {
    interviewerDoc = await interviewers.findById(interviewerId).select("email name").lean()
  }

  return { candidateDoc, interviewerId, interviewerDoc }
}


function initializeSocketServer(res: NextApiResponseWithSocket) {
  const existingIO = getSocketServer()
  if (existingIO) {
    res.socket.server.io = existingIO
    return existingIO
  }

  if (res.socket.server.io) {
    setSocketServer(res.socket.server.io)
    return res.socket.server.io
  }

  const io = new IOServer(res.socket.server, {
    path: "/api/socket",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  })

  io.use(async (socket, next) => {
    try {
      const token = await getToken({
        req: socket.request as any,
        secret: process.env.NEXTAUTH_SECRET,
      })

      if (token && (token as any)._id) {
        const authedUser: AuthedUser = {
          id: String((token as any)._id ?? token.sub),
          role: ((token as any).role || "candidate") as AuthedUserRole,
          email: (token as any).email ?? null,
          username: (token as any).username ?? null,
        }
        socket.data.user = authedUser
        return next()
      }

      const auth = socket.handshake.auth as SocketAuthPayload | undefined
      if (!auth || !auth.userId || !auth.role) {
        console.warn("[Socket] Unauthorized handshake attempt", {
          id: socket.id,
          hasToken: Boolean(token),
          hasAuthPayload: Boolean(auth),
        })
        return next(new Error("Unauthorized"))
      }

      await connect()
      const userDoc = await candidates.findById(auth.userId).select("role email username").lean()
      if (!userDoc) {
        console.warn("[Socket] Handshake user not found", auth.userId)
        return next(new Error("Unauthorized"))
      }

      if (auth.role !== userDoc.role) {
        console.warn("[Socket] Role mismatch in auth payload", {
          expected: userDoc.role,
          received: auth.role,
        })
        return next(new Error("Unauthorized"))
      }

      const authedUser: AuthedUser = {
        id: String(auth.userId),
        role: auth.role,
        email: userDoc.email ?? null,
        username: userDoc.username ?? null,
      }

      socket.data.user = authedUser
      next()
    } catch (error) {
      next(error as Error)
    }
  })

  io.on("connection", (socket: IOSocket) => {
    const authedUser = socket.data.user as AuthedUser | undefined

    if (authedUser) {
      switch (authedUser.role) {
        case "admin":
        case "hr":
          socket.join("role:admin")
          break
        case "interviewer":
          socket.join(`interviewer:${authedUser.id}`)
          break
        case "candidate":
          socket.join(`candidate:${authedUser.id}`)
          break
        default:
          break
      }
    }

    socket.on(SOCKET_EVENTS.CLIENT_JOIN_ROOMS, (rawPayload: ClientJoinRoomsPayload) => {
      const payload = sanitizeJoinPayload(rawPayload)
      const currentUser = socket.data.user as AuthedUser | undefined
      if (!payload || !currentUser) return

      if (payload.scope === "candidate") {
        if (currentUser.role !== "candidate") return
        if (payload.candidateId && payload.candidateId !== currentUser.id) return
        socket.join(`candidate:${currentUser.id}`)
        if (payload.roundId) {
          socket.join(`round:${payload.roundId}`)
        }
      } else if (payload.scope === "admin") {
        if (currentUser.role !== "admin" && currentUser.role !== "hr") return
        socket.join("role:admin")
        if (payload.candidateId) {
          socket.join(`candidate:${payload.candidateId}`)
        }
        if (payload.roundId) {
          socket.join(`round:${payload.roundId}`)
        }
      } else if (payload.scope === "interviewer") {
        if (currentUser.role !== "interviewer") return
        socket.join(`interviewer:${currentUser.id}`)
        if (payload.roundId) {
          socket.join(`round:${payload.roundId}`)
        }
        if (payload.candidateId) {
          socket.join(`candidate:${payload.candidateId}`)
        }
      } else if (payload.scope === "hr") {
        if (currentUser.role !== "hr") return
        socket.join("role:admin")
        if (payload.candidateId) {
          socket.join(`candidate:${payload.candidateId}`)
        }
      }
    })

    socket.on(SOCKET_EVENTS.PROCTORING_EVENT, async (payload: CandidateProctoringEventPayload) => {
      const currentUser = socket.data.user as AuthedUser | undefined
      if (!currentUser || currentUser.role !== "candidate") return
      if (!isCandidateEventPayload(payload)) return

      const { candidateId, roundId, eventType, timestamp, details } = payload
      if (candidateId !== currentUser.id) return

      try {
        await connect()

        console.info("[Socket] Proctoring event received", {
          candidateId,
          roundId,
          eventType,
        })

        const now = new Date()
        const emittedAt = timestamp ? new Date(timestamp) : now

        const existingEvent = await ProctoringEvent.findOne({
          candidateId,
          roundId,
          eventType,
          status: "pending",
        })
          .sort({ createdAt: -1 })
          .lean()

        if (
          existingEvent &&
          existingEvent.lastBroadcastAt &&
          now.getTime() - new Date(existingEvent.lastBroadcastAt).getTime() < MIN_REBROADCAST_INTERVAL_MS
        ) {
          await ProctoringEvent.findByIdAndUpdate(existingEvent._id, {
            $inc: { broadcastCount: 1 },
            lastBroadcastAt: now,
            details: details ?? existingEvent.details,
          })
          return
        }

        const eventDoc = await ProctoringEvent.create({
          candidateId,
          roundId,
          eventType,
          details,
          emittedAt,
          lastBroadcastAt: now,
          broadcastCount: 1,
        })

        const [{ candidateDoc, interviewerId, interviewerDoc }, roundDoc] = await Promise.all([
          resolveAssignedInterviewer(candidateId),
          Round.findById(roundId).select("roundname type").lean(),
        ])

        const alertPayload = formatAlertPayload(eventDoc, candidateDoc, roundDoc)

        // Broadcast to admins/HR
        io.to("role:admin").emit(SOCKET_EVENTS.ALERT_BROADCAST, alertPayload)

        if (interviewerId) {
          io.to(`interviewer:${interviewerId}`).emit(SOCKET_EVENTS.ALERT_BROADCAST, alertPayload)
        }

        if (roundId) {
          io.to(`round:${roundId}`).emit(SOCKET_EVENTS.ALERT_BROADCAST, alertPayload)
        }

        // Email notifications for proctoring alerts have been disabled
      } catch (error) {
        // Log server-side; avoid crashing handler
        console.error("[Socket] Failed to process proctoring event:", error)
      }
    })
  })

  res.socket.server.io = io
  setSocketServer(io)
  return io
}

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Only GET supported" })
    return
  }

  initializeSocketServer(res)
  res.end()
}
