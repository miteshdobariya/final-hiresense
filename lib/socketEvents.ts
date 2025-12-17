export const SOCKET_EVENTS = {
  CLIENT_JOIN_ROOMS: "client:join-rooms",
  PROCTORING_EVENT: "proctoring:event",
  ADMIN_DECISION: "admin:decision",
  ALERT_BROADCAST: "alert:broadcast",
  FORCE_SUBMIT: "alert:force-submit",
} as const

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS]

export type ClientJoinScope = "candidate" | "admin" | "interviewer" | "hr"

export type ClientJoinRoomsPayload = {
  scope: ClientJoinScope
  candidateId?: string
  roundId?: string
  interviewId?: string
}

export type SocketAuthPayload = {
  userId: string
  role: ClientJoinScope
  interviewId?: string
  candidateId?: string
  token?: string
}

export type ForceSubmitPayload = {
  eventId: string
  candidateId: string
  roundId?: string
  message: string
}

