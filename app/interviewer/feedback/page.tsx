"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar, User, FileText, Star, CheckCircle } from "lucide-react"
import { toast } from "sonner"

export default function InterviewerFeedbackPage() {
  const [selectedCandidate, setSelectedCandidate] = useState("")
  const [selectedRound, setSelectedRound] = useState("")
  const [formData, setFormData] = useState({
    technicalSkills: "",
    communicationSkills: "",
    problemSolving: "",
    overallRating: "",
    strengths: "",
    weaknesses: "",
    recommendation: "",
    additionalComments: "",
    interviewDuration: "",
    questionsAsked: "",
    candidateQuestions: "",
  })

  const [skillRatings, setSkillRatings] = useState({
    coding: "",
    systemDesign: "",
    algorithms: "",
    communication: "",
    teamwork: "",
    leadership: "",
  })

  const [candidates, setCandidates] = useState<any[]>([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const rounds = [
    { id: "1", name: "Technical Screening", type: "technical" },
    { id: "2", name: "Coding Challenge", type: "coding" },
    { id: "3", name: "System Design", type: "design" },
    { id: "4", name: "Behavioral Interview", type: "behavioral" },
    { id: "5", name: "Final Technical", type: "technical" },
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
  }

  const handleSkillRatingChange = (skill: string, rating: string) => {
    setSkillRatings((prev) => ({
      ...prev,
      [skill]: rating,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCandidate || !selectedRound) {
      toast.error("Please select both candidate and round")
      return
    }

    // Simulate API call
    toast.success("Feedback submitted successfully!")

    // Reset form
    setFormData({
      technicalSkills: "",
      communicationSkills: "",
      problemSolving: "",
      overallRating: "",
      strengths: "",
      weaknesses: "",
      recommendation: "",
      additionalComments: "",
      interviewDuration: "",
      questionsAsked: "",
      candidateQuestions: "",
    })
    setSkillRatings({
      coding: "",
      systemDesign: "",
      algorithms: "",
      communication: "",
      teamwork: "",
      leadership: "",
    })
    setSelectedCandidate("")
    setSelectedRound("")
  }

  const selectedCandidateData = candidates.find((c: any) => c.id === selectedCandidate)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Interview Feedback</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Provide detailed feedback for candidate interviews
          </p>
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
              <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
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

              {selectedCandidateData && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage
                        src={selectedCandidateData.avatar || "/placeholder.svg"}
                        alt={selectedCandidateData.name}
                      />
                      <AvatarFallback>
                        {selectedCandidateData.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{selectedCandidateData.name}</div>
                      <div className="text-sm text-muted-foreground truncate">{selectedCandidateData.email}</div>
                      <Badge variant="outline" className="mt-1">
                        {selectedCandidateData.domain}
                      </Badge>
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
                Select Round
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedRound} onValueChange={setSelectedRound}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose interview round" />
                </SelectTrigger>
                <SelectContent>
                  {rounds.map((round) => (
                    <SelectItem key={round.id} value={round.id}>
                      {round.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="mt-4 space-y-2">
                <Label htmlFor="duration">Interview Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="e.g., 60"
                  value={formData.interviewDuration}
                  onChange={(e) => handleInputChange("interviewDuration", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Skill Ratings */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5" />
              Skill Assessment
            </CardTitle>
            <CardDescription>Rate the candidate's performance in different areas (1-5 scale)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
              {Object.entries(skillRatings).map(([skill, rating]) => (
                <div key={skill} className="space-y-3">
                  <Label className="text-sm font-medium capitalize">{skill.replace(/([A-Z])/g, " $1").trim()}</Label>
                  <RadioGroup
                    value={rating}
                    onValueChange={(value) => handleSkillRatingChange(skill, value)}
                    className="flex flex-wrap gap-4"
                  >
                    {[1, 2, 3, 4, 5].map((num) => (
                      <div key={num} className="flex items-center space-x-2">
                        <RadioGroupItem value={num.toString()} id={`${skill}-${num}`} />
                        <Label htmlFor={`${skill}-${num}`} className="text-sm">
                          {num}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Feedback */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Detailed Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="strengths">Key Strengths</Label>
                <Textarea
                  id="strengths"
                  placeholder="What did the candidate do well?"
                  value={formData.strengths}
                  onChange={(e) => handleInputChange("strengths", e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weaknesses">Areas for Improvement</Label>
                <Textarea
                  id="weaknesses"
                  placeholder="What areas need improvement?"
                  value={formData.weaknesses}
                  onChange={(e) => handleInputChange("weaknesses", e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="questions">Questions Asked</Label>
              <Textarea
                id="questions"
                placeholder="List the main questions asked during the interview"
                value={formData.questionsAsked}
                onChange={(e) => handleInputChange("questionsAsked", e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="candidateQuestions">Candidate's Questions</Label>
              <Textarea
                id="candidateQuestions"
                placeholder="Questions asked by the candidate"
                value={formData.candidateQuestions}
                onChange={(e) => handleInputChange("candidateQuestions", e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Additional Comments</Label>
              <Textarea
                id="comments"
                placeholder="Any additional observations or comments"
                value={formData.additionalComments}
                onChange={(e) => handleInputChange("additionalComments", e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Overall Assessment */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5" />
              Overall Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Overall Rating</Label>
              <RadioGroup
                value={formData.overallRating}
                onValueChange={(value) => handleInputChange("overallRating", value)}
                className="flex flex-wrap gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="excellent" id="excellent" />
                  <Label htmlFor="excellent">Excellent</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="good" id="good" />
                  <Label htmlFor="good">Good</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="average" id="average" />
                  <Label htmlFor="average">Average</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="below-average" id="below-average" />
                  <Label htmlFor="below-average">Below Average</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="poor" id="poor" />
                  <Label htmlFor="poor">Poor</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>Recommendation</Label>
              <RadioGroup
                value={formData.recommendation}
                onValueChange={(value) => handleInputChange("recommendation", value)}
                className="flex flex-wrap gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="strong-hire" id="strong-hire" />
                  <Label htmlFor="strong-hire" className="text-green-700">
                    Strong Hire
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hire" id="hire" />
                  <Label htmlFor="hire" className="text-green-600">
                    Hire
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no-hire" id="no-hire" />
                  <Label htmlFor="no-hire" className="text-red-600">
                    No Hire
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="strong-no-hire" id="strong-no-hire" />
                  <Label htmlFor="strong-no-hire" className="text-red-700">
                    Strong No Hire
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row justify-end gap-4">
          <Button type="button" variant="outline" className="w-full sm:w-auto">
            Save as Draft
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
            Submit Feedback
          </Button>
        </div>
      </form>
    </div>
  )
}
