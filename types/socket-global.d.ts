import type { Server as IOServer } from "socket.io"

declare global {
  // eslint-disable-next-line no-var
  var __ioServer: IOServer | undefined
}

export {}

