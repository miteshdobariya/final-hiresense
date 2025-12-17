import type { Server as IOServer } from "socket.io"

export function setSocketServer(io: IOServer) {
  globalThis.__ioServer = io
}

export function getSocketServer(): IOServer | undefined {
  return globalThis.__ioServer
}

