"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, Play, CheckCircle, AlertCircle, FileText, Code, Brain, Users, Bell } from "lucide-react"
import Link from "next/link"
import Loader from "@/components/ui/loader"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"

// Define the Round type based on your backend model
interface Round {
  _id: string
  roundname: string
  description?: string
  domainname?: any
  type: string
  duration?: number
  questionsCount?: number
}

function CompletedRoundResult({ candidateId, roundId }: { candidateId: string, roundId: string }) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchResult() {
      setLoading(true);
      setError("");
      try {
        // Always fetch the saved result from the backend
        const res = await axios.get(`/api/candidate/performance?candidateId=${candidateId}&roundId=${roundId}`);
        if (res.data && res.data.success && res.data.round) {
          setResult(res.data.round);
        } else {
          setError("No result found.");
        }
      } catch (err) {
        setError("Failed to fetch result.");
      }
      setLoading(false);
    }
    fetchResult();
  }, [candidateId, roundId]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading result...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!result) return null;
  // Only display what is returned from the backend, no recalculation
  return (
    <div className="mt-2 p-3 rounded bg-blue-50 border border-blue-200">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <div className="font-semibold">Score: {result.percentage}%</div>
          <div className="text-sm text-muted-foreground">{result.correctAnswers} out of {result.totalQuestions} correct</div>
          <div className="text-sm text-muted-foreground">{result.passed ? "Passed" : "Failed"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Completed at: {result.completedAt ? new Date(result.completedAt).toLocaleString() : "-"}</div>
        </div>
      </div>
    </div>
  );
}

