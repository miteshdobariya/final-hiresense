"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, FileText, Layers, CheckCircle, Loader2, Building2 } from "lucide-react"
import { useEffect, useState } from "react"
import { ProctoringAlertCenter } from "@/components/proctoring/proctoring-alert-center"

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/dashboard-stats")
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const cards = [
    {
      title: "Total Candidates",
      value: stats?.totalCandidates ?? "-",
      icon: Users,
      description: "Total registered candidates"
    },
    {
      title: "Active Companions",
      value: stats?.activeCompanions ?? "-",
      icon: Building2,
      description: "Active college companions"
    },
    {
      title: "Active Domains",
      value: stats?.activeDomains ?? "-",
      icon: Layers,
      description: "Domains with active rounds"
    },
    {
      title: "Number of Rounds",
      value: stats?.numberOfRounds ?? "-",
      icon: Calendar,
      description: "Total interview rounds"
    },
    {
      title: "Questions Bank",
      value: stats?.questionsBank ?? "-",
      icon: FileText,
      description: "Total questions in the bank"
    },
    {
      title: "Active Candidates",
      value: stats?.activeCandidates ?? "-",
      icon: Users,
      description: "Candidates currently in process"
    },
    {
      title: "Completed Candidates",
      value: stats?.completedCandidates ?? "-",
      icon: CheckCircle,
      description: "Candidates who completed whole process"
    },
    {
      title: "Active Interviewers",
      value: stats?.activeInterviewers ?? "-",
      icon: Users,
      description: "Interviewers with active status"
    },
    {
      title: "Admins",
      value: stats?.admins ?? "-",
      icon: Users,
      description: "Total admin users"
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Admin Dashboard</h2>
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {loading ? (
              <Card className="col-span-full flex items-center justify-center min-h-[120px]">
                <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
              </Card>
        ) : (
          cards.map((stat) => (
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
          ))
        )}
          </div>
        </div>
        <div className="space-y-4">
          <ProctoringAlertCenter scope="admin" />
        </div>
      </div>
    </div>
  )
}
