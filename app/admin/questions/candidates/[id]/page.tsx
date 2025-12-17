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
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Utility to format date as DD-MM-YYYY
function formatDateDMY(dateStr: string) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function CandidateDetailPage() {
  const params = useParams()
  const candidateId = params.id as string
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const backLabel = from === "reviews" ? "Back to Reviews" : "Back to Candidates";
  const backHref = from === "reviews" ? "/admin/reviews" : "/admin/candidates";

  const [candidate, setCandidate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRound, setSelectedRound] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [assignedRoundsCount, setAssignedRoundsCount] = useState<number | null>(null)
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null)
  const [allDomainRounds, setAllDomainRounds] = useState<{ [domainId: string]: number }>({})
  const [resumeUrl, setResumeUrl] = useState<string | null>(null)
  const [interviewerMap, setInterviewerMap] = useState<{ [id: string]: string }>({});
  const [adminMap, setAdminMap] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    const fetchCandidateDetails = async () => {
      if (!candidateId) return
      setLoading(true)
      try {
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

  // Use direct resume URL stored on disk (no S3)
  useEffect(() => {
    if (candidate?.resume?.fileUrl) {
      setResumeUrl(candidate.resume.fileUrl);
    } else {
      setResumeUrl(null);
    }
  }, [candidate?.resume?.fileUrl]);

  // Fetch all interviewers and all admins when the component loads. Build lookup maps from ID to name for both.
  useEffect(() => {
    // Fetch all interviewers
    fetch('/api/admin/interviewers')
      .then(res => res.json())
      .then(data => {
        const map: { [id: string]: string } = {};
        (data.interviewers || []).forEach((i: any) => {
          map[i.id] = i.name || i.username || i.email || i.id;
        });
        setInterviewerMap(map);
      });
    // Fetch all admins
    fetch('/api/admin/admins')
      .then(res => res.json())
      .then(data => {
        const map: { [id: string]: string } = {};
        (data.admins || []).forEach((a: any) => {
          map[a._id] = a.username || a.email || a._id;
        });
        setAdminMap(map);
      });
  }, []);

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

  // Fetch all domains and their round counts
  useEffect(() => {
    async function fetchDomainRounds() {
      const res = await fetch('/api/domains');
      const data = await res.json();
      const map: { [domainId: string]: number } = {};
      data.domains.forEach((domain: any) => {
        if (domain._id && Array.isArray(domain.rounds)) {
          map[String(domain._id)] = domain.rounds.length;
        }
      });
      setAllDomainRounds(map);
    }
    fetchDomainRounds();
  }, []);

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

  const handleViewDetails = (round: any) => {
    setSelectedRound(round)
    setIsDialogOpen(true)
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
          <Link href="/admin/candidates">Back to List</Link>
        </Button>
      </div>
    )
  }

  const overallProgress =
    candidate.performance.length > 0 ? (candidate.performance.filter((p: any) => p.passed).length / candidate.performance.length) * 100 : 0

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-muted-foreground mb-4"
        onClick={() => router.push(backHref)}
      >
        <span style={{ fontSize: "1.2em" }}>←</span> {backLabel}
      </button>

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
                {`${candidate.city}, ${candidate.state}`}
              </div>
              {candidate.professionalDetails?.referenceName && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">Reference Name:</span> {candidate.professionalDetails.referenceName}
                </div>
              )}
              {candidate.professionalDetails?.referenceContact && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">Reference Contact:</span> {candidate.professionalDetails.referenceContact}
                </div>
              )}
              {/* LinkedIn and GitHub URLs as clickable links */}
              {candidate.professionalDetails?.linkedInUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">LinkedIn:</span>
                  <a
                    href={candidate.professionalDetails.linkedInUrl.startsWith('http') ? candidate.professionalDetails.linkedInUrl : `https://${candidate.professionalDetails.linkedInUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {candidate.professionalDetails.linkedInUrl}
                  </a>
                </div>
              )}
              {candidate.professionalDetails?.githubUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">GitHub:</span>
                  <a
                    href={candidate.professionalDetails.githubUrl.startsWith('http') ? candidate.professionalDetails.githubUrl : `https://${candidate.professionalDetails.githubUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {candidate.professionalDetails.githubUrl}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Applied: {candidate.createdAt ? format(new Date(candidate.createdAt), "PPP") : "N/A"}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Last Login: {candidate.lastLogin ? formatDistanceToNow(new Date(candidate.lastLogin), { addSuffix: true }) : "Never"}
              </div>
              {/* View Resume Button using signed URL */}
              {resumeUrl && (
                <div className="mt-2">
                  <Button
                    onClick={() => window.open(resumeUrl, '_blank', 'noopener,noreferrer')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    View Resume
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Details Tabs */}
        <div className="md:col-span-2">
          <Tabs defaultValue="performance" className="space-y-4">
            <TabsList>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="interview-details">Interview Details</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="professional-details">Professional Details</TabsTrigger>
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
                        {filteredPerformance.filter((p: any) => p.passed).length} of {selectedDomainId && allDomainRounds[selectedDomainId] ? allDomainRounds[selectedDomainId] : filteredPerformance.length} rounds passed
                      </span>
                    </div>
                    <Progress value={filteredPerformance.length > 0 ? (filteredPerformance.filter((p: any) => p.passed).length / (selectedDomainId && allDomainRounds[selectedDomainId] ? allDomainRounds[selectedDomainId] : filteredPerformance.length)) * 100 : 0} />
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span>Average Score</span>
                    <span>
                      {filteredPerformance.length > 0
                        ? `${(
                            filteredPerformance.reduce((sum: number, p: any) => sum + (p.percentage || 0), 0) / filteredPerformance.length
                          ).toFixed(2)}%`
                        : 'N/A'}
                    </span>
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
                              <span className="font-semibold">{round.percentage.toFixed(2)}%</span>
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

            <TabsContent value="interview-details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Interview Assignment Details</CardTitle>
                  <CardDescription>All assignment data for this candidate, shown in card format.</CardDescription>
                </CardHeader>
                <CardContent>
                  {Array.isArray(candidate.assignedRounds) && candidate.assignedRounds.length > 0 ? (
                    <div className="grid gap-4">
                      {candidate.assignedRounds.map((round: any, idx: number) => {
                        // Resolve assignee name
                        // Prefer directly stored names, fallback to map or ID
                        let assigneeName = round.assignedToName || interviewerMap[round.assignedTo] || adminMap[round.assignedTo] || round.assignedTo;
                        let assignedByName = round.assignedByName || adminMap[round.assignedBy] || interviewerMap[round.assignedBy] || round.assignedBy;
                        return (
                          <Card key={idx} className="border shadow-sm">
                            <CardHeader>
                              <CardTitle>Round {round.roundNumber} ({round.assignedToModel})</CardTitle>
                              <CardDescription>Status: {round.status}</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              <div><b>Assignee:</b> {assigneeName || 'N/A'}</div>
                              <div><b>Assigned By:</b> {assignedByName || 'N/A'}</div>
                              <div><b>Assigned At:</b> {formatDateDMY(round.assignedAt)}</div>
                              <div><b>Scheduled Date:</b> {formatDateDMY(round.scheduledDate)}</div>
                              <div><b>Scheduled Time:</b> {round.scheduledTime
                                ? (() => {
                                    const [hour, minute] = round.scheduledTime.split(":");
                                    const date = new Date();
                                    date.setHours(Number(hour), Number(minute), 0, 0);
                                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                                  })()
                                : "N/A"}
                              </div>
                              <div><b>Duration:</b> {round.durationMinutes ? `${round.durationMinutes} min` : 'N/A'}</div>
                              <div><b>Format:</b> {round.interviewFormat || 'N/A'}</div>
                              <div>
                                {((): React.ReactNode => {
                                  let feedbackObj = null;
                                  try {
                                    feedbackObj = JSON.parse(round.feedback);
                                  } catch {}
                                  if (!feedbackObj) return <span>{round.feedback || 'N/A'}</span>;
                                  return (
                                    <div className="my-2">
                                      <div className="font-bold text-blue-900 text-base mb-2">Feedback</div>
                                      <div className="space-y-1 p-3 rounded bg-blue-50 border border-blue-300">
                                        <div>
                                          <b>Decision:</b> <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-semibold mr-2">{feedbackObj.decision}</span>
                                          {feedbackObj.text && <><b>Comment:</b> {feedbackObj.text}</>}
                                        </div>
                                        {feedbackObj.ratings && (
                                          <div className="mt-1">
                                            <b>Ratings:</b>
                                            <ul className="ml-4 list-disc">
                                              {Object.entries(feedbackObj.ratings).map(([key, value]) => (
                                                <li key={key}>
                                                  {key.charAt(0).toUpperCase() + key.slice(1)}:
                                                  <span style={{ color: '#fbbf24', fontSize: '1.1em', letterSpacing: '1px' }}>
                                                    {Array.from({ length: Math.max(0, Math.min(5, Number(value))) }).map((_, i) => '★').join('')}
                                                  </span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                              <div><b>Response Submitted:</b> {round.responseSubmitted ? 'Yes' : 'No'}</div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No assignments found for this candidate.</div>
                  )}
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

            <TabsContent value="professional-details">
              <Card>
                <CardHeader>
                  <CardTitle>Professional Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {candidate.professionalDetails ? (
                    (() => {
                      const isExperienced = candidate.professionalDetails.isExperienced === true;
                      const allFields = [
                        { label: "Fixed Current CTC", key: "fixedCurrentCTC" },
                        { label: "In-hand CTC", key: "inHandCTC" },
                        { label: "Variable (if any)", key: "variableCTC" },
                        { label: "Expected CTC", key: "expectedCTC" },
                        { label: "Notice Period", key: "noticePeriod" },
                        { label: "Years of Experience", key: "yearsOfExperience" },
                        { label: "Open to Relocate", key: "openToRelocate", isBoolean: true },
                        { label: "Current Company Name", key: "currentCompany" },
                        { label: "Current Company Address", key: "currentCompanyAddress" },
                        { label: "Company Contact Number", key: "companyContactNumber" },
                        { label: "Current Location", key: "currentLocation" },
                      ];
                      // For freshers, only show relevant fields
                      const fresherFields = [
                        { label: "Expected CTC", key: "expectedCTC" },
                        { label: "Open to Relocate", key: "openToRelocate", isBoolean: true },
                        { label: "Current Location", key: "currentLocation" },
                        { label: "Reference Name", key: "referenceName" },
                        { label: "Reference Contact", key: "referenceContact" },
                        { label: "LinkedIn URL", key: "linkedInUrl" },
                        { label: "GitHub URL", key: "githubUrl" },
                      ];
                      const fields = isExperienced ? allFields : fresherFields;
                      const filteredFields = fields.filter(({ key, isBoolean }) => {
                        const value = candidate.professionalDetails[key];
                        if (isBoolean) return typeof value === 'boolean';
                        return value && value !== 'N/A';
                      });
                      if (filteredFields.length === 0) {
                        return <div className="text-muted-foreground">No professional details available.</div>;
                      }
                      return (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                          {filteredFields.map(({ label, key, isBoolean }) => (
                            <div key={key}>
                              <span className="font-semibold">{label}:</span> {isBoolean
                                ? (typeof candidate.professionalDetails[key] === 'boolean'
                                    ? (candidate.professionalDetails[key] ? 'Yes' : 'No')
                                    : 'N/A')
                                : (candidate.professionalDetails[key] || 'N/A')}
                            </div>
                          ))}
                    </div>
                      );
                    })()
                  ) : (
                    <div className="text-muted-foreground">No professional details available.</div>
                  )}
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
                          : q.type === 'Project' && q.candidateAnswer ?
                            (() => {
                              let links = null;
                              try {
                                const parsed = JSON.parse(q.candidateAnswer);
                                links = (
                                  <div className="text-sm space-y-1 mt-2">
                                    {parsed.githubUrl && (
                                      <div>
                                        <b>GitHub URL:</b> <a href={parsed.githubUrl.startsWith('http') ? parsed.githubUrl : `https://${parsed.githubUrl}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{parsed.githubUrl}</a>
                                      </div>
                                    )}
                                    {parsed.liveSite && (
                                      <div>
                                        <b>Live Site:</b> <a href={parsed.liveSite.startsWith('http') ? parsed.liveSite : `https://${parsed.liveSite}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{parsed.liveSite}</a>
                                      </div>
                                    )}
                                  </div>
                                );
                              } catch {}
                              return links || <span>Not Answered</span>;
                            })()
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
    </div>
  )
}

// InterviewDetailsTable component removed for rewrite.
