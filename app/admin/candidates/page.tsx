"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, Plus, Eye, UserPlus, Loader2, Edit, MoreVertical } from "lucide-react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu"

type Interviewer = {
  id: string
  _id?: string
  name: string
  email: string
  phone: string
  role: string
  experience: string
  skills: string[]
  activeInterviews: number
  completedInterviews: number
  status: string
  profileCompleted: boolean
  createdAt: string
  updatedAt: string
}

type Candidate = {
  id: string
  _id?: string
  name: string
  email: string
  phone: string
  workDomain: { id: string; name: string }
  role: string
  skills: string[]
  status: string
  avatar: string
  appliedDate: string
  currentRound: string
  score: number
  assignedInterviewer?: {
    interviewerId: string
    assignedAt: string
    assignedBy: string
    status: string
    name?: string // <-- add this
  } | null
  roundsCleared?: number
  totalRounds?: number
  isInFinalRound?: boolean
  address?: string
  city?: string
  state?: string
  dateOfBirth?: string
  gender?: string
  nationality?: string
  zipCode?: string
  education?: string
  createdAt?: string
  lastLogin?: string
  assignedRounds?: {
    id: string;
    assignedAt: string;
    assignedBy: string;
    assignedTo: string | { $oid: string };
    assignedToModel: string;
    status: string;
  }[];
  assignedPersonName?: string; // Added for the new logic
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [interviewers, setInterviewers] = useState<Interviewer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [domainFilter, setDomainFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isChangeInterviewerDialogOpen, setIsChangeInterviewerDialogOpen] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [selectedInterviewer, setSelectedInterviewer] = useState("")
  const [newInterviewerId, setNewInterviewerId] = useState("")
  const router = useRouter()
  const [adminMap, setAdminMap] = useState<{ [id: string]: string }>({});
  const [isFinalNoteDialogOpen, setIsFinalNoteDialogOpen] = useState(false);
  const [finalNoteAction, setFinalNoteAction] = useState<"accept" | "reject" | null>(null);
  const [finalNoteCandidate, setFinalNoteCandidate] = useState<Candidate | null>(null);
  const [finalNote, setFinalNote] = useState("");
  const [finalNoteLoading, setFinalNoteLoading] = useState(false);

  // Fetch candidates from API
  const fetchCandidates = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/candidates")

      if (!response.ok) {
        throw new Error("Failed to fetch candidates")
      }

      const data = await response.json()

      // The API now returns data in the expected format, so we can use it directly.
      setCandidates(data.candidates)
      setError(null)
    } catch (err) {
      console.error("Error fetching candidates:", err)
      setError(err instanceof Error ? err.message : String(err))
      toast("Failed to load candidates. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Fetch active interviewers from API
  useEffect(() => {
    const fetchInterviewers = async () => {
      try {
        const response = await fetch("/api/admin/interviewers")

        if (!response.ok) {
          throw new Error("Failed to fetch interviewers")
        }

        const data = await response.json()
        
        // Filter only active interviewers
        const activeInterviewers = data.interviewers.filter(
          (interviewer: Interviewer) => interviewer.status === "Active"
        )
        
        setInterviewers(activeInterviewers)
      } catch (err) {
        console.error("Error fetching interviewers:", err)
        toast("Failed to load interviewers. Please try again.")
      }
    }

    fetchInterviewers()
  }, [])

  // Fetch admins for lookup
  useEffect(() => {
    fetch('/api/admin/admins')
      .then(res => res.json())
      .then(data => {
        const map: { [id: string]: string } = {};
        (data.admins || []).forEach((a: any) => {
          map[a._id] = a.username || a.name || a.email || a._id;
        });
        setAdminMap(map);
      });
  }, []);

  useEffect(() => {
    fetchCandidates()
  }, [])

  const filteredCandidates = candidates
    .filter((candidate) => {
      const matchesSearch =
        (candidate.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (candidate.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (candidate.role?.toLowerCase() || "").includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "all" || (candidate.status?.toLowerCase() || "") === statusFilter.toLowerCase()
      const matchesDomain = domainFilter === "all" || candidate.workDomain?.name === domainFilter
      return matchesSearch && matchesStatus && matchesDomain
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "")
        case "date":
          // Assuming 'createdAt' is available from the API now.
          // If not, we may need to adjust the API or remove this sort option.
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        case "score":
          return (b.score || 0) - (a.score || 0)
        default:
          return 0
      }
    })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      case "waiting-for-assignment":
        return "bg-yellow-100 text-yellow-800"
      case "assigned-interviewer":
        return "bg-purple-100 text-purple-800"
      case "assigned-admin":
        return "bg-green-100 text-green-800"
      case "waiting-for-admin-assignment":
        return "bg-orange-100 text-orange-800"
      case "final-accepted":
        return "bg-green-200 text-green-900"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "accepted by candidate":
        return "bg-green-100 text-green-800"
      case "rejected by candidate":
        return "bg-red-200 text-red-900"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleAssignCandidate = (candidate: Candidate) => {
    router.push(`/admin/candidates/${candidate.id}/schedule`)
  }

  const handleChangeInterviewer = (candidate: Candidate) => {
    setSelectedCandidate(candidate)
    setNewInterviewerId("")
    setIsChangeInterviewerDialogOpen(true)
  }

  const handleChangeInterviewerSubmit = async () => {
    if (!selectedCandidate) {
      toast("No candidate selected")
      return
    }

    try {
      const response = await fetch("/api/admin/candidates/assign-interviewer", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          newInterviewerId: newInterviewerId || null
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        if (!newInterviewerId || newInterviewerId === "none") {
          toast.success(`${selectedCandidate.name} has been unassigned from interviewer successfully`)
        } else {
          toast.success(`${selectedCandidate.name} has been reassigned to new interviewer successfully`)
        }
        
        // Refresh candidates list to show updated assignment
        fetchCandidates();
      } else {
        throw new Error(data.error || "Failed to change interviewer")
      }
    } catch (error) {
      console.error("Error changing interviewer:", error)
      toast.error(error instanceof Error ? error.message : "Failed to change interviewer")
    }

    setIsChangeInterviewerDialogOpen(false)
    setSelectedCandidate(null)
    setNewInterviewerId("")
  }

  const handleFinalNoteClick = (candidate: Candidate, action: "accept" | "reject") => {
    setFinalNoteCandidate(candidate);
    setFinalNoteAction(action);
    setFinalNote("");
    setIsFinalNoteDialogOpen(true);
  };

  const handleFinalNoteSubmit = async () => {
    if (!finalNoteCandidate || !finalNoteAction) return;
    setFinalNoteLoading(true);
    try {
      const response = await fetch("/api/admin/candidates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: finalNoteCandidate.id,
          status: finalNoteAction === "accept" ? "accepted by candidate" : "rejected by candidate",
          finalnote: finalNote,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update status");
      toast.success(`Candidate status updated to ${finalNoteAction === "accept" ? "Accepted by Candidate" : "Rejected by Candidate"}`);
      setIsFinalNoteDialogOpen(false);
      setFinalNoteCandidate(null);
      setFinalNoteAction(null);
      setFinalNote("");
      fetchCandidates();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setFinalNoteLoading(false);
    }
  };

  // Get unique domains for filter dropdown
  const uniqueDomains = [...new Set(candidates.map((candidate) => candidate.workDomain?.name).filter(Boolean))]
    .filter(domain => domain && domain.trim() !== "" && domain !== "N/A")
    .sort()

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-6 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Candidates</h2>
            <p className="text-muted-foreground">Manage and track candidate applications</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading candidates...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-6 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Candidates</h2>
            <p className="text-muted-foreground">Manage and track candidate applications</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <p className="text-red-600">Error: {error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 pt-6 h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Candidates</h2>
          <p className="text-muted-foreground">Manage and track candidate applications</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search candidates by name, email, or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="waiting-for-assignment">Waiting for Assignment</SelectItem>
              <SelectItem value="assigned-interviewer">Assigned to Interviewer</SelectItem>
              <SelectItem value="assigned-admin">Assigned to Admin</SelectItem>
              <SelectItem value="waiting-for-admin-assignment">Waiting for Admin Assignment</SelectItem>
              <SelectItem value="final-accepted">Final Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="accepted by candidate">Accepted by Candidate</SelectItem>
              <SelectItem value="rejected by candidate">Rejected by Candidate</SelectItem>
            </SelectContent>
          </Select>
          <Select value={domainFilter} onValueChange={setDomainFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Domain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              {uniqueDomains.length > 0 ? (
                uniqueDomains.map((domain) => (
                  <SelectItem key={domain} value={domain}>
                    {domain}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-domains" disabled>
                  No domains available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="date">Date Applied</SelectItem>
              <SelectItem value="score">Score</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">{filteredCandidates.length} candidates found</div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto ">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Work Domain</TableHead>
              <TableHead>Avg. Score</TableHead>
              <TableHead>Current Round</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned Interviewer</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCandidates.map((candidate) => (
              <TableRow key={candidate.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={"/placeholder.svg"} alt={candidate.name} />
                      <AvatarFallback>{candidate.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{candidate.name}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{candidate.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {candidate.workDomain?.name || "N/A"}
                </TableCell>
                <TableCell>
                  {typeof candidate.score === 'number' ? `${candidate.score}` : 'N/A'}
                </TableCell>
                <TableCell>
                  {candidate.currentRound || 'N/A'}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`text-xs ${getStatusColor(candidate.status)}`}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {(candidate.status ? candidate.status.replace(/-/g, ' ') : "Unknown")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {candidate.assignedPersonName ? (
                    <div><div className="font-medium">{candidate.assignedPersonName}</div></div>
                  ) : (() => {
                    const latestRound = candidate.assignedRounds
                      ?.filter(r => r.status === "assigned")
                      .sort((a, b) => new Date(b.assignedAt || 0).getTime() - new Date(a.assignedAt || 0).getTime())[0];
                    if (!latestRound) return <span className="text-muted-foreground">Not assigned</span>;
                    // Handle both string and object (ObjectId) for assignedTo
                    const assignedToId = typeof latestRound.assignedTo === 'object' && latestRound.assignedTo !== null && '$oid' in latestRound.assignedTo
                      ? (latestRound.assignedTo as { $oid: string }).$oid
                      : latestRound.assignedTo;
                    if (latestRound.assignedToModel === "interviewers") {
                      const interviewer = interviewers.find(
                        i => String(i.id || i["_id"]) === String(assignedToId)
                      );
                      return interviewer ? (
                        <div><div className="font-medium">{interviewer.name}</div></div>
                      ) : (
                        <span className="text-muted-foreground">Not assigned</span>
                      );
                    }
                    if (latestRound.assignedToModel === "admins") {
                      const adminName = adminMap[String(assignedToId)];
                      return adminName ? (
                        <div><div className="font-medium">{adminName}</div></div>
                      ) : (
                        <span className="text-muted-foreground">Not assigned</span>
                      );
                    }
                    return <span className="text-muted-foreground">Not assigned</span>;
                  })()}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex gap-2 justify-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/candidates/${candidate.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View candidate details</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {candidate.status?.toLowerCase() === 'final-accepted' ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleFinalNoteClick(candidate, "accept")}>Accept</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleFinalNoteClick(candidate, "reject")}>Reject</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (candidate.status?.toLowerCase() === 'rejected by candidate' || candidate.status?.toLowerCase() === 'accepted by candidate' ? null : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => router.push(`/admin/candidates/${candidate.id}/schedule`)}
                              className={(
                                candidate.assignedInterviewer?.name ||
                                candidate.assignedInterviewer?.interviewerId ||
                                candidate.assignedPersonName
                              )
                                ? "bg-blue-600 text-white hover:bg-blue-700 border border-blue-600"
                                : "bg-black text-white hover:bg-gray-800 border border-black"}
                            >
                              {(
                                candidate.assignedInterviewer?.name ||
                                candidate.assignedInterviewer?.interviewerId ||
                                candidate.assignedPersonName
                              ) ? (
                                <Edit className="h-4 w-4" />
                              ) : (
                                <UserPlus className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {(
                              candidate.assignedInterviewer?.name ||
                              candidate.assignedInterviewer?.interviewerId ||
                              candidate.assignedPersonName
                            ) ? "Edit assignment" : "Assign interviewer/admin"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredCandidates.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No candidates found matching your criteria.</p>
        </div>
      )}

      {/* Change Interviewer Dialog */}
      <Dialog open={isChangeInterviewerDialogOpen} onOpenChange={setIsChangeInterviewerDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Interviewer</DialogTitle>
            <DialogDescription>
              Reassign {selectedCandidate?.name} to a different interviewer or unassign them.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newInterviewer">Select New Interviewer</Label>
              <Select value={newInterviewerId} onValueChange={setNewInterviewerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a new interviewer or unassign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div>
                      <div className="font-medium text-red-600">Unassign (No Interviewer)</div>
                      <div className="text-sm text-muted-foreground">
                        Remove candidate from current interviewer
                      </div>
                    </div>
                  </SelectItem>
                  {interviewers.length === 0 ? (
                    <SelectItem value="no-interviewers" disabled>
                      No active interviewers available
                    </SelectItem>
                  ) : (
                    interviewers.map((interviewer) => (
                      <SelectItem key={interviewer.id} value={interviewer.id}>
                        <div>
                          <div className="font-medium">{interviewer.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {interviewer.skills && interviewer.skills.length > 0 
                              ? interviewer.skills.join(", ") 
                              : "No skills listed"}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Current Interviewer:</strong> {
                  selectedCandidate?.assignedInterviewer?.interviewerId 
                    ? interviewers.find(i => i.id === selectedCandidate.assignedInterviewer?.interviewerId)?.name || "Unknown"
                    : "None"
                }
              </p>
              <p className="text-sm text-yellow-600 mt-1">
                {newInterviewerId === "none" 
                  ? "The candidate will be unassigned from the current interviewer."
                  : "The candidate will be unassigned from the current interviewer and assigned to the new one."
                }
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangeInterviewerDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleChangeInterviewerSubmit} 
              disabled={interviewers.length === 0 && newInterviewerId !== "none"}
              className={newInterviewerId === "none" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {newInterviewerId === "none" ? "Unassign Interviewer" : "Change Interviewer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final Note Dialog */}
      <Dialog open={isFinalNoteDialogOpen} onOpenChange={setIsFinalNoteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{finalNoteAction === "accept" ? "Accept Candidate" : "Reject Candidate"}</DialogTitle>
            <DialogDescription>
              Please provide a reason for {finalNoteAction === "accept" ? "accepting" : "rejecting"} this candidate.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="finalNote">Reason</Label>
              <Input
                id="finalNote"
                value={finalNote}
                onChange={e => setFinalNote(e.target.value)}
                placeholder="Enter reason here..."
                disabled={finalNoteLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFinalNoteDialogOpen(false)} disabled={finalNoteLoading}>
              Cancel
            </Button>
            <Button onClick={handleFinalNoteSubmit} disabled={finalNoteLoading || !finalNote} className={finalNoteAction === "accept" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}>
              {finalNoteAction === "accept" ? "Accept" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
