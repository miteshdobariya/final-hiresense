"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Upload, Save, Edit, Loader2, RefreshCw, GraduationCap, Code, Plus, X, Briefcase } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import axios from "axios"
import toast from "react-hot-toast"
import { Badge } from "@/components/ui/badge"

// Initial profile data structure
type Education = {
  degree: string
  institution: string
  graduationYear: string
  gpa: string
}

const formatDateForInput = (dateString: string) => {
  return dateString ? new Date(dateString).toISOString().split("T")[0] : ""
}

type Profile = {
  personalInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
    dateofBirth: string
    gender: string
    nationality: string
    workDomain: { id: string; name: string } | null
    address: string
    city: string
    state: string
    country: string
    zipCode: string
    profilePhoto: string
    resume?: {
      fileName: string
      fileUrl: string
      s3Key: string
      uploadedAt: string
      fileSize: number
    }
  }
  skills: string[]
  education: Education[]
}

const initialProfile: Profile = {
  personalInfo: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateofBirth: "",
    gender: "",
    nationality: "",
    workDomain: null,
    address: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
    profilePhoto: "/placeholder.svg?height=120&width=120",
    resume: {
      fileName: "",
      fileUrl: "",
      s3Key: "",
      uploadedAt: "",
      fileSize: 0,
    },
  },
  skills: [],
  education: [
    {
      degree: "",
      institution: "",
      graduationYear: "",
      gpa: "",
    },
  ],
}

