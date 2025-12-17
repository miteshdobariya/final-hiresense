"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Search,
  Star,
  Eye,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation";


interface Candidate {
  id: string;
  username: string;
  email: string;
  status: string;
  assignedRounds: AssignedRound[];
  [key: string]: any;
}

// Add types for candidate and round
interface AssignedRound {
  roundNumber: number;
  assignedTo: string;
  assignedToModel: "admins" | "interviewers";
  assignedAt: string;
  responseSubmitted: boolean;
  status: "assigned" | "completed";
  feedback?: string;
  durationMinutes?: number;
  scheduledDate?: string;
  scheduledTime?: string;
  assignedBy?: string; // Added assignedBy field
}

// Helper to fetch user (interviewer/admin/hr) name by ID with caching
const userNameCache = new Map<string, string>();

async function fetchUserName(userId: string, model: string, role?: string): Promise<string> {
  if (!userId) return "-";
  
  // Check cache first
  const cacheKey = `${userId}-${model}`;
  if (userNameCache.has(cacheKey)) {
    return userNameCache.get(cacheKey) || "-";
  }
  
  try {
    let data;
    // Always use admins endpoint for admin and hr
    if (model === 'admins' || role === 'admin' || role === 'hr') {
      const res = await fetch(`/api/admin/admins/${userId}`);
      if (!res.ok) return "-";
      data = await res.json();
    } else {
      // Otherwise, use interviewers endpoint
      const res = await fetch(`/api/admin/interviewers/${userId}`);
      if (!res.ok) return "-";
      data = await res.json();
    }
    
    const name = data?.username || data?.name || data?.email || "-";
    // Cache the result
    userNameCache.set(cacheKey, name);
    return name;
  } catch (error) {
    console.error('Error fetching user name:', error);
    return "-";
  }
}

function PreviousRounds({ assignedRounds, currentAdminRoundNumber }: { assignedRounds: AssignedRound[], currentAdminRoundNumber: number }) {
  const [names, setNames] = useState<{ [key: number]: string }>({});
  
  // Memoize the filtered rounds to prevent infinite loops
  const previousRounds = useMemo(() => 
    assignedRounds.filter((round: AssignedRound) => round.roundNumber < currentAdminRoundNumber),
    [assignedRounds, currentAdminRoundNumber]
  );

  useEffect(() => {
    let isMounted = true;
    
    async function loadNames() {
      const result: { [key: number]: string } = {};
      for (const round of previousRounds) {
        if (!isMounted) break;
        result[round.roundNumber] = await fetchUserName(round.assignedTo, round.assignedToModel);
      }
      if (isMounted) {
        setNames(result);
      }
    }
    
    loadNames();
    
    return () => {
      isMounted = false;
    };
  }, [previousRounds]);

  return (
    <div className="space-y-2">
      {previousRounds.map((round: AssignedRound, idx: number) => {
        let feedback: { decision?: string; rating?: string; feedback?: string } = {};
        try { feedback = round.feedback ? JSON.parse(round.feedback) : {}; } catch {}
        return (
          <div key={idx} className="p-2 border rounded bg-muted">
            <div className="font-semibold">Round {round.roundNumber} ({round.assignedToModel === 'admins' ? 'Admin' : 'Interviewer'}): {names[round.roundNumber] || '-'}</div>
            <div>Date: {round.assignedAt ? new Date(round.assignedAt).toLocaleString() : '-'}</div>
            <div>Decision: {feedback.decision || '-'}</div>
            <div>Rating: {feedback.rating || '-'}</div>
            <div>Feedback: {feedback.feedback || '-'}</div>
          </div>
        );
      })}
    </div>
  );
}

