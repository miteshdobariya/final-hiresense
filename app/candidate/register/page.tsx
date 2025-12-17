"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import toast from "react-hot-toast"
import { Upload, User, Briefcase, GraduationCap, FileText, CheckCircle } from "lucide-react"

interface Domain {
  _id: string
  domainname: string
  description: string
}

export default function CandidateRegisterPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [availableDomains, setAvailableDomains] = useState<Domain[]>([])
  const [loadingDomains, setLoadingDomains] = useState(true)
  const [companionInfo, setCompanionInfo] = useState<any>(null)
  
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const response = await fetch("/api/domains/by-companion")
        if (response.ok) {
          const domains = await response.json()
          setAvailableDomains(domains)
        } else {
          // Fallback to all domains if companion lookup fails
          const fallbackResponse = await fetch("/api/domains")
          if (fallbackResponse.ok) {
            const fallbackDomains = await fallbackResponse.json()
            setAvailableDomains(fallbackDomains.domains || [])
          }
        }
      } catch (error) {
        console.error("Error fetching domains:", error)
        toast.error("Failed to load domains")
      } finally {
        setLoadingDomains(false)
      }
    }

    fetchDomains()
  }, [formData.email])

  const [formData, setFormData] = useState<{
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    address: string;
    city: string;
    state: string;
    country: string;
    currentJobTitle: string;
    currentCompany: string;
    totalExperience: string;
    preferredDomain: string; // This will store the domain ID
    expectedSalary: string;
    noticePeriod: string;
    highestDegree: string;
    institution: string;
    fieldOfStudy: string;
    graduationYear: string;
    gpa: string;
    skills: string;
    projects: string;
    certifications: string;
    linkedinUrl: string;
    githubUrl: string;
    portfolioUrl: string;
    resume: File | null;
    termsAccepted: boolean;
    dataProcessingConsent: boolean;
  }>(
    {
      // Personal Information
      fullName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      address: "",
      city: "",
      state: "",
      country: "",

      // Professional Information
      currentJobTitle: "",
      currentCompany: "",
      totalExperience: "",
      preferredDomain: "",
      expectedSalary: "",
      noticePeriod: "",

      // Education
      highestDegree: "",
      institution: "",
      fieldOfStudy: "",
      graduationYear: "",
      gpa: "",

      // Additional Information
      skills: "",
      projects: "",
      certifications: "",
      linkedinUrl: "",
      githubUrl: "",
      portfolioUrl: "",

      // Resume
      resume: null,

      // Agreements
      termsAccepted: false,
      dataProcessingConsent: false,
    }
  )

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    
    // If email is changed, check for companion
    if (field === "email" && value.includes("@")) {
      checkCompanion(value)
    }
  }

  const checkCompanion = async (email: string) => {
    try {
      const response = await fetch("/api/companion/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      })
      
      if (response.ok) {
        const data = await response.json()
        setCompanionInfo(data.companion)
        toast.success(`Welcome! You're registered with ${data.companion.collegeName}`)
      }
    } catch (error) {
      console.error("Error checking companion:", error)
    }
  }

  const handleResumeUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast("File too large. Please upload a file smaller than 10MB")
        return
      }
      setFormData((prev) => ({ ...prev, resume: file }))
      toast(`${file.name} has been uploaded successfully`)
    }
  }

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return formData.fullName && formData.email && formData.phone && formData.address
      case 2:
        return formData.preferredDomain && formData.totalExperience
      case 3:
        return formData.highestDegree && formData.institution
      case 4:
        return formData.resume && formData.termsAccepted && formData.dataProcessingConsent
      default:
        return true
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1)
    } else {
      toast("Missing Information. Please fill in all required fields")
    }
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => prev - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep(4)) {
      toast("Missing Information. Please complete all required fields and accept the terms")
      return
    }

    // Mock registration submission
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast("Registration Successful! Your application has been submitted. You can now take the screening round.")

      // Redirect to candidate dashboard
      router.push("/candidate")
    } catch (error) {
      toast("Registration Failed. Please try again later")
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step <= currentStep ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            {step < currentStep ? <CheckCircle className="h-4 w-4" /> : step}
          </div>
          {step < 4 && <div className={`w-16 h-1 mx-2 ${step < currentStep ? "bg-blue-600" : "bg-gray-200"}`} />}
        </div>
      ))}
    </div>
  )

  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Personal Information
        </CardTitle>
        <CardDescription>Tell us about yourself</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => handleInputChange("fullName", e.target.value)}
              placeholder="Enter your full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="Enter your email"
            />
            {companionInfo && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-sm">
                <p className="font-medium">✓ College Email Detected</p>
                <p className="text-xs">You're registered with {companionInfo.collegeName}</p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="Enter your phone number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address *</Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => handleInputChange("address", e.target.value)}
            placeholder="Enter your complete address"
            className="min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => handleInputChange("city", e.target.value)}
              placeholder="Enter your city"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State/Province</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => handleInputChange("state", e.target.value)}
              placeholder="Enter your state"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => handleInputChange("country", e.target.value)}
              placeholder="Enter your country"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderStep2 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Professional Information
        </CardTitle>
        <CardDescription>Tell us about your career and preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currentJobTitle">Current Job Title</Label>
            <Input
              id="currentJobTitle"
              value={formData.currentJobTitle}
              onChange={(e) => handleInputChange("currentJobTitle", e.target.value)}
              placeholder="e.g., Software Engineer"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentCompany">Current Company</Label>
            <Input
              id="currentCompany"
              value={formData.currentCompany}
              onChange={(e) => handleInputChange("currentCompany", e.target.value)}
              placeholder="e.g., Tech Corp Inc."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="totalExperience">Total Experience *</Label>
            <Select
              value={formData.totalExperience}
              onValueChange={(value) => handleInputChange("totalExperience", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select experience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-1">0-1 years</SelectItem>
                <SelectItem value="1-3">1-3 years</SelectItem>
                <SelectItem value="3-5">3-5 years</SelectItem>
                <SelectItem value="5-8">5-8 years</SelectItem>
                <SelectItem value="8-12">8-12 years</SelectItem>
                <SelectItem value="12+">12+ years</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="noticePeriod">Notice Period</Label>
            <Select value={formData.noticePeriod} onValueChange={(value) => handleInputChange("noticePeriod", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select notice period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="15-days">15 days</SelectItem>
                <SelectItem value="1-month">1 month</SelectItem>
                <SelectItem value="2-months">2 months</SelectItem>
                <SelectItem value="3-months">3 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferredDomain">Preferred Domain *</Label>
          {loadingDomains ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-muted-foreground">Loading domains...</span>
            </div>
          ) : (
            <>
              <Select
                value={formData.preferredDomain}
                onValueChange={(value) => handleInputChange("preferredDomain", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your preferred domain" />
                </SelectTrigger>
                <SelectContent>
                  {availableDomains.map((domain) => (
                    <SelectItem key={domain._id} value={domain._id}>
                      <div>
                        <div className="font-medium">{domain.domainname}</div>
                        <div className="text-sm text-muted-foreground">{domain.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {availableDomains.length > 0 && availableDomains.length < 10 && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded text-sm">
                  <p className="font-medium">College-specific domains</p>
                  <p className="text-xs">You are registered with a college email. Only domains available for your college are shown.</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="expectedSalary">Expected Salary (Annual)</Label>
          <Input
            id="expectedSalary"
            value={formData.expectedSalary}
            onChange={(e) => handleInputChange("expectedSalary", e.target.value)}
            placeholder="e.g., $80,000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="skills">Technical Skills</Label>
          <Textarea
            id="skills"
            value={formData.skills}
            onChange={(e) => handleInputChange("skills", e.target.value)}
            placeholder="List your technical skills (e.g., JavaScript, React, Node.js, Python...)"
            className="min-h-[80px]"
          />
        </div>
      </CardContent>
    </Card>
  )

  const renderStep3 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Education & Additional Information
        </CardTitle>
        <CardDescription>Your educational background and additional details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="highestDegree">Highest Degree *</Label>
            <Select value={formData.highestDegree} onValueChange={(value) => handleInputChange("highestDegree", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select degree" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high-school">High School</SelectItem>
                <SelectItem value="associate">Associate Degree</SelectItem>
                <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
                <SelectItem value="master">Master's Degree</SelectItem>
                <SelectItem value="phd">PhD</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fieldOfStudy">Field of Study</Label>
            <Input
              id="fieldOfStudy"
              value={formData.fieldOfStudy}
              onChange={(e) => handleInputChange("fieldOfStudy", e.target.value)}
              placeholder="e.g., Computer Science"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="institution">Institution *</Label>
            <Input
              id="institution"
              value={formData.institution}
              onChange={(e) => handleInputChange("institution", e.target.value)}
              placeholder="e.g., University of Technology"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="graduationYear">Graduation Year</Label>
            <Input
              id="graduationYear"
              value={formData.graduationYear}
              onChange={(e) => handleInputChange("graduationYear", e.target.value)}
              placeholder="e.g., 2020"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gpa">GPA (Optional)</Label>
          <Input
            id="gpa"
            value={formData.gpa}
            onChange={(e) => handleInputChange("gpa", e.target.value)}
            placeholder="e.g., 3.8/4.0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="projects">Notable Projects</Label>
          <Textarea
            id="projects"
            value={formData.projects}
            onChange={(e) => handleInputChange("projects", e.target.value)}
            placeholder="Describe your notable projects and achievements..."
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="certifications">Certifications</Label>
          <Textarea
            id="certifications"
            value={formData.certifications}
            onChange={(e) => handleInputChange("certifications", e.target.value)}
            placeholder="List your professional certifications..."
            className="min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
            <Input
              id="linkedinUrl"
              value={formData.linkedinUrl}
              onChange={(e) => handleInputChange("linkedinUrl", e.target.value)}
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="githubUrl">GitHub Profile</Label>
            <Input
              id="githubUrl"
              value={formData.githubUrl}
              onChange={(e) => handleInputChange("githubUrl", e.target.value)}
              placeholder="https://github.com/..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="portfolioUrl">Portfolio Website</Label>
            <Input
              id="portfolioUrl"
              value={formData.portfolioUrl}
              onChange={(e) => handleInputChange("portfolioUrl", e.target.value)}
              placeholder="https://yourportfolio.com"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderStep4 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Resume & Final Steps
        </CardTitle>
        <CardDescription>Upload your resume and complete registration</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label>Resume Upload *</Label>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
            {formData.resume ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium">{formData.resume.name}</p>
                    <p className="text-sm text-muted-foreground">{Math.round(formData.resume.size / 1024)} KB</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleInputChange("resume", null)}>
                  Remove
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="font-medium mb-2">Upload your resume</h4>
                <p className="text-sm text-muted-foreground mb-4">PDF, DOC, or DOCX files up to 10MB</p>
                <Label htmlFor="resume-upload" className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span>Choose File</span>
                  </Button>
                </Label>
              </div>
            )}
            <Input
              id="resume-upload"
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleResumeUpload}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="terms"
              checked={formData.termsAccepted}
              onCheckedChange={(checked) => handleInputChange("termsAccepted", checked)}
            />
            <Label htmlFor="terms" className="text-sm">
              I agree to the{" "}
              <a href="#" className="text-blue-600 hover:underline">
                Terms and Conditions
              </a>{" "}
              and{" "}
              <a href="#" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="dataProcessing"
              checked={formData.dataProcessingConsent}
              onCheckedChange={(checked) => handleInputChange("dataProcessingConsent", checked)}
            />
            <Label htmlFor="dataProcessing" className="text-sm">
              I consent to the processing of my personal data for recruitment purposes
            </Label>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">What happens next?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• You'll receive a confirmation email</li>
            <li>• Take the mandatory screening round (MCQ)</li>
            <li>• Based on your domain, you'll get assigned specific rounds</li>
            <li>• Complete all rounds to proceed to interviewer assignment</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Candidate Registration</h1>
          <p className="text-muted-foreground mt-2">Join our interview process and showcase your skills</p>
        </div>

        <div className="mb-4">
          <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg px-4 py-3 text-base font-medium">
            Register to start your interview journey. Please provide accurate information for a smooth process.
          </div>
        </div>

        {renderStepIndicator()}

        <div className="space-y-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}

          <div className="flex justify-between">
            <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 1}>
              Previous
            </Button>

            {currentStep < 4 ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <Button onClick={handleSubmit}>Complete Registration</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
