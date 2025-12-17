import { Server as IOServer, type Socket } from "socket.io"
import type { Server as HTTPServer } from "http"
import { getToken } from "next-auth/jwt"
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  SocketReadyPayload,
  SocketJoinPayload,
} from "@/types/realtime"

type TypedIOServer = IOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

let io: TypedIOServer | null = null

const DEFAULT_ALLOWED_ROOMS = {
  admin: "admins",
  interviewerPrefix: "interviewer:",
  candidatePrefix: "candidate:",
  roundPrefix: "round:",
}

function handleDefaultRoomJoins(socket: TypedSocket) {
  const user = socket.data.user
  if (!user) return

  const joinedRooms: string[] = []

  const userRoom = `user:${user.id}`
  socket.join(userRoom)
  joinedRooms.push(userRoom)

  switch (user.role) {
    case "admin":
      socket.join(DEFAULT_ALLOWED_ROOMS.admin)
      joinedRooms.push(DEFAULT_ALLOWED_ROOMS.admin)
      break
    case "interviewer":
      socket.join(`${DEFAULT_ALLOWED_ROOMS.interviewerPrefix}${user.id}`)
      joinedRooms.push(`${DEFAULT_ALLOWED_ROOMS.interviewerPrefix}${user.id}`)
      break
    case "candidate":
      socket.join(`${DEFAULT_ALLOWED_ROOMS.candidatePrefix}${user.id}`)
      joinedRooms.push(`${DEFAULT_ALLOWED_ROOMS.candidatePrefix}${user.id}`)
      break
    default:
      break
  }

  const payload: SocketReadyPayload = {
    userId: user.id,
    role: user.role,
    joinedRooms,
  }
  socket.emit("socket:ready", payload)
}

function validateJoinRequest(socket: TypedSocket, payload: SocketJoinPayload) {
  const user = socket.data.user
  if (!user) {
    return { ok: false, message: "Unauthorized" }
  }

  const { room } = payload
  if (typeof room !== "string" || room.trim().length === 0) {
    return { ok: false, message: "Room is required" }
  }

  const trimmedRoom = room.trim()

  if (trimmedRoom === DEFAULT_ALLOWED_ROOMS.admin) {
    if (user.role !== "admin") {
      return { ok: false, message: "Admins only room" }
    }
    return { ok: true }
  }

  if (trimmedRoom.startsWith(DEFAULT_ALLOWED_ROOMS.interviewerPrefix)) {
    const id = trimmedRoom.slice(DEFAULT_ALLOWED_ROOMS.interviewerPrefix.length)
    if (user.role !== "interviewer" && user.role !== "admin") {
      return { ok: false, message: "Interviewers only room" }
    }
    if (user.role === "interviewer" && id !== user.id) {
      return { ok: false, message: "Cannot join other interviewer rooms" }
    }
    return { ok: true }
  }

  if (trimmedRoom.startsWith(DEFAULT_ALLOWED_ROOMS.candidatePrefix)) {
    const id = trimmedRoom.slice(DEFAULT_ALLOWED_ROOMS.candidatePrefix.length)
    if (user.role === "candidate" && id !== user.id) {
      return { ok: false, message: "Cannot join other candidate rooms" }
    }
    if (user.role === "candidate") {
      return { ok: true }
    }
    if (user.role === "interviewer" || user.role === "admin" || user.role === "hr") {
      return { ok: true }
    }
  }

  if (trimmedRoom.startsWith(DEFAULT_ALLOWED_ROOMS.roundPrefix)) {
    if (["candidate", "interviewer", "admin"].includes(user.role)) {
      return { ok: true }
    }
  }

  return { ok: false, message: "Room join not permitted" }
}

export function initSocketServer(httpServer: HTTPServer) {
  if (io) {
    return io
  }

  io = new IOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    path: "/api/socket",
    transports: ["websocket"],
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_ORIGIN || true,
      credentials: true,
    },
  })

  io.use(async (socket, next) => {
    try {
      const token = await getToken({ req: socket.request as any, secret: process.env.NEXTAUTH_SECRET })
      if (!token?._id || !token.role) {
        return next(new Error("Unauthorized"))
      }

      socket.data.user = {
        id: token._id as string,
        email: token.email as string | undefined,
        role: (token.role as SocketData["user"]["role"]) ?? "candidate",
        username: token.username as string | undefined,
      }
      return next()
    } catch (err) {
      return next(err as Error)
    }
  })

  io.on("connection", (socket) => {
    const user = socket.data.user
    if (!user) {
      socket.emit("socket:error", { message: "Unauthorized connection" })
      socket.disconnect(true)
      return
    }

    handleDefaultRoomJoins(socket)

    socket.on("socket:join", (payload, callback) => {
      const result = validateJoinRequest(socket, payload)
      if (!result.ok) {
        callback?.({ ok: false, message: result.message })
        return
      }
      socket.join(payload.room.trim())
      callback?.({ ok: true })
    })
  })

  return io
}

export function getIO() {
  if (!io) {
    throw new Error("Socket server not initialized yet")
  }
  return io
}

