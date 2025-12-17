import { io, type Socket } from "socket.io-client"
import type { SocketAuthPayload } from "@/lib/socketEvents"

let socketInstance: Socket | null = null

export function createSocketClient(auth: SocketAuthPayload) {
  if (typeof window === "undefined") return null

  if (!socketInstance) {
    socketInstance = io({
      path: "/api/socket",
      transports: ["websocket"],
      autoConnect: false,
      withCredentials: true,
    })
  }

  socketInstance.auth = auth
  if (!socketInstance.connected) {
    socketInstance.connect()
  }

  return socketInstance
}

export function getSocketClient() {
  return socketInstance
}

export function disconnectSocketClient() {
  if (!socketInstance) return

  socketInstance.removeAllListeners()
  if (socketInstance.connected) {
    socketInstance.disconnect()
  }
  socketInstance = null
}