function ReviewCard({ review, openReviewDialog }: { review: Candidate, openReviewDialog: (review: Candidate) => void }) {
  const router = useRouter();
  const [reviewerNames, setReviewerNames] = useState<{ [key: number]: string }>({});
  
  // Get all completed rounds with feedback - memoize this to prevent infinite loops
  const completedRounds = useMemo(() => 
    review.assignedRounds.filter((r: AssignedRound) => 
      r.responseSubmitted && r.feedback
    ), [review.assignedRounds]
  );

  useEffect(() => {
    let isMounted = true;
    
    async function loadReviewerNames() {
      const result: { [key: number]: string } = {};
      for (const round of completedRounds) {
        if (!isMounted) break;
        result[round.roundNumber] = await fetchUserName(round.assignedTo, round.assignedToModel);
      }
      if (isMounted) {
        setReviewerNames(result);
      }
    }
    
    loadReviewerNames();
    
    return () => {
      isMounted = false;
    };
  }, [completedRounds]);

  const candidateStatus = (review.status || '').toLowerCase();
  const isAccepted = candidateStatus === 'final-accepted';
  const isRejected = candidateStatus === 'rejected';

  return (
    <Card key={review.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src={review.candidateAvatar || "/placeholder.svg"} alt={review.name} />
              <AvatarFallback>
                {(review.name ?? "").split(" ").map((n: string) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{review.name}</CardTitle>
              <CardDescription>
                {review.domain?.name || review.workDomain?.name || "N/A"} • {completedRounds.length} review(s)
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline">{review.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show all reviews */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-muted-foreground">Reviews:</h4>
          {completedRounds.map((round: AssignedRound, idx: number) => {
            let feedback: { decision?: string; feedback?: string; rating?: number; text?: string } = {};
            try {
              feedback = round.feedback ? JSON.parse(round.feedback) : {};
            } catch {}
            
            return (
              <div key={idx} className="p-3 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={round.assignedToModel === 'admins' ? 'default' : 'secondary'}>
                      {round.assignedToModel === 'admins' ? 'Admin' : 'Interviewer'}
                    </Badge>
                    <span className="text-sm font-medium">Round {round.roundNumber}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {round.assignedAt ? new Date(round.assignedAt).toLocaleDateString() : '-'}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <div><span className="font-medium">Reviewer:</span> {reviewerNames[round.roundNumber] || '-'}</div>
                  <div><span className="font-medium">Decision:</span> {feedback.decision || '-'}</div>
                  <div><span className="font-medium">Feedback:</span> {feedback.feedback || feedback.text || '-'}</div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="w-1/2"
            onClick={() => router.push(`/admin/candidates/${review.id}?from=reviews`)}
          >
            View Candidate Details
          </Button>
          <Button onClick={() => openReviewDialog(review)} className="w-1/2">
            <Eye className="mr-2 h-4 w-4" />
            View All Reviews
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReviewsPage() {
  const { data: session, status } = useSession();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Candidate | null>(null)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewTypeFilter, setReviewTypeFilter] = useState('all'); // New filter for review type

  // Fetch all candidates with reviews (both admin and interviewer reviews)
  useEffect(() => {
    if (status === "authenticated") {
      setLoading(true);
      fetch("/api/admin/candidates")
        .then(res => res.json())
        .then(data => {
          // Get all candidates that have any completed rounds with feedback
          const candidatesWithReviews = (data.candidates || []).filter((candidate: Candidate) => {
            return candidate.assignedRounds.some(
              (r: AssignedRound) => r.responseSubmitted && r.feedback
            );
          });
          setCandidates(candidatesWithReviews);
        })
        .finally(() => setLoading(false));
    }
  }, [status]); // Remove session dependency to prevent unnecessary re-fetches

  // Memoized filtering logic to prevent unnecessary recalculations
  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate: Candidate) => {
      const matchesSearch =
        (candidate.username?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (candidate.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (candidate.email?.toLowerCase() || "").includes(searchTerm.toLowerCase());

      // Check if candidate has reviews of the selected type
      const hasReviewsOfType = candidate.assignedRounds.some((r: AssignedRound) => {
        if (!r.responseSubmitted || !r.feedback) return false;
        
        if (reviewTypeFilter === 'all') return true;
        if (reviewTypeFilter === 'admin') return r.assignedToModel === 'admins';
        if (reviewTypeFilter === 'interviewer') return r.assignedToModel === 'interviewers';
        
        return true;
      });

      if (!hasReviewsOfType) return false;

      // Status filtering based on latest round
      const candidateStatus = (candidate.status || '').toLowerCase();
      
      if (statusFilter === 'all') return matchesSearch;
      if (statusFilter === 'accepted') {
        return matchesSearch && candidateStatus === 'final-accepted';
      }
      if (statusFilter === 'rejected') {
        return matchesSearch && candidateStatus === 'rejected';
      }
      if (statusFilter === 'pending') {
        return matchesSearch && 
               candidateStatus !== 'final-accepted' && 
               candidateStatus !== 'rejected';
      }
      
      return matchesSearch;
    });
  }, [candidates, searchTerm, statusFilter, reviewTypeFilter]);

  const openReviewDialog = (review: Candidate) => {
    setSelectedReview(review)
    setIsReviewDialogOpen(true)
  }


  const renderStars = (rating: number, interactive = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star: number) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            } ${interactive ? "cursor-pointer hover:text-yellow-400" : ""}`}
            onClick={interactive ? () => setReviewForm({ ...reviewForm, rating: star }) : undefined}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">All Reviews</h2>
          <p className="text-muted-foreground mt-1">
            View all reviews given by HR/Admins and Interviewers to candidates
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates by name or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
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
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={reviewTypeFilter} onValueChange={setReviewTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by review type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reviews</SelectItem>
            <SelectItem value="admin">Admin Reviews</SelectItem>
            <SelectItem value="interviewer">Interviewer Reviews</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading reviews...</p>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No reviews match your criteria.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
          {filteredCandidates.map((review) => (
            <ReviewCard key={review.id} review={review} openReviewDialog={openReviewDialog} />
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Reviews - {selectedReview?.name || selectedReview?.username}</DialogTitle>
            <DialogDescription>
              Complete review history for {selectedReview?.workDomain?.name || selectedReview?.domain?.name || "N/A"} domain
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-6 py-4">
              {/* Show all reviews */}
              <div className="space-y-4">
                {selectedReview.assignedRounds
                  .filter((r: AssignedRound) => r.responseSubmitted && r.feedback)
                  .map((round: AssignedRound, idx: number) => {
                    let feedback: { decision?: string; feedback?: string; rating?: number; text?: string } = {};
                    try {
                      feedback = round.feedback ? JSON.parse(round.feedback) : {};
                    } catch {}
                    
                    return (
                      <Card key={idx} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant={round.assignedToModel === 'admins' ? 'default' : 'secondary'}>
                                {round.assignedToModel === 'admins' ? 'Admin Review' : 'Interviewer Review'}
                              </Badge>
                              <span className="font-semibold">Round {round.roundNumber}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {round.assignedAt ? new Date(round.assignedAt).toLocaleDateString() : '-'}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Reviewer:</span>
                              <div className="text-muted-foreground">{round.assignedToModel === 'admins' ? 'Admin/HR' : 'Interviewer'}</div>
                            </div>
                            <div>
                              <span className="font-medium">Decision:</span>
                              <div className="text-muted-foreground">{feedback.decision || '-'}</div>
                            </div>
                          </div>
                          
                          {feedback.rating && (
                            <div>
                              <span className="font-medium">Rating:</span>
                              <div className="flex items-center gap-1 mt-1">
                                {renderStars(feedback.rating)}
                                <span className="text-sm text-muted-foreground ml-2">{feedback.rating}/5</span>
                              </div>
                            </div>
                          )}
                          
                          <div>
                            <span className="font-medium">Feedback:</span>
                            <div className="mt-1 p-3 bg-muted rounded-md">
                              {feedback.feedback || feedback.text || 'No feedback provided'}
                            </div>
                          </div>
                          
                          {round.scheduledDate && (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Scheduled Date:</span>
                                <div className="text-muted-foreground">
                                  {new Date(round.scheduledDate).toLocaleDateString()}
                                </div>
                              </div>
                              {round.durationMinutes && (
                                <div>
                                  <span className="font-medium">Duration:</span>
                                  <div className="text-muted-foreground">{round.durationMinutes} minutes</div>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                
                {selectedReview.assignedRounds.filter((r: AssignedRound) => r.responseSubmitted && r.feedback).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No reviews available for this candidate.
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
