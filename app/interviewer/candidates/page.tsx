"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Eye, MessageSquare, Calendar, Clock, Loader2, CalendarDays, Clock4, Timer, Video, Phone, Monitor } from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

type AssignedCandidate = {
  id: string
  name: string
  email: string
  workDomain: string
  status: string
  assignedAt: string
  currentRound: number
  totalRounds: number
  lastActivity?: string
  notes?: string
  interviewRounds: any[]
  assignedRounds?: any[]
  phone?: string
  skills: string[]
  progress: any[]
  avatar: string
  assignedInterviewer?: {
    interviewerId: string;
  };
}

// Add a simple StarRating component for skill ratings
function StarRating({ value, onChange, size = 16 }: { value: number, onChange: (v: number) => void, size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          style={{ cursor: 'pointer', color: star <= value ? '#facc15' : '#d1d5db', fontSize: size }}
          onClick={() => onChange(star)}
          data-testid={`star-${star}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function InterviewerCandidatesPage() {
  const [assignedCandidates, setAssignedCandidates] = useState<AssignedCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("assigned");
  const [upcomingFilter, setUpcomingFilter] = useState(false)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<AssignedCandidate | null>(null)
  const [reviewData, setReviewData] = useState({
    rating: "",
    feedback: "",
    recommendation: "",
    technicalSkills: "",
    communicationSkills: "",
    problemSolving: "",
  })

  const [reviewDialogCandidate, setReviewDialogCandidate] = useState<AssignedCandidate | null>(null);
  const [decision, setDecision] = useState("select");
  const [feedback, setFeedback] = useState("");
  const [ratings, setRatings] = useState({
    communication: 0,
    logical: 0,
    technical: 0,
    behavioral: 0,
  });

  const isReviewValid =
    (decision === "pass" || decision === "reject") &&
    feedback.trim().length > 0 &&
    ratings.communication > 0 &&
    ratings.logical > 0 &&
    ratings.technical > 0 &&
    ratings.behavioral > 0;

  // Add a placeholder for currentInterviewerId (replace with real value from session or API)
  const currentInterviewerId = typeof window !== 'undefined' ? localStorage.getItem('interviewerId') : null;

  // Fetch assigned candidates
  useEffect(() => {
    const fetchAssignedCandidates = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/interviewer/assigned-candidates")
        
        if (!response.ok) {
          throw new Error("Failed to fetch assigned candidates")
        }

        const data = await response.json()
        
        if (data.success) {
          setAssignedCandidates(data.assignedCandidates)
        } else {
          throw new Error(data.error || "Failed to load candidates")
        }
      } catch (error) {
        console.error("Error fetching assigned candidates:", error)
        toast.error("Failed to load assigned candidates")
      } finally {
        setLoading(false)
      }
    }

    fetchAssignedCandidates()
  }, [])

  // Remove duplicate candidates by id
  const uniqueAssignedCandidates = assignedCandidates.filter((c, idx, arr) =>
    arr.findIndex(x => x.id === c.id) === idx
  );

  const filteredCandidates = uniqueAssignedCandidates.filter((candidate) => {
    const matchesSearch = candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         candidate.email.toLowerCase().includes(searchTerm.toLowerCase())
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      matchesStatus = candidate.status?.toLowerCase() === statusFilter.toLowerCase();
    }
    // Only show candidates assigned to the current interviewer for status filters
    let matchesInterviewer = true;
    if (statusFilter !== 'all' && currentInterviewerId) {
      matchesInterviewer = candidate.assignedInterviewer?.interviewerId === currentInterviewerId;
    }
    
    // Check if candidate has upcoming interviews (within next 24 hours)
    let hasUpcomingInterview = false;
    if (candidate.assignedRounds && candidate.assignedRounds.length > 0) {
      const now = new Date();
      const upcomingRounds = candidate.assignedRounds.filter((r: any) => {
        if (r.scheduledDate && r.scheduledTime && r.assignedToModel === 'interviewers') {
          const interviewDate = new Date(r.scheduledDate + ' ' + r.scheduledTime);
          const timeDiff = interviewDate.getTime() - now.getTime();
          return timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000; // Within 24 hours
        }
        return false;
      });
      hasUpcomingInterview = upcomingRounds.length > 0;
    }
    
    const matchesUpcoming = !upcomingFilter || hasUpcomingInterview;
    
    return matchesSearch && matchesStatus && matchesInterviewer && matchesUpcoming;
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      case "waiting-for-assignment":
        return "bg-yellow-100 text-yellow-800"
      case "assigned":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleAddReview = (candidate: AssignedCandidate) => {
    setSelectedCandidate(candidate)
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

  const handleSubmitReview = async () => {
    if (!isReviewValid || !reviewDialogCandidate) return;
    // Find the latest assigned round for this candidate assigned to an interviewer and not completed
    const assignedRounds = reviewDialogCandidate.assignedRounds || [];
    const targetRound = assignedRounds
      .filter(r => r.assignedToModel === 'interviewers' && r.status === 'assigned')
      .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())[0];
    const roundId = targetRound?._id;
    if (!roundId) {
      toast.error("Could not determine the interview round to submit review for.");
      return;
    }
    try {
      const response = await fetch("/api/interviewer/assigned-candidates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: reviewDialogCandidate.id,
          roundId,
          feedbackData: {
            decision,
            text: feedback,
            ratings,
          },
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Review submitted!");
        setAssignedCandidates(prev =>
          prev.map(candidate =>
            candidate.id === reviewDialogCandidate.id
              ? { ...candidate, status: decision === "pass" ? "completed-by-interviewer" : "rejected" }
              : candidate
          )
        );
        setReviewDialogCandidate(null);
      } else {
        toast.error(data.error || "Failed to submit review");
      }
    } catch (err) {
      toast.error("Failed to submit review");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading assigned candidates...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">My Candidates</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        {/* Status Filter Dropdown */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Candidates Grid */}
      {filteredCandidates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {assignedCandidates.length === 0 
              ? "No candidates have been assigned to you yet." 
              : "No candidates match your search criteria."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
          {filteredCandidates.map((candidate) => {
            // Find the latest scheduled round with date/time
            let scheduled = null;
            let allScheduledRounds = [];
            if (candidate.assignedRounds && candidate.assignedRounds.length > 0) {
              allScheduledRounds = candidate.assignedRounds
                .filter((r: any) => r.scheduledDate && r.scheduledTime && r.assignedToModel === 'interviewers')
                .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
              scheduled = allScheduledRounds[0]; // Get the earliest scheduled interview
            }
            // Progress calculation
            let currentRoundNum: number = 0;
            let totalRoundsNum: number = 1;
            if (typeof candidate.currentRound === 'number') {
              currentRoundNum = candidate.currentRound;
            } else if (typeof candidate.currentRound === 'string') {
              currentRoundNum = parseInt(candidate.currentRound, 10) || 0;
            }
            if (typeof candidate.totalRounds === 'number') {
              totalRoundsNum = candidate.totalRounds;
            } else if (typeof candidate.totalRounds === 'string') {
              totalRoundsNum = parseInt(candidate.totalRounds, 10) || 1;
            }
            // Format scheduled date/time
            let formattedDate = '', formattedTime = '', formattedDuration = '', formattedFormat = '';
            let isUpcoming = false;
            if (scheduled) {
              const d = new Date(scheduled.scheduledDate);
              const day = String(d.getDate()).padStart(2, '0');
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const year = d.getFullYear();
              formattedDate = `${day}-${month}-${year}`;
              if (scheduled.scheduledTime) {
                const [hour, minute] = scheduled.scheduledTime.split(':');
                const dateObj = new Date();
                dateObj.setHours(Number(hour), Number(minute), 0, 0);
                formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
              }
              formattedDuration = scheduled.durationMinutes ? `${scheduled.durationMinutes} min` : '';
              formattedFormat = scheduled.interviewFormat ? scheduled.interviewFormat : '';
              
              // Check if interview is upcoming (within next 24 hours)
              const now = new Date();
              const interviewDate = new Date(scheduled.scheduledDate + ' ' + scheduled.scheduledTime);
              const timeDiff = interviewDate.getTime() - now.getTime();
              isUpcoming = timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000; // Within 24 hours
            }

            const getFormatIcon = (format: string) => {
              switch (format?.toLowerCase()) {
                case 'online':
                  return <Video className="h-4 w-4" />;
                case 'phone':
                  return <Phone className="h-4 w-4" />;
                case 'offline':
                  return <Monitor className="h-4 w-4" />;
                default:
                  return <Video className="h-4 w-4" />;
              }
            };

            return (
              <Card key={candidate.id} className={`hover:shadow-md transition-shadow ${isUpcoming ? 'border-orange-200 bg-orange-50/30' : ''}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={candidate.avatar || "/placeholder.svg"} alt={candidate.name} />
                      <AvatarFallback>
                        {candidate.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-xl">{candidate.name}</CardTitle>
                        <Badge variant="outline">{candidate.workDomain}</Badge>
                        <Badge className={getStatusColor(candidate.status)}>
                          {candidate.status.replace('-', ' ')}
                        </Badge>
                        {isUpcoming && (
                          <Badge className="bg-orange-100 text-orange-800">
                            Upcoming
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{candidate.email}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Interview Schedule Section - Prominently Displayed */}
                  {scheduled ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <CalendarDays className="h-5 w-5 text-blue-600" />
                        <h4 className="font-semibold text-blue-900">Interview Schedule</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <div>
                            <span className="font-medium">Date:</span>
                            <span className="ml-1">{formattedDate}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock4 className="h-4 w-4 text-blue-600" />
                          <div>
                            <span className="font-medium">Time:</span>
                            <span className="ml-1">{formattedTime}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Timer className="h-4 w-4 text-blue-600" />
                          <div>
                            <span className="font-medium">Duration:</span>
                            <span className="ml-1">{formattedDuration}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {getFormatIcon(formattedFormat)}
                          <div>
                            <span className="font-medium">Format:</span>
                            <span className="ml-1 capitalize">{formattedFormat}</span>
                          </div>
                        </div>
                      </div>

                      {/* Show multiple scheduled interviews if any */}
                      {allScheduledRounds.length > 1 && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <p className="text-xs text-blue-700 mb-2">
                            {allScheduledRounds.length} interview(s) scheduled
                          </p>
                          <div className="space-y-1">
                            {allScheduledRounds.slice(1).map((round: any, idx: number) => {
                              const roundDate = new Date(round.scheduledDate);
                              const roundDay = String(roundDate.getDate()).padStart(2, '0');
                              const roundMonth = String(roundDate.getMonth() + 1).padStart(2, '0');
                              const roundYear = roundDate.getFullYear();
                              const roundFormattedDate = `${roundDay}-${roundMonth}-${roundYear}`;
                              
                              let roundFormattedTime = '';
                              if (round.scheduledTime) {
                                const [hour, minute] = round.scheduledTime.split(':');
                                const dateObj = new Date();
                                dateObj.setHours(Number(hour), Number(minute), 0, 0);
                                roundFormattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                              }
                              
                              return (
                                <div key={idx} className="flex items-center gap-2 text-xs text-blue-600">
                                  <Clock className="h-3 w-3" />
                                  <span>Round {round.roundNumber}: {roundFormattedDate} at {roundFormattedTime}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">No interview scheduled yet</span>
                      </div>
                    </div>
                  )}

                  {candidate.skills && candidate.skills.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Skills</Label>
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills.slice(0, 3).map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {candidate.skills.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{candidate.skills.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Assigned {new Date(candidate.assignedAt).toLocaleDateString()}</span>
                      </div>
                      {candidate.lastActivity && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>Last activity {new Date(candidate.lastActivity).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/interviewer/candidates/${candidate.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </Button>
                    {isUpcoming && (
                      <Button 
                        size="sm" 
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => {
                          // Navigate to interview page or open interview modal
                          window.open(`/interviewer/candidates/${candidate.id}`, '_blank');
                        }}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Start Interview
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setReviewDialogCandidate(candidate);
                        setDecision("select");
                        setFeedback("");
                        setRatings({ communication: 0, logical: 0, technical: 0, behavioral: 0 });
                      }}
                      className="flex-1"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {(() => {
                        const status = (candidate.status || '').toLowerCase();
                        return status === 'completed' || status === 'rejected' ? 'Edit Review' : 'Add Review';
                      })()}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewDialogCandidate} onOpenChange={() => setReviewDialogCandidate(null)}>
        <DialogContent className="sm:max-w-[460px] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg">Review Interview - {reviewDialogCandidate?.name}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {reviewDialogCandidate?.workDomain && (
                <span>Domain: {reviewDialogCandidate.workDomain}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="mb-3 p-3 rounded-lg border bg-gray-50 flex flex-col gap-1">
            <div className="font-medium text-base">{reviewDialogCandidate?.name}</div>
            <div className="text-xs text-muted-foreground">{reviewDialogCandidate?.email}</div>
          </div>
          <hr className="my-3" />
          <div className="mb-3">
            <Label htmlFor="decision" className="text-xs font-semibold mb-1 block">Decision *</Label>
            <Select value={decision} onValueChange={setDecision}>
              <SelectTrigger>
                <SelectValue placeholder="Select decision" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="select">Select decision</SelectItem>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="reject">Reject</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'communication', label: 'Communication Skills' },
              { key: 'logical', label: 'Logical Skills' },
              { key: 'technical', label: 'Technical Knowledge' },
              { key: 'behavioral', label: 'Behavioral Fit' },
            ].map((skill) => (
              <div className="flex items-center justify-between" key={skill.key}>
                <Label className="text-xs font-medium">{skill.label} *</Label>
                <StarRating
                  value={ratings[skill.key as keyof typeof ratings]}
                  onChange={v => setRatings(r => ({ ...r, [skill.key]: v }))}
                  size={18}
                />
              </div>
            ))}
          </div>
          <div className="mb-3">
            <Label htmlFor="feedback" className="text-xs font-semibold mb-1 block">Review Feedback *</Label>
            <Textarea
              id="feedback"
              placeholder="Provide detailed feedback..."
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>
          <DialogFooter className="sm:justify-end">
            <Button
              size="sm"
              className="w-full sm:w-auto"
              onClick={handleSubmitReview}
              disabled={!isReviewValid}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
