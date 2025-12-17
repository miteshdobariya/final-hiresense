"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"
import { AlertTriangle, CheckCheck, Eye, RefreshCw, ShieldCheck, ShieldX } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSocket } from "@/components/providers/socket-provider"
import type { ProctoringAlertPayload } from "@/types/realtime"
import { PROCTORING_STATUS_COLORS, formatProctoringEventType } from "@/lib/proctoring"

interface ProctoringAlertCenterProps {
  scope?: "admin" | "interviewer" | "hr"
  candidateId?: string
  roundId?: string
}

function mergeAlerts(initial: ProctoringAlertPayload[], live: ProctoringAlertPayload[]) {
  const map = new Map<string, ProctoringAlertPayload>()
  for (const alert of initial) {
    map.set(alert.id, alert)
  }
  for (const alert of live) {
    map.set(alert.id, alert)
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.emittedAt).getTime() - new Date(a.emittedAt).getTime(),
  )
}

export function ProctoringAlertCenter({ scope = "admin", candidateId, roundId }: ProctoringAlertCenterProps) {
  const { alerts: liveAlerts } = useSocket()
  const [initialAlerts, setInitialAlerts] = useState<ProctoringAlertPayload[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchAlerts = async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ status: "pending", limit: "25" })
      if (candidateId) params.set("candidateId", candidateId)
      if (roundId) params.set("roundId", roundId)
      const res = await fetch(`/api/proctoring/events?${params.toString()}`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        const message =
          (payload && (payload.details || payload.error)) ||
          `Request failed with status ${res.status}`
        throw new Error(message)
      }
      if (payload?.error) {
        throw new Error(payload.error)
      }
      const events: ProctoringAlertPayload[] = (payload?.events ?? []).map((event: any) => ({
        id: event.id,
        candidateId: event.candidateId,
        roundId: event.roundId,
        eventType: event.eventType,
        emittedAt: typeof event.emittedAt === "string" ? event.emittedAt : new Date(event.emittedAt).toISOString(),
        status: event.status,
        decision: event.decision ?? null,
        broadcastCount: event.broadcastCount ?? 0,
        details: event.details ?? undefined,
        candidate: event.candidate ?? undefined,
        round: event.round ?? undefined,
      }))
      setInitialAlerts(events)
    } catch (err: any) {
      clearTimeout(timeoutId)
      console.error("[ProctoringAlertCenter] Failed to fetch events", err)
      if (err.name === "AbortError") {
        setError("Request timed out. Please refresh the page.")
      } else {
        setError(err?.message || "Unable to load proctoring alerts. Please try again.")
      }
      setInitialAlerts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId, roundId, scope])

  const applyEventUpdate = (updated: ProctoringAlertPayload) => {
    setInitialAlerts((prev) => {
      const exists = prev.some((event) => event.id === updated.id)
      if (exists) {
        return prev.map((event) => (event.id === updated.id ? updated : event))
      }
      return [updated, ...prev]
    })
  }

  const patchEvent = async (eventId: string, updates: Partial<ProctoringAlertPayload>) => {
    setUpdatingId(eventId)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      const res = await fetch(`/api/proctoring/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = data.error || `Failed to update event (${res.status})`
        throw new Error(message)
      }

      const payload = await res.json()
      
      // If bulk acknowledgment happened, remove all acknowledged alerts from the list
      if (updates.status === "acknowledged" && payload?.allAcknowledged) {
        const acknowledgedIds = new Set(
          (payload.allAcknowledged as ProctoringAlertPayload[]).map((e) => e.id)
        )
        setInitialAlerts((prev) =>
          prev.filter((alert) => !acknowledgedIds.has(alert.id))
        )
      } else if (payload?.event) {
        // For single updates, apply the update normally
        applyEventUpdate(payload.event as ProctoringAlertPayload)
      }
      setError(null)
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === "AbortError") {
        setError("Request timed out. Please try again.")
      } else {
        setError(err.message || "Failed to update alert.")
      }
    } finally {
      setUpdatingId(null)
    }
  }

  const alerts = useMemo(
    () => mergeAlerts(initialAlerts, liveAlerts),
    [initialAlerts, liveAlerts],
  )

  const pendingAlerts = alerts.filter((alert) => alert.status === "pending")

  return (
    <Card className="border-amber-200/80 bg-amber-50/40">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-base font-semibold text-amber-700">
            Live Proctoring Alerts
          </CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchAlerts} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {pendingAlerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active proctoring alerts right now.</p>
        ) : (
          <div className="space-y-3">
            {pendingAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="rounded-md border border-amber-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className={PROCTORING_STATUS_COLORS[alert.status] ?? "bg-slate-200 text-slate-700"}>
                        {alert.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNowStrict(new Date(alert.emittedAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-amber-700">
                      {formatProctoringEventType(alert.eventType)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Candidate:{" "}
                      {alert.candidate?.name || alert.candidateId}
                    </p>
                    {alert.round?.name ? (
                      <p className="text-sm text-muted-foreground">
                        Round: {alert.round.name}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={updatingId === alert.id}
                      onClick={() => patchEvent(alert.id, { status: "acknowledged" })}
                    >
                      <ShieldCheck className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      disabled={updatingId === alert.id}
                      onClick={() => patchEvent(alert.id, { status: "resolved" })}
                    >
                      <ShieldX className="h-4 w-4" />
                    </Button>
                    <Button asChild variant="secondary" size="icon" className="h-8 w-8">
                      <Link href={`/admin/candidates/${alert.candidateId}?tab=proctoring`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
                {alert.details ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {JSON.stringify(alert.details)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-between text-xs text-muted-foreground">
        <span>
          Showing {Math.min(5, pendingAlerts.length)} of {pendingAlerts.length} active alerts
        </span>
        <Button asChild variant="link" size="sm" className="px-0">
          <Link href={scope === "interviewer" ? "/interviewer/reviews" : "/admin/reviews"}>
            View full history
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

