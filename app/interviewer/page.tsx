"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Users, CheckCircle, Calendar, MessageSquare } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { ProctoringAlertCenter } from "@/components/proctoring/proctoring-alert-center"
import { useSocket } from "@/components/providers/socket-provider"

export default function InterviewerDashboard() {
  const { status } = useSession()
  const { joinRooms } = useSocket()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignedCandidates, setAssignedCandidates] = useState<any[]>([])
  const [interviewerStats, setInterviewerStats] = useState<any | null>(null)

  useEffect(() => {
    const load = async () => {
      if (status !== "authenticated") return
      try {
        setLoading(true)
        const res = await fetch("/api/interviewer/assigned-candidates", { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to load assigned candidates")
        const data = await res.json()
        setAssignedCandidates(data.assignedCandidates || [])
        setInterviewerStats(data.interviewerStats || null)
      } catch (e: any) {
        setError(e.message || "Something went wrong")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [status])

  useEffect(() => {
    if (!assignedCandidates.length) return
    assignedCandidates.forEach((candidate) => {
      if (!candidate?.id) return
      joinRooms({ scope: "interviewer", candidateId: candidate.id })
    })
  }, [assignedCandidates, joinRooms])

  const stats = useMemo(() => [
    {
      title: "Assigned Candidates",
      value: String(interviewerStats?.totalAssigned ?? 0),
      description: "Active interviews",
      icon: Users,
    },
    {
      title: "Pending Reviews",
      value: String(assignedCandidates.filter(c => c.status === "assigned" || c.status === "in-progress").length),
      description: "Awaiting feedback",
      icon: MessageSquare,
    },
    {
      title: "Completed",
      value: String(interviewerStats?.completedInterviews ?? 0),
      description: "Interviews finished",
      icon: CheckCircle,
    },
    {
      title: "Scheduled",
      value: String(assignedCandidates.filter(c => (c.assignedRounds || []).some((r: any) => r.status === "assigned")).length),
      description: "Upcoming this week",
      icon: Calendar,
    },
  ], [interviewerStats, assignedCandidates])

  const recentActivities = useMemo(() => {
    const items: { label: string; timestamp: Date; icon: "completed" | "scheduled" | "feedback" }[] = []

    assignedCandidates.forEach((candidate) => {
      if (candidate.lastActivity) {
        items.push({
          label: `Activity with ${candidate.name}`,
          timestamp: new Date(candidate.lastActivity),
          icon: "completed",
        })
      }
      (candidate.assignedRounds || []).forEach((round: any) => {
        if (round.scheduledDate) {
          items.push({
            label: `Interview with ${candidate.name} scheduled`,
            timestamp: new Date(round.scheduledDate),
            icon: "scheduled",
          })
        }
      })
    })

    return items
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 3)
  }, [assignedCandidates])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Progress":
        return "secondary"
      case "Pending Review":
        return "default"
      case "Scheduled":
        return "outline"
      case "Completed":
        return "default"
      default:
        return "outline"
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Interviewer Dashboard</h2>
          <p className="text-sm md:text-base text-muted-foreground">Manage your assigned candidates and interviews</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {/* Stats Grid */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.title} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  Pending Reviews
                </CardTitle>
                <CardDescription>You have 3 interviews waiting for your feedback and evaluation.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/interviewer/reviews">Review Interviews</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200 hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-green-600" />
                  Schedule Interviews
                </CardTitle>
                <CardDescription>Schedule new interview rounds for your assigned candidates.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href="/interviewer/schedule">Schedule Interviews</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Assigned Candidates */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Assigned Candidates</CardTitle>
              <CardDescription>Candidates assigned to you for interview and evaluation</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
              {error && <div className="text-sm text-red-600">{error}</div>}
              {!loading && !error && (
              <div className="space-y-4">
                {assignedCandidates.length === 0 && (
                  <div className="text-sm text-muted-foreground">No candidates assigned yet.</div>
                )}
                {assignedCandidates.map((candidate: any) => (
                  <div
                    key={candidate.id}
                    className="flex flex-col lg:flex-row items-start lg:items-center gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <Avatar className="flex-shrink-0">
                      <AvatarImage src={candidate.avatar || "/placeholder.svg"} alt={candidate.name} />
                      <AvatarFallback>
                        {candidate.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium text-sm md:text-base">{candidate.name}</h4>
                        {candidate.workDomain?.name && <Badge variant="outline">{candidate.workDomain.name}</Badge>}
                        <Badge variant={getStatusColor(candidate.status)}>{candidate.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{candidate.email}</p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        {typeof candidate.currentRound === "number" && typeof candidate.totalRounds === "number" && (
                          <span>
                            Progress: {candidate.currentRound}/{candidate.totalRounds} rounds
                          </span>
                        )}
                        {candidate.lastActivity && <span>Last activity: {new Date(candidate.lastActivity).toLocaleString()}</span>}
                      </div>

                      {typeof candidate.currentRound === "number" && typeof candidate.totalRounds === "number" && (
                        <Progress value={(candidate.currentRound / candidate.totalRounds) * 100} className="h-2" />
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 w-full lg:w-auto">
                      <div className="text-sm font-medium text-center lg:text-right">{candidate.interviewRounds?.[0]?.name || ""}</div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                        <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                          <Link href={`/interviewer/candidates/${candidate.id}`}>View Details</Link>
                        </Button>
                        {candidate.status === "assigned" && (
                          <Button asChild size="sm" className="w-full sm:w-auto">
                            <Link href={`/interviewer/review/${candidate.id}`}>Review</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Recent Activity</CardTitle>
              <CardDescription>Latest updates from your interviews</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No recent activity yet.
                  </div>
                )}
                {recentActivities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm"
                  >
                    {activity.icon === "completed" && (
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    )}
                    {activity.icon === "scheduled" && (
                      <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    )}
                    {activity.icon === "feedback" && (
                      <MessageSquare className="h-4 w-4 text-orange-600 flex-shrink-0" />
                    )}
                    <span className="flex-1">
                      {activity.label}
                    </span>
                    <span className="text-muted-foreground">
                      {activity.timestamp.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Proctoring alerts */}
        <div className="space-y-4">
          <ProctoringAlertCenter scope="interviewer" />
        </div>
      </div>
    </div>
  )
}