export default function CandidateProfilePage() {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState(initialProfile)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [profileExists, setProfileExists] = useState(false)
  const [newSkill, setNewSkill] = useState("")
  const [isUploadingResume, setIsUploadingResume] = useState(false)
  const [domains, setDomains] = useState<Array<{ _id: string; domainname: string; description?: string }>>([])
  const [isLoadingDomains, setIsLoadingDomains] = useState(false)

  // Professional Details State
  const [professionalDetails, setProfessionalDetails] = useState({
    isExperienced: false,
    fixedCurrentCTC: "",
    inHandCTC: "",
    variableCTC: "",
    expectedCTC: "",
    noticePeriod: "",
    yearsOfExperience: "",
    openToRelocate: false,
    currentCompany: "",
    currentCompanyAddress: "",
    companyContactNumber: "",
    currentLocation: "",
    referenceName: "",
    referenceContact: "",
    linkedInUrl: "",
    githubUrl: "",
  })

  // Load existing profile data on component mount
  useEffect(() => {
    if (session?.user?._id) {
      loadProfileData()
    } else if (status === "unauthenticated") {
      setIsLoadingData(false)
      toast.error("Please sign in to access your profile.")
    } else if (status === "loading") {
      setIsLoadingData(true)
    }
  }, [session, status])

  // Fetch domains on component mount
  useEffect(() => {
    fetchDomains()
  }, [])

  const loadProfileData = async () => {
    try {
      setIsLoadingData(true)
      const response = await axios.get(`/api/candidate/getdetail?userId=${session?.user?._id}`)
      const result = response.data

      if (response.status === 200 && result.success) {
        if (result.candidate) {
          setProfileExists(true)
          setIsEditing(false)

          const nameParts = result.candidate.username ? result.candidate.username.split(" ") : ["", ""]
          const firstName = nameParts[0] || ""
          const lastName = nameParts.slice(1).join(" ") || ""

          setProfile({
            personalInfo: {
              firstName,
              lastName,
              email: result.candidate.email || "",
              phone: result.candidate.phonenumber || "",
              dateofBirth: result.candidate.dateofBirth || "",
              gender: result.candidate.gender || "",
              nationality: result.candidate.nationality || "",
              workDomain: result.candidate.workDomain && result.candidate.workDomain.id && result.candidate.workDomain.name
                ? { id: result.candidate.workDomain.id, name: result.candidate.workDomain.name }
                : null,
              address: result.candidate.address || "",
              city: result.candidate.city || "",
              state: result.candidate.state || "",
              country: result.candidate.country || "",
              zipCode: result.candidate.zipCode || "",
              profilePhoto: result.candidate.profilePhoto || "/placeholder.svg?height=120&width=120",
              resume: result.candidate.resume || {
                fileName: "",
                fileUrl: "",
                s3Key: "",
                uploadedAt: "",
                fileSize: 0,
              },
            },
            skills: result.candidate.skills || [],
            education:
              result.candidate.education && result.candidate.education.length > 0
                ? result.candidate.education
                : [{ degree: "", institution: "", graduationYear: "", gpa: "" }],
          })

          // Prefill professionalDetails if present
          setProfessionalDetails({
            isExperienced: typeof result.candidate.professionalDetails?.isExperienced === "boolean" ? result.candidate.professionalDetails.isExperienced : false,
            fixedCurrentCTC: result.candidate.professionalDetails?.fixedCurrentCTC || "",
            inHandCTC: result.candidate.professionalDetails?.inHandCTC || "",
            variableCTC: result.candidate.professionalDetails?.variableCTC || "",
            expectedCTC: result.candidate.professionalDetails?.expectedCTC || "",
            noticePeriod: result.candidate.professionalDetails?.noticePeriod || "",
            yearsOfExperience: result.candidate.professionalDetails?.yearsOfExperience || "",
            openToRelocate: typeof result.candidate.professionalDetails?.openToRelocate === "boolean" ? result.candidate.professionalDetails.openToRelocate : false,
            currentCompany: result.candidate.professionalDetails?.currentCompany || "",
            currentCompanyAddress: result.candidate.professionalDetails?.currentCompanyAddress || "",
            companyContactNumber: result.candidate.professionalDetails?.companyContactNumber || "",
            currentLocation: result.candidate.professionalDetails?.currentLocation || "",
            referenceName: result.candidate.professionalDetails?.referenceName || "",
            referenceContact: result.candidate.professionalDetails?.referenceContact || "",
            linkedInUrl: result.candidate.professionalDetails?.linkedInUrl || "",
            githubUrl: result.candidate.professionalDetails?.githubUrl || "",
          })

        } else {
          setProfileExists(false)
          setIsEditing(true)
        }
      } else {
        throw new Error(result.error || "Failed to load profile")
      }
    } catch (error) {
      // If it's a 404 or no profile found, that's okay - just enable editing
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        (error as any).response?.status === 404
      ) {
        setProfileExists(false)
        setIsEditing(true)
      } else if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as any).message === "string" &&
        (error as any).message.includes("No profile found")
      ) {
        setProfileExists(false)
        setIsEditing(true)
      } else {
        toast.error("There was an error loading your profile data.")
        setIsEditing(true)
      }
    } finally {
      setIsLoadingData(false)
    }
  }

  const fetchDomains = async () => {
    try {
      setIsLoadingDomains(true)
      const response = await axios.get("/api/domains")
      if (response.data && response.data.domains) {
        setDomains(response.data.domains)
      }
    } catch (error) {
      toast.error("Failed to load work domains")
    } finally {
      setIsLoadingDomains(false)
    }
  }

  const handlePersonalInfoChange = (field: string, value: any) => {
    setProfile((prev) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value,
      },
    }))
  }

  const handleEducationChange = (index: number, field: string, value: string) => {
    setProfile((prev) => ({
      ...prev,
      education: prev.education.map((edu, i) => (i === index ? { ...edu, [field]: value } : edu)),
    }))
  }

  const handleAddSkill = () => {
    if (!newSkill.trim()) return

    setProfile((prev) => ({
      ...prev,
      skills: [...prev.skills, newSkill.trim()],
    }))
    setNewSkill("")
  }

  const handleRemoveSkill = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }))
  }

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }
    if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
      toast.error("Please select a PDF, DOC, or DOCX file");
      return;
    }
    setIsUploadingResume(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("candidateId", session?.user?._id || "");
      const res = await fetch("/api/upload-resume", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setProfile((prev) => ({
          ...prev,
          personalInfo: {
            ...prev.personalInfo,
            resume: {
              fileName: file.name,
              fileUrl: data.url,
              s3Key: data.key,
              uploadedAt: new Date().toISOString(),
              fileSize: file.size,
            },
          },
        }));
        toast.success("Resume uploaded successfully!");
      } else {
        toast.error("Failed to upload resume.");
      }
    } catch (error) {
      toast.error("Error uploading resume");
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!session?.user?._id) {
      toast.error("Please sign in to save your profile.")
      return
    }

    const requiredFields = ["firstName", "lastName", "phone", "email"] as const
    const missingFields = requiredFields.filter(
      (field) => !profile.personalInfo[field as keyof typeof profile.personalInfo],
    )

    if (missingFields.length > 0) {
      toast.error("Please fill in all required fields (First Name, Last Name, Phone, Email).")
      return
    }

    setIsLoading(true)

    try {
      // Prepare data according to your API structure
      const candidateData = {
        userId: session.user._id,
        email: profile.personalInfo.email,
        username: `${profile.personalInfo.firstName} ${profile.personalInfo.lastName}`.trim(),
        address: profile.personalInfo.address,
        phonenumber: profile.personalInfo.phone,
        dateofBirth: profile.personalInfo.dateofBirth,
        city: profile.personalInfo.city,
        state: profile.personalInfo.state,
        gender: profile.personalInfo.gender,
        nationality: profile.personalInfo.nationality,
        workDomain: profile.personalInfo.workDomain,
        country: profile.personalInfo.country,
        zipCode: profile.personalInfo.zipCode,
        resume: profile.personalInfo.resume,
        skills: profile.skills,
        education: profile.education.filter((edu) => edu.degree || edu.institution || edu.graduationYear || edu.gpa),
        professionalDetails,
      }

      const response = await axios.post("/api/candidate/adddetail", candidateData)
      const result = response.data

      if ((response.status === 200 || response.status === 201) && result.success) {
        setIsEditing(false)
        setProfileExists(true)
        toast.success(profileExists ? "Profile updated successfully!" : "Profile created successfully!")
        await loadProfileData()
        // Dispatch event to notify layout that profile was updated
        window.dispatchEvent(new CustomEvent('profile-updated'))
      } else {
        throw new Error(result.error || "Failed to save profile")
      }
    } catch (error) {
      let errorMessage = "There was an error saving your profile. Please try again."
      let is409 = false;
      if (typeof error === "object" && error !== null && "response" in error) {
        const err = error as { response?: any }
        if (err.response?.status === 400) {
          errorMessage = err.response.data?.error || "Invalid data provided"
        } else if (err.response?.status === 409) {
          // Handle duplicate key conflicts (like duplicate phone number)
          errorMessage = err.response.data?.error || "This phone number is already registered. Please use a different phone number."
          is409 = true;
        } else if (err.response?.status === 500) {
          errorMessage = "Server error. Please try again later."
        } else {
          errorMessage = err.response?.data?.error || `HTTP ${err.response?.status}: Failed to save profile`
        }
      } else if (typeof error === "object" && error !== null && "message" in error) {
        errorMessage = (error as any).message
      }
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateProfileCompletion = () => {
    let completed = 0
    let total = 0

    const personalFields: Array<keyof typeof profile.personalInfo> = [
      "firstName",
      "lastName",
      "phone",
      "email",
      "workDomain", // Added work domain to completion calculation
      "address",
      "city",
    ]
    personalFields.forEach((field) => {
      total++
      if (profile.personalInfo[field]) completed++
    })

    // Add skills to completion calculation
    total++
    if (profile.skills.length > 0) completed++

    // Add education to completion calculation
    total++
    if (profile.education.some((edu) => edu.degree && edu.institution)) completed++

    // Add professional details fields to completion calculation
    const professionalFields: Array<keyof typeof professionalDetails> = [
      "fixedCurrentCTC",
      "inHandCTC",
      "variableCTC",
      "expectedCTC",
      "noticePeriod",
      "yearsOfExperience",
      "currentCompany",
      "currentCompanyAddress",
      "companyContactNumber",
      "currentLocation",
      "referenceName",
      "referenceContact",
      "linkedInUrl",
      "githubUrl",
    ];
    professionalFields.forEach((field) => {
      total++;
      if (professionalDetails[field] && professionalDetails[field] !== "") completed++;
    });
    // openToRelocate is a boolean, count it as completed if it's true or false (i.e., not undefined)
    total++;
    if (typeof professionalDetails.openToRelocate === "boolean") completed++;

    return Math.round((completed / total) * 100)
  }

  const completionPercentage = calculateProfileCompletion()

  // Show loading spinner while fetching data
  if (isLoadingData) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh] px-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm sm:text-base">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // Show authentication required message
  if (status === "unauthenticated") {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh] px-4">
        <div className="text-center space-y-4">
          <User className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">Authentication Required</h2>
          <p className="text-muted-foreground text-sm sm:text-base">Please sign in to access your profile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
        {/* Header - Enhanced Responsive */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-gray-900">My Profile</h1>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
              Manage your personal and professional information
            </p>
          </div>
        </div>

        <div className="mb-4">
          <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg px-4 py-3 text-base font-medium">
            Keep your profile information up to date. Accurate details help us match you with the right opportunities.
          </div>
        </div>

        {/* Profile Status - Enhanced */}
        {profileExists && !isEditing && (
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200 mb-6">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 text-green-700">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-medium text-sm sm:text-base">Profile Active</span>
                </div>
                <p className="text-xs sm:text-sm text-green-600">
                  Your profile is saved and ready. Click "Edit Profile" to make changes.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Move Edit/Update Profile Button Here */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6 justify-end items-end max-w-xs ml-auto mr-6">
          {isEditing ? (
            <Button
              onClick={handleSaveProfile}
              disabled={isLoading}
              className="w-full sm:w-auto"
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {profileExists ? "Update Profile" : "Save Profile"}
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="w-full sm:w-auto"
              size="sm"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}
          </div>

        {/* Enhanced Responsive Tabs */}
        {/* Removed Tabs and display all sections sequentially */}

        {/* Personal Information Section */}
        <Card className="shadow-sm mb-6">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl lg:text-2xl flex items-center gap-2">
                  <User className="h-5 w-5 sm:h-6 sm:w-6" />
                  Personal Information
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Your basic personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 sm:space-y-8">
                {/* Resume Upload Section (replaces profile photo) */}
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-4 sm:p-6 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Label>Resume Upload</Label>
                    {profile.personalInfo.resume && profile.personalInfo.resume.fileUrl ? (
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3">
                          <Upload className="h-8 w-8 text-blue-600" />
                          <div>
                            <p className="font-medium">{profile.personalInfo.resume.fileName}</p>
                            <p className="text-sm text-muted-foreground">{Math.round(profile.personalInfo.resume.fileSize / 1024)} KB</p>
                          </div>
                        </div>
                        {isEditing && (
                          <Button variant="outline" size="sm" onClick={() => setProfile((prev) => ({
                            ...prev,
                            personalInfo: { ...prev.personalInfo, resume: undefined },
                          }))}>
                            Remove
                          </Button>
                        )}
                      </div>
                    ) : (
                      isEditing && (
                        <div className="text-center mt-2">
                          <Button
                            type="button"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 transition-all duration-200 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                            onClick={() => document.getElementById('resume-upload-input')?.click()}
                          >
                            <Upload className="w-5 h-5" />
                            {profile.personalInfo.resume && profile.personalInfo.resume.fileUrl ? 'Replace Resume' : 'Upload Resume'}
                            </Button>
                          <input
                            id="resume-upload-input"
                            type="file"
                            accept=".pdf,.doc,.docx"
                            style={{ display: 'none' }}
                            onChange={handleResumeUpload}
                            disabled={!isEditing}
                          />
                          <p className="text-xs sm:text-sm text-muted-foreground mt-2">PDF, DOC, or DOCX files up to 10MB</p>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Basic Information - Enhanced Responsive Grid */}
                <div className="space-y-6">
                  <h4 className="font-semibold text-base sm:text-lg text-gray-900 border-b pb-2">Basic Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm sm:text-base font-medium">
                        First Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        value={profile.personalInfo.firstName}
                        onChange={(e) => handlePersonalInfoChange("firstName", e.target.value)}
                        disabled={!isEditing}
                        placeholder="Enter your first name"
                        className="text-sm sm:text-base h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm sm:text-base font-medium">
                        Last Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        value={profile.personalInfo.lastName}
                        onChange={(e) => handlePersonalInfoChange("lastName", e.target.value)}
                        disabled={!isEditing}
                        placeholder="Enter your last name"
                        className="text-sm sm:text-base h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                      <Label htmlFor="email" className="text-sm sm:text-base font-medium">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.personalInfo.email}
                        disabled
                        placeholder="Enter your email"
                        className="text-sm sm:text-base h-10 sm:h-11 bg-gray-50"
                      />
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm sm:text-base font-medium">
                        Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="phone"
                        value={profile.personalInfo.phone}
                        onChange={(e) => handlePersonalInfoChange("phone", e.target.value)}
                        disabled={!isEditing}
                        placeholder="+1 (555) 123-4567"
                        className="text-sm sm:text-base h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateofBirth" className="text-sm sm:text-base font-medium">
                        Date of Birth
                      </Label>
                      <Input
                        id="dateofBirth"
                        type="date"
                        value={formatDateForInput(profile.personalInfo.dateofBirth)}
                        onChange={(e) => handlePersonalInfoChange("dateofBirth", e.target.value)}
                        disabled={!isEditing}
                        className="text-sm sm:text-base h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender" className="text-sm sm:text-base font-medium">
                        Gender
                      </Label>
                      <Select
                        value={profile.personalInfo.gender}
                        onValueChange={(value) => handlePersonalInfoChange("gender", value)}
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="text-sm sm:text-base h-10 sm:h-11">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nationality" className="text-sm sm:text-base font-medium">
                        Nationality
                      </Label>
                      <Input
                        id="nationality"
                        value={profile.personalInfo.nationality}
                        onChange={(e) => handlePersonalInfoChange("nationality", e.target.value)}
                        disabled={!isEditing}
                        placeholder="Enter your nationality"
                        className="text-sm sm:text-base h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="workDomain" className="text-sm sm:text-base font-medium flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Work Domain
                      </Label>
                      <Select
                        value={profile.personalInfo.workDomain?.id || ""}
                        onValueChange={(value) => {
                          const selectedDomain = domains.find((d) => d._id === value);
                          handlePersonalInfoChange("workDomain", selectedDomain ? { id: selectedDomain._id, name: selectedDomain.domainname } : null);
                        }}
                        disabled={!isEditing || isLoadingDomains}
                      >
                        <SelectTrigger className="text-sm sm:text-base h-10 sm:h-11">
                          <SelectValue placeholder={isLoadingDomains ? "Loading domains..." : "Select your work domain"} />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingDomains ? (
                            <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading domains...
                            </div>
                          ) : domains.length > 0 ? (
                            domains.filter(domain => domain.isActive).map((domain) => (
                              <SelectItem key={domain._id} value={domain._id}>
                                {domain.domainname}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">No domains available</div>
                          )}
                        </SelectContent>
                      </Select>
                      {/* Message below Work Domain */}
                      <div className="flex items-center gap-2 mt-1 p-2 bg-yellow-50 border border-yellow-300 rounded text-yellow-800 text-xs">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
                        <span>Your selected work domain determines the interview rounds and questions you will receive.</span>
                      </div>
                      {!isLoadingDomains && domains.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          No work domains found. Please contact administrator.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Address Information - Enhanced Responsive */}
                <div className="space-y-6">
                  <h4 className="font-semibold text-base sm:text-lg text-gray-900 border-b pb-2">
                    Address Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                      <Label htmlFor="address" className="text-sm sm:text-base font-medium">
                        Street Address
                      </Label>
                      <Input
                        id="address"
                        value={profile.personalInfo.address}
                        onChange={(e) => handlePersonalInfoChange("address", e.target.value)}
                        disabled={!isEditing}
                        placeholder="Enter your street address"
                        className="text-sm sm:text-base h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm sm:text-base font-medium">
                        City
                      </Label>
                      <Input
                        id="city"
                        value={profile.personalInfo.city}
                        onChange={(e) => handlePersonalInfoChange("city", e.target.value)}
                        disabled={!isEditing}
                        placeholder="Enter your city"
                        className="text-sm sm:text-base h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-sm sm:text-base font-medium">
                        State/Province
                      </Label>
                      <Input
                        id="state"
                        value={profile.personalInfo.state}
                        onChange={(e) => handlePersonalInfoChange("state", e.target.value)}
                        disabled={!isEditing}
                        placeholder="Enter your state"
                        className="text-sm sm:text-base h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode" className="text-sm sm:text-base font-medium">
                        ZIP/Postal Code
                      </Label>
                      <Input
                        id="zipCode"
                        value={profile.personalInfo.zipCode}
                        onChange={(e) => handlePersonalInfoChange("zipCode", e.target.value)}
                        disabled={!isEditing}
                        placeholder="Enter your ZIP code"
                        className="text-sm sm:text-base h-10 sm:h-11"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

        {/* Skills Section */}
        <Card className="shadow-sm mb-6">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
                  <Code className="h-5 w-5 sm:h-6 sm:w-6" />
                  Technical Skills
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Add your technical skills to help employers find you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-2 sm:gap-3 min-h-[60px] p-4 bg-gray-50 rounded-lg">
                  {profile.skills.map((skill, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1 py-2 px-3 text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                    >
                      {skill}
                      {isEditing && (
                        <X
                          className="h-3 w-3 ml-1 cursor-pointer hover:text-red-600 transition-colors"
                          onClick={() => handleRemoveSkill(index)}
                        />
                      )}
                    </Badge>
                  ))}
                  {profile.skills.length === 0 && (
                    <p className="text-muted-foreground text-sm sm:text-base italic">
                      No skills added yet. {isEditing && "Add your first skill below!"}
                    </p>
                  )}
                </div>

                {isEditing && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      placeholder="Add a skill (e.g. React, JavaScript, Python)"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleAddSkill()
                        }
                      }}
                      className="flex-1 text-sm sm:text-base h-10 sm:h-11"
                    />
                    <Button
                      type="button"
                      onClick={handleAddSkill}
                      className="w-full sm:w-auto"
                      disabled={!newSkill.trim()}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Skill
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

        {/* Professional Details Section */}
        <Card className="shadow-sm mb-6">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
              Professional Details
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Please provide your professional details. Fields will adjust based on your experience status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <Label htmlFor="isExperienced" className="text-base font-medium">Are you an experienced candidate?</Label>
              <Switch
                id="isExperienced"
                checked={professionalDetails.isExperienced}
                onCheckedChange={v => setProfessionalDetails(p => ({ ...p, isExperienced: v }))}
                disabled={!isEditing}
              />
              <span className="text-sm">{professionalDetails.isExperienced ? "Yes" : "No (Fresher)"}</span>
            </div>
            {professionalDetails.isExperienced ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Fixed Current CTC</Label>
                  <Input value={professionalDetails.fixedCurrentCTC} onChange={e => setProfessionalDetails(p => ({...p, fixedCurrentCTC: e.target.value}))} disabled={!isEditing} />
                </div>
                <div>
                  <Label>In-hand CTC</Label>
                  <Input value={professionalDetails.inHandCTC} onChange={e => setProfessionalDetails(p => ({...p, inHandCTC: e.target.value}))} disabled={!isEditing} />
                </div>
                <div>
                  <Label>Variable (if any)</Label>
                  <Input value={professionalDetails.variableCTC} onChange={e => setProfessionalDetails(p => ({...p, variableCTC: e.target.value}))} disabled={!isEditing} />
                </div>
                <div>
                  <Label>Expected CTC <span className="text-muted-foreground">(optional)</span></Label>
                  <Input value={professionalDetails.expectedCTC} onChange={e => setProfessionalDetails(p => ({...p, expectedCTC: e.target.value}))} disabled={!isEditing} />
                </div>
                <div>
                  <Label>Notice Period</Label>
                  <Input value={professionalDetails.noticePeriod} onChange={e => setProfessionalDetails(p => ({...p, noticePeriod: e.target.value}))} disabled={!isEditing} />
                </div>
                <div>
                  <Label>Years of Experience</Label>
                  <Input type="number" min="0" value={professionalDetails.yearsOfExperience} onChange={e => setProfessionalDetails(p => ({...p, yearsOfExperience: e.target.value}))} disabled={!isEditing} />
                </div>
                <div>
                  <Label>Are you open to relocate?</Label>
                  <Select value={professionalDetails.openToRelocate ? "yes" : "no"} onValueChange={v => setProfessionalDetails(p => ({...p, openToRelocate: v === "yes"}))} disabled={!isEditing}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Current Company Name</Label>
                  <Input value={professionalDetails.currentCompany} onChange={e => setProfessionalDetails(p => ({...p, currentCompany: e.target.value}))} disabled={!isEditing} />
                </div>
                <div>
                  <Label>Current Company Address</Label>
                  <Input value={professionalDetails.currentCompanyAddress} onChange={e => setProfessionalDetails(p => ({...p, currentCompanyAddress: e.target.value}))} disabled={!isEditing} />
                </div>
                <div>
                  <Label>Company Contact Number</Label>
                  <Input value={professionalDetails.companyContactNumber} onChange={e => setProfessionalDetails(p => ({...p, companyContactNumber: e.target.value}))} disabled={!isEditing} />
                </div>
                <div>
                  <Label>Where are you currently located now?</Label>
                  <Input value={professionalDetails.currentLocation} onChange={e => setProfessionalDetails(p => ({...p, currentLocation: e.target.value}))} disabled={!isEditing} />
                </div>
                <div>
                  <Label>Reference Name and Contact Number</Label>
                  <Input value={professionalDetails.referenceName} onChange={e => setProfessionalDetails(p => ({...p, referenceName: e.target.value}))} placeholder="Name" className="mb-2" disabled={!isEditing} />
                  <Input value={professionalDetails.referenceContact} onChange={e => setProfessionalDetails(p => ({...p, referenceContact: e.target.value}))} placeholder="Contact Number" disabled={!isEditing} />
                </div>
                <div className="sm:col-span-2">
                  <Label>LinkedIn URL <span className="text-red-500">*</span></Label>
                  <Input value={professionalDetails.linkedInUrl} onChange={e => setProfessionalDetails(p => ({...p, linkedInUrl: e.target.value}))} required disabled={!isEditing} />
                </div>
                <div className="sm:col-span-2">
                  <Label>GitHub URL <span className="text-red-500">*</span></Label>
                  <Input value={professionalDetails.githubUrl} onChange={e => setProfessionalDetails(p => ({...p, githubUrl: e.target.value}))} required disabled={!isEditing} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Expected CTC <span className="text-muted-foreground">(optional)</span></Label>
                  <Input value={professionalDetails.expectedCTC} onChange={e => setProfessionalDetails(p => ({...p, expectedCTC: e.target.value}))} disabled={!isEditing} />
                </div>
                <div>
                  <Label>Years of Experience</Label>
                  <Input type="number" min="0" value="0" disabled />
                </div>
                <div>
                  <Label>Are you open to relocate?</Label>
                  <Select value={professionalDetails.openToRelocate ? "yes" : "no"} onValueChange={v => setProfessionalDetails(p => ({...p, openToRelocate: v === "yes"}))} disabled={!isEditing}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Where are you currently located now?</Label>
                  <Input value={professionalDetails.currentLocation} onChange={e => setProfessionalDetails(p => ({...p, currentLocation: e.target.value}))} disabled={!isEditing} />
                </div>
                <div>
                  <Label>Reference Name and Contact Number</Label>
                  <Input value={professionalDetails.referenceName} onChange={e => setProfessionalDetails(p => ({...p, referenceName: e.target.value}))} placeholder="Name" className="mb-2" disabled={!isEditing} />
                  <Input value={professionalDetails.referenceContact} onChange={e => setProfessionalDetails(p => ({...p, referenceContact: e.target.value}))} placeholder="Contact Number" disabled={!isEditing} />
                </div>
                <div className="sm:col-span-2">
                  <Label>LinkedIn URL <span className="text-red-500">*</span></Label>
                  <Input value={professionalDetails.linkedInUrl} onChange={e => setProfessionalDetails(p => ({...p, linkedInUrl: e.target.value}))} required disabled={!isEditing} />
                </div>
                <div className="sm:col-span-2">
                  <Label>GitHub URL <span className="text-red-500">*</span></Label>
                  <Input value={professionalDetails.githubUrl} onChange={e => setProfessionalDetails(p => ({...p, githubUrl: e.target.value}))} required disabled={!isEditing} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Education Section */}
        <Card className="shadow-sm mb-6">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
                  <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
                  Educational Background
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">Add your educational qualifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {profile.education.map((edu, index) => (
                  <div
                    key={index}
                    className="border-2 border-gray-200 rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-6 bg-gray-50"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <GraduationCap className="h-5 w-5 text-blue-600" />
                      <h5 className="font-semibold text-base sm:text-lg">
                        Education {profile.education.length > 1 ? `#${index + 1}` : ""}
                      </h5>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm sm:text-base font-medium">Degree</Label>
                        <Input
                          value={edu.degree}
                          onChange={(e) => handleEducationChange(index, "degree", e.target.value)}
                          disabled={!isEditing}
                          placeholder="Bachelor of Computer Science"
                          className="text-sm sm:text-base h-10 sm:h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm sm:text-base font-medium">Institution</Label>
                        <Input
                          value={edu.institution}
                          onChange={(e) => handleEducationChange(index, "institution", e.target.value)}
                          disabled={!isEditing}
                          placeholder="University of Technology"
                          className="text-sm sm:text-base h-10 sm:h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm sm:text-base font-medium">Graduation Year</Label>
                        <Input
                          value={edu.graduationYear}
                          onChange={(e) => handleEducationChange(index, "graduationYear", e.target.value)}
                          disabled={!isEditing}
                          placeholder="2024"
                          className="text-sm sm:text-base h-10 sm:h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm sm:text-base font-medium">GPA</Label>
                        <Input
                          value={edu.gpa}
                          onChange={(e) => handleEducationChange(index, "gpa", e.target.value)}
                          disabled={!isEditing}
                          placeholder="3.8/4.0"
                          className="text-sm sm:text-base h-10 sm:h-11"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

        {/* Edit/Update Profile Button at the bottom */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6 justify-end items-end max-w-xs ml-auto mr-6">
          {isEditing ? (
            <Button
              onClick={handleSaveProfile}
              disabled={isLoading}
              className="w-full sm:w-auto"
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {profileExists ? "Update Profile" : "Save Profile"}
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="w-full sm:w-auto"
              size="sm"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
