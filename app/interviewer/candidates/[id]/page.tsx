"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowLeft,
  Download,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Check,
  MessageSquare,
  Edit,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import toast from "react-hot-toast"

export default function InterviewerCandidateDetailPage() {
  const params = useParams()
  const candidateId = params.id as string

  const [candidate, setCandidate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRound, setSelectedRound] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [isSuggestDialogOpen, setIsSuggestDialogOpen] = useState(false)
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [followUpError, setFollowUpError] = useState<string | null>(null)
  const [followUp, setFollowUp] = useState<string[]>([])
  const [assignedRoundsCount, setAssignedRoundsCount] = useState<number | null>(null)
  const [reviewData, setReviewData] = useState({
    rating: "",
    feedback: "",
    recommendation: "",
    technicalSkills: "",
    communicationSkills: "",
    problemSolving: "",
  })
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null)

  // Build a set of unique domain IDs from progress
  const progressDomains = Array.isArray(candidate?.progress)
    ? candidate.progress
        .filter((p: any) => p.domainId && p.domainName)
        .map((p: any) => ({ id: String(p.domainId), name: p.domainName }))
    : [];

  // Add current work domain if not already present
  const currentWorkDomain = candidate?.workDomain?.id && candidate?.workDomain?.name
    ? { id: String(candidate.workDomain.id), name: candidate.workDomain.name }
    : null;

  let allDomains: { id: string; name: string }[] = [...progressDomains];
  if (currentWorkDomain && !allDomains.some(d => d.id === currentWorkDomain.id)) {
    allDomains.push(currentWorkDomain);
  }
  // Remove duplicates by domain id and name
  allDomains = allDomains.filter((d, i, arr) => arr.findIndex(x => x.id === d.id && x.name === d.name) === i);

  // Set default selected domain to current work domain
  useEffect(() => {
    if (candidate?.workDomain?.id && allDomains.length > 0) {
      setSelectedDomainId(candidate.workDomain.id)
    } else if (allDomains.length > 0) {
      setSelectedDomainId(allDomains[0].id)
    }
  }, [candidate?.workDomain?.id, allDomains.length])

  // Filter performance by selected domain
  const filteredPerformance = Array.isArray(candidate?.performance)
    ? candidate.performance.filter((p: any) => selectedDomainId && p.domainId === selectedDomainId)
    : [];

  useEffect(() => {
    const fetchCandidateDetails = async () => {
      if (!candidateId) return
      setLoading(true)
      try {
        // First get the candidate's basic details
        const response = await fetch(`/api/admin/candidates/${candidateId}`)
        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.error || "Failed to fetch candidate details")
        }
        const data = await response.json()
        setCandidate(data.candidate)
        
        // Fetch assigned rounds for the candidate's domain
        if (data.candidate?.workDomain?.name) {
          const domainsRes = await fetch('/api/domains')
          const domainsData = await domainsRes.json()
          const domain = domainsData.domains.find((d: any) => d.domainname === data.candidate.workDomain.name)
          setAssignedRoundsCount(domain?.rounds?.length || 0)
        } else {
          setAssignedRoundsCount(null)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCandidateDetails()
  }, [candidateId])

  const handleViewDetails = (round: any) => {
    setSelectedRound(round)
    setIsDialogOpen(true)
  }

  const handleAddReview = () => {
    setReviewData({
      rating: "",
      feedback: "",
      recommendation: "",
      technicalSkills: "",
      communicationSkills: "",
      problemSolving: "",
    })
    setIsReviewDialogOpen(true)
  }

  const handleLoadSuggestions = async () => {
    if (!candidate) return
    setFollowUp([])
    setFollowUpError(null)
    setIsSuggestDialogOpen(true)
    try {
      setFollowUpLoading(true)
      const res = await fetch('/api/interviewer/assigned-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, domainName: candidate.workDomain?.name, limit: 8 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load suggestions')
      setFollowUp(data.suggestions || [])
    } catch (e: any) {
      setFollowUpError(e.message || 'Failed to load suggestions')
    } finally {
      setFollowUpLoading(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!reviewData.rating || !reviewData.feedback) {
      toast("Please provide rating and feedback")
      return
    }

    try {
      const response = await fetch("/api/interviewer/assigned-candidates", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidateId: candidateId,
          status: "completed",
          notes: reviewData.feedback
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success("Review submitted successfully!")
        setIsReviewDialogOpen(false)
        // Optionally refresh candidate data
        window.location.reload()
      } else {
        throw new Error(data.error || "Failed to submit review")
      }
    } catch (error) {
      console.error("Error submitting review:", error)
      toast.error("Failed to submit review")
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p>Loading candidate details...</p>
      </div>
    )
  }

  if (error || !candidate) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center">
        <p className="text-red-600">{error || "Candidate not found."}</p>
        <Button asChild>
          <Link href="/interviewer/candidates">Back to List</Link>
        </Button>
      </div>
    )
  }

  const overallProgress =
    candidate.performance.length > 0 ? (candidate.performance.filter((p: any) => p.passed).length / candidate.performance.length) * 100 : 0

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/interviewer/candidates">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Candidates
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleLoadSuggestions}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Get Follow-up Questions
          </Button>
          <Button onClick={handleAddReview} className="bg-blue-600 hover:bg-blue-700">
            <MessageSquare className="h-4 w-4 mr-2" />
            Add Review
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <Avatar className="w-24 h-24 mx-auto">
              <AvatarImage src={candidate.profilePhoto || "/placeholder.svg"} alt={candidate.username} />
              <AvatarFallback className="text-2xl">
                {candidate.username?.charAt(0) || "C"}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-xl">{candidate.username}</CardTitle>
            <CardDescription>{candidate.workDomain?.name || "No Domain"}</CardDescription>
            <Badge variant="outline" className="mt-2">
              Assigned to You
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {candidate.email}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {candidate.phonenumber}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {`${candidate.city || "N/A"}, ${candidate.state || "N/A"}`}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Applied: {candidate.createdAt ? format(new Date(candidate.createdAt), "PPP") : "N/A"}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Last Login: {candidate.lastLogin ? formatDistanceToNow(new Date(candidate.lastLogin), { addSuffix: true }) : "Never"}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant={candidate.freezeUntil ? "destructive" : "outline"}>
                  {candidate.freezeUntil ? "Under Freezing Period" : "Active"}
                </Badge>
                {candidate.freezeUntil && (
                  <span className="text-xs text-muted-foreground">
                    Until {new Date(candidate.freezeUntil).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <Button className="w-full" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Resume
            </Button>
          </CardContent>
        </Card>

        {/* Details Tabs */}
        <div className="md:col-span-2">
          <Tabs defaultValue="performance" className="space-y-4">
            <TabsList>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
            </TabsList>

            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Round-wise Performance</CardTitle>
                  <CardDescription>Track candidate performance across different interview rounds.</CardDescription>
                  {/* Domain Filter Dropdown */}
                  {allDomains.length > 1 && (
                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-sm font-medium">Domain:</span>
                      <Select value={selectedDomainId || undefined} onValueChange={setSelectedDomainId}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select domain" />
                        </SelectTrigger>
                        <SelectContent>
                          {allDomains.map((domain: any) => (
                            <SelectItem key={domain.id} value={domain.id}>{domain.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Progress</span>
                      <span>
                        {filteredPerformance.filter((p: any) => p.passed).length} of {filteredPerformance.length} rounds passed
                      </span>
                    </div>
                    <Progress value={filteredPerformance.length > 0 ? (filteredPerformance.filter((p: any) => p.passed).length / filteredPerformance.length) * 100 : 0} />
                  </div>

                  <div className="space-y-4">
                    {filteredPerformance.map((round: any, index: number) => (
                      <Card key={index}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base">{round.roundName}</CardTitle>
                              <CardDescription>
                                Completed on {format(new Date(round.completedAt), "PPP")}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-4">
                              <Badge variant={round.passed ? "default" : "destructive"}>
                                {round.passed ? "Passed" : "Failed"}
                              </Badge>
                              <span className="font-semibold">{round.percentage}%</span>
                              <Button variant="outline" size="sm" onClick={() => handleViewDetails(round)}>
                                View Details
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-semibold">Gender:</span> {candidate.gender || "N/A"}</div>
                    <div><span className="font-semibold">Nationality:</span> {candidate.nationality || "N/A"}</div>
                    <div><span className="font-semibold">Address:</span> {candidate.address || "N/A"}</div>
                    <div>
                        <span className="font-semibold">Date of Birth:</span>{" "}
                        {candidate.dateOfBirth ? format(new Date(candidate.dateOfBirth), "PPP") : "N/A"}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {(candidate.skills || []).map((skill: string) => (
                        <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="education">
              <Card>
                <CardHeader>
                  <CardTitle>Educational Background</CardTitle>
                </CardHeader>
                <CardContent>
                  {(candidate.education || []).map((edu: any, index: number) => (
                    <div key={index} className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-medium">{edu.degree}</h4>
                      </div>
                      <p className="text-muted-foreground ml-6">
                        {edu.institution} • {edu.graduationYear} • GPA: {edu.gpa}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Round Details Dialog */}
      {selectedRound && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Details for {selectedRound.roundName}</DialogTitle>
            </DialogHeader>
            <div className="py-4 max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Candidate's Answer</TableHead>
                    <TableHead className="text-center">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedRound.questions.map((q: any, qIndex: number) => (
                    <TableRow key={qIndex}>
                      <TableCell className="font-medium max-w-xs break-words">
                        <p>{q.question}</p>
                        {q.type === 'MCQ' && q.options && (
                          <div className="mt-2 text-sm text-muted-foreground space-y-1">
                            {q.options.map((option: string, i: number) => (
                              <div
                                key={i}
                                className={`
                                  pl-2 border-l-2
                                  ${q.correctAnswer === option ? 'border-green-500 text-green-700 font-semibold' : ''}
                                `}
                              >
                                {option}
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs break-words text-muted-foreground">
                        {q.type === 'MCQ' ? 
                          (q.candidateAnswer && q.options[parseInt(q.candidateAnswer, 10)]) || "Not Answered"
                          : 
                          <>
                            <pre className="whitespace-pre-wrap font-sans">{q.candidateAnswer || "Not Answered"}</pre>
                            {(q.type === 'Coding' || q.type === 'System Design') && q.codeEvaluation && (() => {
                              let evalObj = null;
                              try {
                                evalObj = JSON.parse(q.codeEvaluation);
                              } catch { evalObj = null; }
                              if (!evalObj) return null;
                              return (
                                <div className="mt-2 p-2 rounded bg-blue-50 border border-blue-200 text-xs">
                                  <div className="font-semibold mb-1">Code Evaluation:</div>
                                  <div className="grid grid-cols-2 gap-2 mb-1">
                                    <div>Correctness: <b>{evalObj.correctness ?? "-"}/10</b></div>
                                    <div>Understanding: <b>{evalObj.understanding ?? "-"}/10</b></div>
                                    <div>Code Quality: <b>{evalObj.quality ?? "-"}/10</b></div>
                                    <div>Efficiency: <b>{evalObj.efficiency ?? "-"}/10</b></div>
                                  </div>
                                  <div><span className="font-medium">Feedback:</span> {evalObj.feedback ?? "No feedback"}</div>
                                  
                                  {/* Follow-up Questions Section */}
                                  {evalObj.followUpQuestions && evalObj.followUpQuestions.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-blue-200">
                                      <div className="font-semibold mb-2 text-blue-800">Follow-up Interview Questions:</div>
                                      <div className="space-y-2">
                                        {evalObj.followUpQuestions.map((question: string, index: number) => (
                                          <div key={index} className="p-2 bg-white rounded border border-blue-100">
                                            <span className="font-medium text-blue-700">{index + 1}.</span> {question}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </>
                        }
                      </TableCell>
                      <TableCell className="text-center">
                        {q.isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Review for {candidate.username}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rating">Overall Rating</Label>
              <Select value={reviewData.rating} onValueChange={(value) => setReviewData(prev => ({ ...prev, rating: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent (9-10)</SelectItem>
                  <SelectItem value="good">Good (7-8)</SelectItem>
                  <SelectItem value="average">Average (5-6)</SelectItem>
                  <SelectItem value="poor">Poor (3-4)</SelectItem>
                  <SelectItem value="unsatisfactory">Unsatisfactory (1-2)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="feedback">Detailed Feedback</Label>
              <Textarea
                id="feedback"
                placeholder="Provide detailed feedback about the candidate's performance..."
                value={reviewData.feedback}
                onChange={(e) => setReviewData(prev => ({ ...prev, feedback: e.target.value }))}
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReview}>
              Submit Review
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Follow-up Suggestions Dialog */}
      <Dialog open={isSuggestDialogOpen} onOpenChange={setIsSuggestDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Follow-up Questions</DialogTitle>
          </DialogHeader>
          {followUpLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Preparing suggestions...
            </div>
          )}
          {followUpError && (
            <div className="text-sm text-red-600">{followUpError}</div>
          )}
          {!followUpLoading && !followUpError && (
            <div className="space-y-2">
              {followUp.map((q, i) => (
                <div key={i} className="p-2 border rounded text-sm">
                  <span className="font-medium mr-1">{i + 1}.</span>{q}
                </div>
              ))}
              {followUp.length === 0 && (
                <div className="text-sm text-muted-foreground">No suggestions available.</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 