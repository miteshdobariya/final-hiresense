"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Clock, Award, TrendingUp, Play, Brain, Code, Users, Loader2, CheckCircle, Bell, AlertCircle } from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"
import { AvatarFallback } from "@/components/ui/avatar"

type Candidate = {
  _id: string
  username: string
  email: string
  phonenumber: string
  workDomain: { _id: string; name: string }
  role: string
  skills: string[]
  status: string
  progress: any[]
  assignedInterviewer?: {
    interviewerId: string
    assignedAt: string
    assignedBy: string
    status: string
  } | null
  createdAt: string
  lastLogin?: string
  assignedRounds?: any[]
}

type Interviewer = {
  _id: string
  username: string
  name?: string
  email: string
  role: string
  experience: string
  skills: string[]
}

export default function CandidateDashboard() {
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [assignedInterviewer, setAssignedInterviewer] = useState<Interviewer | null>(null)
  const [loading, setLoading] = useState(true)
  const [domainRounds, setDomainRounds] = useState<any[]>([])

  useEffect(() => {
    const fetchCandidateData = async () => {
      try {
        setLoading(true)
        
        // Fetch candidate details
        const candidateResponse = await fetch("/api/candidate/getdetail")
        if (!candidateResponse.ok) {
          throw new Error("Failed to fetch candidate details")
        }
        const candidateData = await candidateResponse.json()
        
        if (candidateData.success && candidateData.candidate) {
          setCandidate(candidateData.candidate)
          
          // Fetch domain rounds
          const workDomain = candidateData.candidate?.workDomain?.name
          if (workDomain) {
            try {
              const roundsResponse = await fetch(`/api/rounds?domainname=${encodeURIComponent(workDomain)}`)
              if (roundsResponse.ok) {
                const roundsData = await roundsResponse.json()
                setDomainRounds(roundsData.rounds || [])
              }
            } catch (error) {
              console.error("Error fetching rounds:", error)
            }
          }

          // If candidate has an assigned interviewer, fetch interviewer details
          if (candidateData.candidate.assignedInterviewer?.interviewerId) {
            try {
              const interviewerResponse = await fetch(`/api/admin/interviewers/${candidateData.candidate.assignedInterviewer.interviewerId}`)
              if (interviewerResponse.ok) {
                const interviewerData = await interviewerResponse.json()
                if (interviewerData.success) {
                  setAssignedInterviewer(interviewerData.interviewer)
                }
              }
            } catch (error) {
              console.error("Error fetching interviewer details:", error)
            }
          }
        }
      } catch (error) {
        console.error("Error fetching candidate data:", error)
        toast.error("Failed to load candidate data")
      } finally {
        setLoading(false)
      }
    }

    fetchCandidateData()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">No candidate profile found.</p>
        </div>
      </div>
    )
  }

  // Calculate dynamic stats
  const currentDomainId = candidate?.workDomain?._id?.toString();
  const domainProgress = candidate?.progress?.find((p: any) => p.domainId?.toString() === currentDomainId);
  const currentRoundIndex = domainProgress?.currentround ?? 0;
  
  const totalRounds = domainRounds.length;
  const availableRounds = domainRounds.filter((round: any, index: number) => index >= currentRoundIndex);
  const hasCompletedAllRounds = currentRoundIndex >= totalRounds;

  // Find the latest assignment (admin or interviewer)
  const latestAssignedRound = candidate?.assignedRounds
    ?.filter((a: any) => a.status === 'assigned')
    .sort((a: any, b: any) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())[0];

  const isAdminAssignment = latestAssignedRound && latestAssignedRound.assignedToModel === 'admins';
  const isInterviewerAssignment = latestAssignedRound && latestAssignedRound.assignedToModel === 'interviewers';

  function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString();
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back, {candidate.username}!</h2>
        </div>
      </div>

      {/* Assignment Details */}
      <Card className="bg-gradient-to-r from-indigo-50 to-cyan-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Interview Assignment
          </CardTitle>
          <CardDescription>Your interview details and assigned personnel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Assigned Interviewer/Admin</h4>
                {isInterviewerAssignment && assignedInterviewer ? (
                  <div className="flex items-center gap-3 mt-1">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-medium">
                      {(assignedInterviewer.username || assignedInterviewer.name || "C").charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">
                        You will be interviewed by <span className="text-indigo-700">{assignedInterviewer.username || assignedInterviewer.name}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">Email: {assignedInterviewer.email}</p>
                      {/* Show schedule details if available */}
                      {latestAssignedRound && (
                        <div className="mt-4 space-y-1">
                          <div><strong>Date:</strong> {formatDate(latestAssignedRound.scheduledDate)}</div>
                          <div><strong>Time:</strong> {latestAssignedRound.scheduledTime || '--:--'}</div>
                          <div><strong>Duration:</strong> {latestAssignedRound.durationMinutes || 60} minutes</div>
                          <div><strong>Format:</strong> {latestAssignedRound.interviewFormat || 'N/A'}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : isAdminAssignment && latestAssignedRound ? (
                  <div className="flex items-center gap-3 mt-1">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-medium">
                      {(latestAssignedRound.assignedToName || 'A').charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">
                        You are currently assigned to <span className="text-indigo-700">{latestAssignedRound.assignedToName || latestAssignedRound.assignedTo}</span> (Admin)
                      </p>
                      {/* Show schedule details if available */}
                      <div className="mt-4 space-y-1">
                        <div><strong>Date:</strong> {formatDate(latestAssignedRound.scheduledDate)}</div>
                        <div><strong>Time:</strong> {latestAssignedRound.scheduledTime || '--:--'}</div>
                        <div><strong>Duration:</strong> {latestAssignedRound.durationMinutes || 60} minutes</div>
                        <div><strong>Format:</strong> {latestAssignedRound.interviewFormat || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mt-1">
                    <div className="w-10 h-10 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">No Interviewer Assigned</p>
                      <p className="text-sm text-muted-foreground">Once assigned, you will see your interviewer's or admin's details here.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card: How the Interview Process Works */}
      <div className="mb-4">
        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg px-4 py-4 text-base">
          <h3 className="font-semibold mb-1">How does this work?</h3>
          <ul className="list-disc pl-5 space-y-1 text-blue-900">
            <li>Interview rounds are assigned based on your selected work domain.</li>
            <li>To move forward, you need to complete and clear all the rounds listed for your domain.</li>
            <li>Once you finish all rounds, your progress will be reviewed by our team.</li>
            <li>When an interviewer is assigned for your next step, you'll receive a notification right here.</li>
            <li>If you have any questions or need help, check your profile for contact options.</li>
          </ul>
        </div>
      </div>

      {/* Interview Rounds Section */}
      {hasCompletedAllRounds ? (
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-6 w-6" />
              🎉 All Rounds Completed!
            </CardTitle>
            <CardDescription className="text-green-700">
              Congratulations! You have successfully completed all interview rounds for {candidate.workDomain?.name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {assignedInterviewer ? (
              <div className="bg-white rounded-lg p-6 border border-green-200">
                <h4 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Interviewer Assigned
                </h4>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center font-medium">
                    {(assignedInterviewer.username || "I").charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-green-800">
                      {assignedInterviewer.username}
                    </p>
                    <p className="text-sm text-green-600">{assignedInterviewer.email}</p>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Next Step:</strong> Your interviewer will contact you soon to schedule your final walk-in interview.
                    Please check your email for further instructions.
                  </p>
                </div>
                    </div>
            ) : (
              <div className="bg-white rounded-lg p-6 border border-green-200">
                <h4 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Awaiting Interviewer Assignment
                </h4>
                <div className="space-y-4">
                  <p className="text-green-700">
                    Your application is now under review by our team. We will assign an interviewer to conduct your final walk-in interview.
                    </p>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>What happens next:</strong>
                    </p>
                    <ul className="list-disc pl-5 mt-2 text-sm text-green-700 space-y-1">
                      <li>Our team will review your performance across all rounds</li>
                      <li>An interviewer will be assigned to your profile</li>
                      <li>You'll receive an email notification with interview details</li>
                      <li>The interviewer will contact you to schedule the final interview</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-4 w-4" />
              <span>All {totalRounds} rounds completed successfully!</span>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