export default function CandidateInterviewsPage() {
  const [domainRounds, setDomainRounds] = useState<Round[]>([])
  const [domainName, setDomainName] = useState("")
  const [loading, setLoading] = useState(true)
  const [candidate, setCandidate] = useState<any>(null)
  const [interviewer, setInterviewer] = useState<any>(null)
  const [instructionsOpen, setInstructionsOpen] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRounds() {
      setLoading(true)
      try {
        // 1. Get candidate profile (to get domain and currentround)
        const profileRes = await axios.get("/api/candidate/getdetail")
        const candidateData = profileRes.data.candidate
        setCandidate(candidateData)
        const workDomain = candidateData?.workDomain?.name
        setDomainName(workDomain || "")

        // Only fetch domain-specific rounds
        if (workDomain) {
          const domainRes = await axios.get(`/api/rounds?domainname=${encodeURIComponent(workDomain)}`)
          setDomainRounds(domainRes.data.rounds || [])
        } else {
          setDomainRounds([])
        }

        // Fetch interviewer details if assigned
        if (candidateData?.assignedInterviewer?.interviewerId) {
          try {
            const interviewerRes = await axios.get(`/api/admin/interviewers/${candidateData.assignedInterviewer.interviewerId}`)
            if (interviewerRes.data && interviewerRes.data.interviewer) {
              setInterviewer(interviewerRes.data.interviewer)
            }
          } catch (err) {
            setInterviewer(null)
          }
        } else {
          setInterviewer(null)
        }
      } catch (err) {
        setDomainRounds([])
        setInterviewer(null)
      }
      setLoading(false)
    }
    fetchRounds()
  }, [])

  // Dynamically fetch freezing period days from backend
  const [freezingPeriodDays, setFreezingPeriodDays] = useState('1');
  useEffect(() => {
    async function fetchFreezingPeriod() {
      try {
        const res = await fetch('/api/candidate/performance/freezing-period');
        if (res.ok) {
          const data = await res.json();
          if (data && data.days) setFreezingPeriodDays(data.days.toString());
        }
      } catch {}
    }
    fetchFreezingPeriod();
  }, []);

  const getStatusIcon = (type: string) => {
    if (type === "MCQ") return <Brain className="h-5 w-5 text-blue-600" />
    if (type === "Coding") return <Code className="h-5 w-5 text-purple-600" />
    if (type === "Mixed") return <Users className="h-5 w-5 text-orange-600" />
    return <Calendar className="h-5 w-5 text-blue-600" />
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "MCQ":
        return "bg-blue-100 text-blue-800"
      case "Coding":
        return "bg-purple-100 text-purple-800"
      case "Mixed":
        return "bg-orange-100 text-orange-800"
      case "Walk-in":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) return <Loader text="Loading your interview journey..." />;

  // Only use domainRounds
  const uniqueRounds = domainRounds
  // Find the current domain ID
  const currentDomainId = candidate?.workDomain?.id?.toString();
  // Find the progress entry for the current domain
  const domainProgress = candidate?.progress?.find((p: any) => p.domainId?.toString() === currentDomainId);
  // Use per-domain clearedRounds for completed rounds
  const clearedRounds = domainProgress?.clearedRounds?.map((id: any) => id.toString()) || [];
  // Completed rounds are those in clearedRounds
  const completedRoundsCount = clearedRounds.length;
  // Available rounds are those not in clearedRounds
  const availableRounds = uniqueRounds.map((round) => ({
    ...round,
    status: clearedRounds.includes(round._id) ? 'Completed' : 'Available',
  }));
  const totalRounds = uniqueRounds.length;
  const availableRoundsCount = availableRounds.filter(r => r.status === 'Available').length;
  const noRoundsAvailable = uniqueRounds.length === 0;
  const allRoundsCompleted = totalRounds > 0 && completedRoundsCount >= totalRounds;
  // Define currentRoundIndex for progress display
  const currentRoundIndex = uniqueRounds.findIndex(r => !clearedRounds.includes(r._id));
  // If all rounds are cleared, set to uniqueRounds.length
  const safeCurrentRoundIndex = currentRoundIndex === -1 ? uniqueRounds.length : currentRoundIndex;
  // Find the index of the first available round
  const firstAvailableIndex = uniqueRounds.findIndex(r => !clearedRounds.includes(r._id));

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Interview Journey</h2>
        </div>
      </div>
      <div className="mb-4">
        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg px-4 py-3 text-base font-medium">
          To proceed to the walk-in interview, you must complete all the rounds listed below. Good luck!
        </div>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-lg px-4 py-3 text-base font-medium mt-2">
          If you fail an exam, you will not be able to retake that round for <b>{freezingPeriodDays}</b> day(s).
        </div>
      </div>

      {/* Progress Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Interview Progress
          </CardTitle>
          <CardDescription>
            {totalRounds > 0
              ? `${completedRoundsCount} of ${totalRounds} rounds completed. Current: ${uniqueRounds.find(r => !clearedRounds.includes(r._id))?.roundname || "-"}`
              : "All interview rounds are unlocked and ready to take"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>
                {completedRoundsCount} of {totalRounds} rounds completed
              </span>
            </div>
            <div className="flex w-full h-2 rounded overflow-hidden mt-2 mb-4">
              {uniqueRounds.map((round, index) => (
                <div
                  key={round._id}
                  className={
                    index < safeCurrentRoundIndex
                      ? "bg-green-500"
                      : index === safeCurrentRoundIndex
                      ? "bg-blue-500"
                      : "bg-gray-300"
                  }
                  style={{ width: `${100 / (totalRounds || 1)}%` }}
                />
              ))}
            </div>
            <div className="flex w-full justify-evenly gap-0 md:gap-2 mt-4">
              {uniqueRounds.map((round, index) => (
                <div key={round._id} className="flex flex-col items-center flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-full mb-2 flex items-center justify-center mx-auto
                    ${index < safeCurrentRoundIndex ? "bg-green-600" : index === safeCurrentRoundIndex ? "bg-blue-500" : "bg-gray-400"} text-white`}>
                    {index + 1}
                  </div>
                  <p className="text-xs font-medium truncate w-full text-center">{round.roundname}</p>
                  <p className={`text-xs font-medium text-center
                    ${index < safeCurrentRoundIndex ? "text-green-600" : index === safeCurrentRoundIndex ? "text-blue-600" : "text-gray-500"}`}>
                    {index < safeCurrentRoundIndex ? "Completed" : index === safeCurrentRoundIndex ? "Ongoing" : "Locked"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="available" className="space-y-4">
        <TabsList>
          <TabsTrigger value="available">Available ({availableRoundsCount})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedRoundsCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          {allRoundsCompleted ? (
            candidate?.assignedInterviewer && candidate.assignedInterviewer.interviewerId ? (
              <Card className="border-blue-200 bg-blue-50/30">
                <CardContent className="text-center py-12">
                  <Users className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-blue-800 mb-3">Interview Scheduled!</h3>
                  <p className="text-lg text-blue-700 mb-4">
                    You have been assigned to an interviewer for your final walk-in interview.
                  </p>
                  <div className="bg-white rounded-lg p-6 border border-blue-200 inline-block text-left mx-auto">
                    <h4 className="font-semibold text-blue-800 mb-2">Your Interviewer</h4>
                    <div className="mb-1 text-blue-900"><span className="font-medium">Name:</span> {interviewer?.name || 'N/A'}</div>
                    <div className="mb-1 text-blue-900"><span className="font-medium">Email:</span> {interviewer?.email || 'N/A'}</div>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-blue-700 mt-4">
                    <Bell className="h-4 w-4" />
                    <span>Please check your email for further instructions.</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-green-200 bg-green-50/30">
                <CardContent className="text-center py-12">
                  <Bell className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-green-800 mb-3">🎉 Congratulations!</h3>
                  <p className="text-lg text-green-700 mb-4">
                    You have successfully completed all interview rounds!
                  </p>
                  <div className="bg-white rounded-lg p-6 border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">What's Next?</h4>
                    <p className="text-green-700 mb-3">
                      Your application is now under review. You will be notified here when an interviewer is assigned to conduct your final walk-in interview.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                      <Bell className="h-4 w-4" />
                      <span>Keep an eye on your email for updates</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          ) : noRoundsAvailable || availableRounds.filter(r => r.status === 'Available').length === 0 ? (
            <div className="text-center text-lg text-muted-foreground py-12">
              No interview rounds are currently available. Please check back later.
            </div>
          ) : (
            <div className="grid gap-4">
              {uniqueRounds.filter((round, idx) => !clearedRounds.includes(round._id)).map((round, idx, arr) => {
                const isFirstAvailable = idx === 0;
                return (
                  <Card
                    key={round._id}
                    className={`hover:shadow-lg transition-all duration-200 border-green-200 bg-green-50/30 ${!isFirstAvailable ? 'opacity-60 pointer-events-none' : ''}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(round.type)}
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {round.roundname}
                              <Badge className={getTypeColor(round.type)}>{round.type}</Badge>
                            </CardTitle>
                            <CardDescription className="mt-1">{round.description}</CardDescription>
                          </div>
                        </div>
                        {isFirstAvailable && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">Ready to Start</Badge>
                        )}
                        {!isFirstAvailable && (
                          <Badge variant="secondary" className="bg-gray-200 text-gray-600">Locked</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{round.duration} minutes</span>
                        </div>
                        {round.questionsCount && (
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>{round.questionsCount} questions</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3">
                        {isFirstAvailable && (
                          <Button asChild className="flex-1" size="lg">
                            <Link href={`/candidate/exam/${round._id}`}>
                              <Play className="mr-2 h-4 w-4" />
                              {round.type === "MCQ"
                                ? "Start MCQ Test"
                                : round.type === "Coding"
                                  ? "Start Coding Test"
                                  : round.type === "Mixed"
                                    ? "Start Mixed Test"
                                    : round.type === "Project"
                                      ? "Start Project Work"
                                      : "Start Interview"}
                            </Link>
                          </Button>
                        )}
                        <Button variant="outline" size="lg" onClick={() => setInstructionsOpen(round._id)} disabled={!isFirstAvailable}>
                          <FileText className="mr-2 h-4 w-4" />
                          Instructions
                        </Button>
                      </div>
                    </CardContent>
                    {/* Instructions Dialog for this round */}
                    <Dialog open={instructionsOpen === round._id} onOpenChange={(open) => setInstructionsOpen(open ? round._id : null)}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Instructions for {round.roundname}</DialogTitle>
                          <DialogDescription>
                            Please read the following instructions carefully before starting this round.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 text-base">
                          <ul className="list-disc pl-5 space-y-2">
                            <li><b>Do not cheat:</b> Do not use unauthorized resources or assistance. Your activity may be monitored.</li>
                            <li><b>Time limit:</b> You must complete this round within the allotted time ({round.duration} minutes).</li>
                            <li><b>Passing criteria:</b> You must score at least 60% to pass this round.</li>
                            {round.type === "MCQ" && (
                              <li><b>MCQ Instructions:</b> Select the best answer for each question. You cannot go back once you submit.</li>
                            )}
                            {round.type === "Coding" && (
                              <>
                                <li><b>Coding Instructions:</b> Write clean, working code for each problem. Use the provided starter code if available.</li>
                                <li><b>Code Evaluation:</b> Your code will be evaluated on the following criteria:
                                  <ul className="list-disc pl-5 mt-1">
                                    <li>Correctness</li>
                                    <li>Understanding</li>
                                    <li>Code Quality</li>
                                    <li>Efficiency</li>
                                  </ul>
                                </li>
                              </>
                            )}
                            {round.type === "Mixed" && (
                              <li><b>Mixed Round:</b> This round contains both MCQ and coding questions. Follow the instructions for each question type.</li>
                            )}
                          </ul>
                        </div>
                        <DialogFooter>
                          <Button onClick={() => setInstructionsOpen(null)}>Close</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {clearedRounds.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Completed Interviews</h3>
                <p className="text-muted-foreground">Complete your first interview to see results here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {uniqueRounds.filter(round => clearedRounds.includes(round._id)).map((round) => (
                <Card key={round._id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(round.type)}
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {round.roundname}
                            <Badge className={getTypeColor(round.type)}>{round.type}</Badge>
                          </CardTitle>
                          <CardDescription className="mt-1">{round.description}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="default" className="bg-blue-100 text-blue-800">Completed</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{round.duration} minutes</span>
                      </div>
                      {round.questionsCount && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{round.questionsCount} questions</span>
                        </div>
                      )}
                    </div>
                    {/* Show result summary for this completed round */}
                    {candidate && <CompletedRoundResult candidateId={candidate._id} roundId={round._id} />}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
