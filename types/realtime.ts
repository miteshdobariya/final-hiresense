import type { Socket } from "socket.io-client"
import type { ClientJoinRoomsPayload, ForceSubmitPayload } from "@/lib/socketEvents"

export type CandidateProctoringEventType =
  | "TAB_HIDDEN"
  | "TAB_VISIBLE"
  | "WINDOW_BLUR"
  | "WINDOW_FOCUS"
  | "WINDOW_BEFORE_UNLOAD"
  | "WINDOW_PAGE_HIDE"

export interface CandidateProctoringEventPayload {
  candidateId: string
  roundId: string
  eventType: CandidateProctoringEventType
  timestamp?: string
  details?: Record<string, unknown>
}

export interface ProctoringAlertPayload {
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
    name?: string | null
    email?: string | null
  }
  round?: {
    name?: string | null
    type?: string | null
  }
}

export interface ClientToServerEvents {
  "client:join-rooms": (payload: ClientJoinRoomsPayload) => void
  "proctoring:event": (payload: CandidateProctoringEventPayload) => void
  "admin:decision": (payload: { eventId: string; decision: string; notes?: string }) => void
}

export interface AdminDecisionPayload {
  eventId: string
  candidateId: string
  roundId?: string
  decision: string
  message?: string
}

export interface ServerToClientEvents {
  "alert:broadcast": (payload: ProctoringAlertPayload) => void
  "admin:decision": (payload: AdminDecisionPayload) => void
  "socket:error": (payload: { message: string }) => void
  "alert:force-submit": (payload: ForceSubmitPayload) => void
}

export interface InterServerEvents {}

export interface SocketData {
  user?: {
    id: string
    email?: string | null
    role: "admin" | "candidate" | "interviewer" | "hr"
    username?: string | null
  }
}

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>
