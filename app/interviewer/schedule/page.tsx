"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, Clock, User, MapPin, Video, Phone } from "lucide-react"
import { toast } from "sonner"

export default function InterviewerSchedulePage() {
  const [formData, setFormData] = useState({
    candidateId: "",
    roundId: "",
    date: "",
    time: "",
    duration: "60",
    interviewType: "",
    location: "",
    meetingLink: "",
    notes: "",
  })

  const [candidates, setCandidates] = useState<any[]>([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const rounds = [
    { id: "1", name: "Technical Screening", duration: "45" },
    { id: "2", name: "Coding Challenge", duration: "90" },
    { id: "3", name: "System Design", duration: "60" },
    { id: "4", name: "Behavioral Interview", duration: "45" },
    { id: "5", name: "Final Technical", duration: "60" },
  ]

  useEffect(() => {
    const loadCandidates = async () => {
      try {
        setLoadingCandidates(true)
        setLoadError(null)
        const res = await fetch("/api/interviewer/assigned-candidates", { cache: "no-store" })
        if (!res.ok) {
          throw new Error("Failed to load assigned candidates")
        }
        const data = await res.json()
        setCandidates(data.assignedCandidates || [])
      } catch (err: any) {
        setLoadError(err.message || "Unable to load candidates")
      } finally {
        setLoadingCandidates(false)
      }
    }

    loadCandidates()
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Auto-set duration based on round selection
    if (field === "roundId") {
      const selectedRound = rounds.find((r) => r.id === value)
      if (selectedRound) {
        setFormData((prev) => ({
          ...prev,
          duration: selectedRound.duration,
        }))
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.candidateId || !formData.roundId || !formData.date || !formData.time) {
      toast.error("Please fill in all required fields")
      return
    }

    // Simulate API call
    toast.success("Interview scheduled successfully!")

    // Reset form
    setFormData({
      candidateId: "",
      roundId: "",
      date: "",
      time: "",
      duration: "60",
      interviewType: "",
      location: "",
      meetingLink: "",
      notes: "",
    })
  }

  const selectedCandidate = candidates.find((c: any) => c.id === formData.candidateId)
  const selectedRound = rounds.find((r) => r.id === formData.roundId)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Schedule Interview</h2>
          <p className="text-sm md:text-base text-muted-foreground">Schedule new interview rounds for candidates</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Candidate and Round Selection */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Select Candidate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={formData.candidateId} onValueChange={(value) => handleInputChange("candidateId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a candidate" />
                </SelectTrigger>
                <SelectContent>
                  {loadingCandidates && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Loading candidates...</div>
                  )}
                  {loadError && (
                    <div className="px-3 py-2 text-xs text-red-600">{loadError}</div>
                  )}
                  {candidates.map((candidate: any) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={candidate.avatar || "/placeholder.svg"} alt={candidate.name} />
                          <AvatarFallback>
                            {candidate.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{candidate.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {candidate.workDomain?.name || candidate.domain || "No domain"}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedCandidate && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedCandidate.avatar || "/placeholder.svg"} alt={selectedCandidate.name} />
                      <AvatarFallback>
                        {selectedCandidate.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{selectedCandidate.name}</div>
                      <div className="text-sm text-muted-foreground truncate">{selectedCandidate.email}</div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="outline">{selectedCandidate.domain}</Badge>
                        <Badge variant="secondary">{selectedCandidate.nextRound}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Interview Round
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={formData.roundId} onValueChange={(value) => handleInputChange("roundId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose interview round" />
                </SelectTrigger>
                <SelectContent>
                  {rounds.map((round) => (
                    <SelectItem key={round.id} value={round.id}>
                      <div>
                        <div className="font-medium">{round.name}</div>
                        <div className="text-sm text-muted-foreground">{round.duration} minutes</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedRound && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="font-medium">{selectedRound.name}</div>
                  <div className="text-sm text-muted-foreground">Duration: {selectedRound.duration} minutes</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Date and Time */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Schedule Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange("time", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => handleInputChange("duration", e.target.value)}
                  min="15"
                  max="180"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interview Type and Location */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5" />
              Interview Format
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Interview Type</Label>
              <Select
                value={formData.interviewType}
                onValueChange={(value) => handleInputChange("interviewType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select interview type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Video Call
                    </div>
                  </SelectItem>
                  <SelectItem value="phone">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Call
                    </div>
                  </SelectItem>
                  <SelectItem value="in-person">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      In Person
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.interviewType === "video" && (
              <div className="space-y-2">
                <Label htmlFor="meetingLink">Meeting Link</Label>
                <Input
                  id="meetingLink"
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={formData.meetingLink}
                  onChange={(e) => handleInputChange("meetingLink", e.target.value)}
                />
              </div>
            )}

            {formData.interviewType === "in-person" && (
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Office address or room number"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes for Candidate</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information or preparation instructions for the candidate"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row justify-end gap-4">
          <Button type="button" variant="outline" className="w-full sm:w-auto">
            Save as Draft
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
            Schedule Interview
          </Button>
        </div>
      </form>
    </div>
  )
}
