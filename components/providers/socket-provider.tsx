"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import type { Socket } from "socket.io-client"
import type { ProctoringAlertPayload } from "@/types/realtime"
import type { ClientJoinRoomsPayload } from "@/lib/socketEvents"
import { SOCKET_EVENTS } from "@/lib/socketEvents"
import { createSocketClient, disconnectSocketClient, getSocketClient } from "@/lib/socketClient"

interface SocketContextValue {
  socket: Socket | null
  isConnected: boolean
  alerts: ProctoringAlertPayload[]
  joinRooms: (payload: ClientJoinRoomsPayload) => void
  dismissAlert: (id: string) => void
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined)

const MAX_ALERT_HISTORY = 50

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [alerts, setAlerts] = useState<ProctoringAlertPayload[]>([])

  const userId = session?.user?._id
  const role = session?.user?.role as ClientJoinRoomsPayload["scope"] | undefined

  useEffect(() => {
    if (status !== "authenticated" || !userId || !role) {
      if (socketRef.current) {
        socketRef.current.off(SOCKET_EVENTS.ALERT_BROADCAST)
        socketRef.current.disconnect()
      }
      disconnectSocketClient()
      socketRef.current = null
      setIsConnected(false)
      setAlerts([])
      return
    }

    const authPayload = {
      userId,
      role,
      candidateId: role === "candidate" ? userId : undefined,
    } as const

    void fetch("/api/socket").catch(() => {
      // ignore warm-up errors
    })

    let socket = getSocketClient()
    if (socket) {
      socket.auth = authPayload
      if (!socket.connected) {
        socket.connect()
      }
    } else {
      socket = createSocketClient(authPayload)
    }

    if (!socket) {
        return
      }

    socketRef.current = socket

    const handleConnect = () => {
        setIsConnected(true)
      socket.emit(SOCKET_EVENTS.CLIENT_JOIN_ROOMS, {
        scope: role,
        candidateId: role === "candidate" ? userId : undefined,
      } satisfies ClientJoinRoomsPayload)
    }

    const handleDisconnect = () => {
      setIsConnected(false)
    }

    const handleAlert = (payload: ProctoringAlertPayload) => {
      setAlerts((prev) => {
        const existingIndex = prev.findIndex((alert) => alert.id === payload.id)
        if (existingIndex >= 0) {
          const next = [...prev]
          next[existingIndex] = { ...next[existingIndex], ...payload }
          return next
        }
        const next = [payload, ...prev]
        return next.slice(0, MAX_ALERT_HISTORY)
      })

    }

    const handleConnectError = (err: unknown) => {
      console.error("[Socket] Connection error:", err)
    }

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on("connect_error", handleConnectError)
    socket.on(SOCKET_EVENTS.ALERT_BROADCAST, handleAlert)

    if (socket.connected) {
      handleConnect()
    }

    return () => {
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      socket.off("connect_error", handleConnectError)
      socket.off(SOCKET_EVENTS.ALERT_BROADCAST, handleAlert)
    }
  }, [status, userId, role])

  const joinRooms = useCallback((payload: ClientJoinRoomsPayload) => {
    const socket = socketRef.current
    if (!socket) return
    socket.emit(SOCKET_EVENTS.CLIENT_JOIN_ROOMS, payload)
  }, [])

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id))
  }, [])

  const value = useMemo<SocketContextValue>(
    () => ({
      socket: socketRef.current,
      isConnected,
      alerts,
      joinRooms,
      dismissAlert,
    }),
    [alerts, dismissAlert, isConnected, joinRooms],
  )

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export function useSocket() {
  const ctx = useContext(SocketContext)
  if (!ctx) {
    throw new Error("useSocket must be used within a SocketProvider")
  }
  return ctx
}
