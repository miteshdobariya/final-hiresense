"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import toast from "react-hot-toast"
import { Search, MessageSquare, Calendar, Edit, Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"

interface Review {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateAvatar?: string;
  workDomain: string;
  round: string;
  roundId?: string;
  rating: string;
  recommendation: string;
  technicalSkills: string;
  communicationSkills: string;
  problemSolving: string;
  feedback: string;
  reviewDate: string;
  status: string;
}

interface ReviewData {
  rating: string;
  feedback: string;
  recommendation: string;
  technicalSkills: string;
  communicationSkills: string;
  problemSolving: string;
}

interface AssignedCandidate {
  id: string;
  name: string;
  email: string;
  workDomain: string;
  status: string;
  assignedRounds?: Array<{
    _id: string;
    roundNumber: number;
    roundname?: string;
    assignedToModel: string;
    responseSubmitted: boolean;
    feedback?: string;
    assignedAt?: string;
    status: string;
  }>;
  avatar?: string;
}

export default function InterviewerReviewsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [reviewData, setReviewData] = useState<ReviewData>({
    rating: "",
    feedback: "",
    recommendation: "",
    technicalSkills: "",
    communicationSkills: "",
    problemSolving: "",
  })

  // Fetch assigned candidates and transform to reviews
  useEffect(() => {
    if (sessionStatus === "authenticated") {
      setLoading(true)
      fetch("/api/interviewer/assigned-candidates")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.assignedCandidates) {
            const reviewsList: Review[] = []
            
            data.assignedCandidates.forEach((candidate: AssignedCandidate) => {
              const assignedRounds = candidate.assignedRounds || []
              
              // Get rounds assigned to interviewers with feedback
              const interviewerRounds = assignedRounds.filter(
                (round) => round.assignedToModel === "interviewers" && round.responseSubmitted && round.feedback
              )
              
              // Get pending rounds assigned to interviewers
              const pendingRounds = assignedRounds.filter(
                (round) => round.assignedToModel === "interviewers" && round.status === "assigned" && !round.responseSubmitted
              )
              
              // Create review entries for completed rounds
              interviewerRounds.forEach((round) => {
                let feedbackObj: any = {}
                try {
                  feedbackObj = round.feedback ? JSON.parse(round.feedback) : {}
                } catch {}
                
                reviewsList.push({
                  id: `${candidate.id}-${round._id}`,
                  candidateId: candidate.id,
                  candidateName: candidate.name,
                  candidateEmail: candidate.email,
                  candidateAvatar: candidate.avatar,
                  workDomain: candidate.workDomain || "N/A",
                  round: round.roundname || `Round ${round.roundNumber}`,
                  roundId: round._id,
                  rating: feedbackObj.ratings?.technical ? 
                    feedbackObj.ratings.technical >= 9 ? "excellent" :
                    feedbackObj.ratings.technical >= 7 ? "good" :
                    feedbackObj.ratings.technical >= 5 ? "average" :
                    feedbackObj.ratings.technical >= 3 ? "below-average" : "poor" : "",
                  recommendation: feedbackObj.decision === "pass" ? "recommend" : 
                    feedbackObj.decision === "reject" ? "not-recommend" : "",
                  technicalSkills: feedbackObj.ratings?.technical ? 
                    feedbackObj.ratings.technical >= 9 ? "excellent" :
                    feedbackObj.ratings.technical >= 7 ? "good" :
                    feedbackObj.ratings.technical >= 5 ? "average" : "poor" : "",
                  communicationSkills: feedbackObj.ratings?.communication ? 
                    feedbackObj.ratings.communication >= 9 ? "excellent" :
                    feedbackObj.ratings.communication >= 7 ? "good" :
                    feedbackObj.ratings.communication >= 5 ? "average" : "poor" : "",
                  problemSolving: feedbackObj.ratings?.logical ? 
                    feedbackObj.ratings.logical >= 9 ? "excellent" :
                    feedbackObj.ratings.logical >= 7 ? "good" :
                    feedbackObj.ratings.logical >= 5 ? "average" : "poor" : "",
                  feedback: feedbackObj.text || feedbackObj.feedback || "",
                  reviewDate: round.assignedAt || "",
                  status: "Submitted",
                })
              })
              
              // Create review entries for pending rounds
              pendingRounds.forEach((round) => {
                reviewsList.push({
                  id: `${candidate.id}-${round._id}`,
                  candidateId: candidate.id,
                  candidateName: candidate.name,
                  candidateEmail: candidate.email,
                  candidateAvatar: candidate.avatar,
                  workDomain: candidate.workDomain || "N/A",
                  round: round.roundname || `Round ${round.roundNumber}`,
                  roundId: round._id,
                  rating: "",
                  recommendation: "",
                  technicalSkills: "",
                  communicationSkills: "",
                  problemSolving: "",
                  feedback: "",
                  reviewDate: "",
                  status: "Pending",
                })
              })
            })
            
            setReviews(reviewsList)
          }
        })
        .catch((error) => {
          console.error("Error fetching reviews:", error)
          toast.error("Failed to load reviews")
        })
        .finally(() => setLoading(false))
    }
  }, [sessionStatus])

  const filteredReviews = useMemo(() => {
    return reviews.filter((review: Review) => {
      const matchesSearch = review.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.candidateEmail.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "all" || review.status.toLowerCase() === statusFilter.toLowerCase()
      return matchesSearch && matchesStatus
    })
  }, [reviews, searchTerm, statusFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Submitted":
        return "bg-green-100 text-green-800"
      case "Pending":
        return "bg-yellow-100 text-yellow-800"
      case "Draft":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "excellent":
        return "bg-green-100 text-green-800"
      case "good":
        return "bg-blue-100 text-blue-800"
      case "average":
        return "bg-yellow-100 text-yellow-800"
      case "below-average":
        return "bg-orange-100 text-orange-800"
      case "poor":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleAddReview = (review: Review) => {
    setSelectedReview(review)
    setReviewData({
      rating: review.rating || "",
      feedback: review.feedback || "",
      recommendation: review.recommendation || "",
      technicalSkills: review.technicalSkills || "",
      communicationSkills: review.communicationSkills || "",
      problemSolving: review.problemSolving || "",
    })
    setIsReviewDialogOpen(true)
  }

  const handleSubmitReview = async () => {
    if (!reviewData.rating || !reviewData.feedback) {
      toast.error("Please provide rating and feedback")
      return
    }

    if (!selectedReview || !selectedReview.roundId) {
      toast.error("Invalid review data")
      return
    }

    try {
      // Map rating to numeric value
      const ratingMap: { [key: string]: number } = {
        excellent: 9,
        good: 7,
        average: 5,
        "below-average": 3,
        poor: 1,
      }

      const decision = reviewData.recommendation === "strongly-recommend" || reviewData.recommendation === "recommend" 
        ? "pass" 
        : "reject"

      const response = await fetch("/api/interviewer/assigned-candidates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: selectedReview.candidateId,
          roundId: selectedReview.roundId,
          feedbackData: {
            decision,
            text: reviewData.feedback,
            ratings: {
              technical: ratingMap[reviewData.technicalSkills] || ratingMap[reviewData.rating] || 5,
              communication: ratingMap[reviewData.communicationSkills] || 5,
              logical: ratingMap[reviewData.problemSolving] || 5,
              behavioral: ratingMap[reviewData.rating] || 5,
            },
          },
        }),
      })

      const data = await response.json()
      if (response.ok && data.success) {
        toast.success(`Review ${selectedReview.status === "Pending" ? "submitted" : "updated"} for ${selectedReview.candidateName}`)
        setIsReviewDialogOpen(false)
        setSelectedReview(null)
        // Refresh reviews
        window.location.reload()
      } else {
        toast.error(data.error || "Failed to submit review")
      }
    } catch (error) {
      console.error("Error submitting review:", error)
      toast.error("Failed to submit review")
    }
  }

  const formatRating = (rating: string) => {
    switch (rating) {
      case "excellent":
        return "Excellent"
      case "good":
        return "Good"
      case "average":
        return "Average"
      case "below-average":
        return "Below Average"
      case "poor":
        return "Poor"
      default:
        return "Not Rated"
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">My Reviews</h2>
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reviews Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading reviews...</span>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
          {filteredReviews.map((review) => (
          <Card key={review.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={review.candidateAvatar || "/placeholder.svg"} alt={review.candidateName} />
                  <AvatarFallback>
                    {review.candidateName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-xl">{review.candidateName}</CardTitle>
                    <Badge variant="outline">{review.workDomain}</Badge>
                    <Badge className={getStatusColor(review.status)}>{review.status}</Badge>
                  </div>
                  <CardDescription>
                    {review.candidateEmail} • {review.round}
                  </CardDescription>
                </div>
                <div className="text-right">
                  {review.rating && (
                    <>
                      <Badge className={getRatingColor(review.rating)}>{formatRating(review.rating)}</Badge>
                      <div className="text-sm text-muted-foreground mt-1">Overall Rating</div>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {review.status === "Submitted" && (
                <>
                  {/* Skills Breakdown */}
                  <div>
                    <h4 className="font-medium mb-2">Skills Assessment</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-2 border rounded-lg">
                        <div className="text-xs font-medium">Technical</div>
                        <Badge variant="outline" className={getRatingColor(review.technicalSkills)}>
                          {formatRating(review.technicalSkills)}
                        </Badge>
                      </div>
                      <div className="text-center p-2 border rounded-lg">
                        <div className="text-xs font-medium">Communication</div>
                        <Badge variant="outline" className={getRatingColor(review.communicationSkills)}>
                          {formatRating(review.communicationSkills)}
                        </Badge>
                      </div>
                      <div className="text-center p-2 border rounded-lg">
                        <div className="text-xs font-medium">Problem Solving</div>
                        <Badge variant="outline" className={getRatingColor(review.problemSolving)}>
                          {formatRating(review.problemSolving)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Feedback */}
                  <div>
                    <h4 className="font-medium mb-2">Feedback</h4>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm">{review.feedback}</p>
                    </div>
                  </div>

                  {/* Review Date */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Reviewed on {new Date(review.reviewDate).toLocaleDateString()}</span>
                  </div>
                </>
              )}

              {review.status === "Pending" && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Review Required</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    This candidate is waiting for your review to proceed to the next round.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {review.status === "Pending" ? (
                  <Button onClick={() => handleAddReview(review)} className="flex-1">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Add Review
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => handleAddReview(review)} className="flex-1">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Review
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      {!loading && filteredReviews.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No reviews found matching your criteria.</p>
        </div>
      )}

      {/* Add/Edit Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedReview?.status === "Pending" ? "Add Review" : "Edit Review"} for {selectedReview?.candidateName}
            </DialogTitle>
            <DialogDescription>
              Provide your evaluation and feedback for this candidate's performance in {selectedReview?.round}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rating">Overall Rating *</Label>
                <Select
                  value={reviewData.rating}
                  onValueChange={(value) => setReviewData({ ...reviewData, rating: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent (9-10)</SelectItem>
                    <SelectItem value="good">Good (7-8)</SelectItem>
                    <SelectItem value="average">Average (5-6)</SelectItem>
                    <SelectItem value="below-average">Below Average (3-4)</SelectItem>
                    <SelectItem value="poor">Poor (1-2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="recommendation">Recommendation *</Label>
                <Select
                  value={reviewData.recommendation}
                  onValueChange={(value) => setReviewData({ ...reviewData, recommendation: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recommendation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strongly-recommend">Strongly Recommend</SelectItem>
                    <SelectItem value="recommend">Recommend</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="not-recommend">Do Not Recommend</SelectItem>
                    <SelectItem value="strongly-not-recommend">Strongly Do Not Recommend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="technical">Technical Skills</Label>
                <Select
                  value={reviewData.technicalSkills}
                  onValueChange={(value) => setReviewData({ ...reviewData, technicalSkills: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="communication">Communication</Label>
                <Select
                  value={reviewData.communicationSkills}
                  onValueChange={(value) => setReviewData({ ...reviewData, communicationSkills: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="problemSolving">Problem Solving</Label>
                <Select
                  value={reviewData.problemSolving}
                  onValueChange={(value) => setReviewData({ ...reviewData, problemSolving: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="feedback">Detailed Feedback *</Label>
              <Textarea
                id="feedback"
                value={reviewData.feedback}
                onChange={(e) => setReviewData({ ...reviewData, feedback: e.target.value })}
                placeholder="Provide detailed feedback about the candidate's performance, strengths, areas for improvement..."
                className="min-h-[120px]"
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Round:</strong> {selectedReview?.round} • <strong>Domain:</strong> {selectedReview?.workDomain}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                Your review will be used to determine the candidate's progression to the next round.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReview}>
              {selectedReview?.status === "Pending" ? "Submit Review" : "Update Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
