"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Save, Edit, Loader2, Plus, X } from "lucide-react"
import toast from "react-hot-toast"
import { Badge } from "@/components/ui/badge"
import Loader from "@/components/ui/loader"

// Initial profile data structure
type InterviewerProfile = {
  personalInfo: {
    name: string
    role: string
    email: string
    phone: string
    experience: string
    skills: string[]
  }
}

const initialProfile: InterviewerProfile = {
  personalInfo: {
    name: "",
    role: "",
    email: "",
    phone: "",
    experience: "",
    skills: [],
  },
}

export default function InterviewerProfilePage() {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState(initialProfile)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [profileExists, setProfileExists] = useState(false)
  const [profileCompleted, setProfileCompleted] = useState(false)
  const [newSkill, setNewSkill] = useState("")
  const hasLoadedRef = useRef(false)
  const isHR = (session?.user?.role === "hr")

  // Load existing profile data on component mount
  useEffect(() => {
    if (session?.user?._id && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadProfileData()
    } else if (status === "unauthenticated") {
      setIsLoadingData(false)
      toast.error("Please sign in to access your profile.")
    } else if (status === "loading") {
      setIsLoadingData(true)
    }
  }, [session, status])

  const loadProfileData = async () => {
    try {
      setIsLoadingData(true)
      
      const response = await fetch(`/api/interviewer/getdetail`)
      const data = await response.json()

      if (response.ok && data.success) {
        if (data.interviewer) {
          // Profile exists (either completed or basic)
          setProfile({
            personalInfo: {
              name: data.interviewer.name || "",
              role: data.interviewer.role || "",
              email: data.interviewer.email || "",
              phone: data.interviewer.phone || "",
              experience: data.interviewer.experience || "",
              skills: data.interviewer.skills || [],
            },
          })
          setProfileExists(true)
          setProfileCompleted(data.profileCompleted || false)
          
          // If profile is not completed, start in edit mode
          if (!data.profileCompleted) {
            setIsEditing(true)
            toast.success("Profile loaded. Please complete your profile information.")
          } else {
            toast.success("Profile loaded successfully!")
          }
        } else {
          // No profile found
          setProfileExists(false)
          setProfileCompleted(false)
          setIsEditing(true)
          toast("No profile found. Please create your interviewer profile.")
        }
      } else {
        throw new Error(data.error || "Failed to load profile")
      }
    } catch (error) {
      console.error("Error loading profile:", error)
      setProfileExists(false)
      setProfileCompleted(false)
      setIsEditing(true)
      toast.error("There was an error loading your profile data.")
    } finally {
      setIsLoadingData(false)
    }
  }

  const handlePersonalInfoChange = (field: string, value: any) => {
    setProfile(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value,
      },
    }))
  }

  const handleAddSkill = () => {
    if (newSkill.trim() && !profile.personalInfo.skills.includes(newSkill.trim())) {
      setProfile(prev => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          skills: [...prev.personalInfo.skills, newSkill.trim()],
        },
      }))
      setNewSkill("")
      toast.success(`Skill "${newSkill.trim()}" added`)
    } else if (profile.personalInfo.skills.includes(newSkill.trim())) {
      toast.error("This skill is already added")
    }
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        skills: prev.personalInfo.skills.filter(skill => skill !== skillToRemove),
      },
    }))
    toast.success(`Skill "${skillToRemove}" removed`)
  }

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true)
      
      // Validate required fields
      if (isHR) {
        if (!profile.personalInfo.role) {
          toast.error("Please provide your Role/Title")
          return
        }
      } else {
        if (!profile.personalInfo.name || !profile.personalInfo.role || !profile.personalInfo.email) {
          toast.error("Please fill in all required fields (Name, Role, and Email)")
          return
        }
      }

      const response = await fetch("/api/interviewer/adddetail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profile.personalInfo.name,
          role: profile.personalInfo.role,
          email: profile.personalInfo.email,
          phone: profile.personalInfo.phone,
          experience: profile.personalInfo.experience,
          skills: profile.personalInfo.skills,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setProfileExists(true)
        setProfileCompleted(true)
        setIsEditing(false)
        
        if (data.message.includes("created")) {
          toast.success("Profile completed successfully! You can now conduct interviews.")
          toast("Your profile is now pending admin approval. You'll be notified when activated.")
        } else {
          toast.success("Profile updated successfully!")
        }
      } else {
        throw new Error(data.error || "Failed to save profile")
      }
    } catch (error: any) {
      console.error("Error saving profile:", error)
      toast.error(error.message || "There was an error saving your profile.")
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state
  if (isLoadingData) {
    return <Loader text="Loading your profile..." />;
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
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-gray-900">Interviewer Profile</h1>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
              Manage your professional information
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {isEditing ? (
              <Button
                onClick={handleSaveProfile}
                disabled={isLoading}
                className="w-full sm:w-auto order-1 sm:order-2"
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
                    {profileCompleted ? "Update Profile" : "Complete Profile"}
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setIsEditing(true)
                  toast("Edit mode enabled. Make your changes and click 'Update Profile' to save.")
                }}
                variant="outline"
                className="w-full sm:w-auto order-1 sm:order-2"
                size="sm"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        <div className="mb-4">
          <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg px-4 py-3 text-base font-medium">
            {profileCompleted 
              ? "Keep your profile information up to date. Accurate details help candidates understand your expertise."
              : "Complete your profile to start conducting interviews. All fields marked with * are required."
            }
          </div>
        </div>

        {/* Profile Status */}
        {profileCompleted && !isEditing && (
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200 mb-6">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 text-green-700">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-medium text-sm sm:text-base">Profile Completed</span>
                </div>
                <p className="text-xs sm:text-sm text-green-600">
                  Your profile is complete and you're ready to conduct interviews. Click "Edit Profile" to make changes.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Completion Required */}
        {!profileCompleted && (
          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 mb-6">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 text-yellow-700">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-medium text-sm sm:text-base">Profile Incomplete</span>
                </div>
                <p className="text-xs sm:text-sm text-yellow-600">
                  Please complete your profile information to start conducting interviews.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Personal Information Form */}
        <Card className="shadow-sm">
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
            {/* Personal Information Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name{isHR ? "" : " *"}</Label>
                <Input
                  id="name"
                  value={profile.personalInfo.name}
                  onChange={(e) => handlePersonalInfoChange("name", e.target.value)}
                  placeholder="e.g., Sarah Johnson"
                  disabled={!isEditing || isHR}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role/Title *</Label>
                <Input
                  id="role"
                  value={profile.personalInfo.role}
                  onChange={(e) => handlePersonalInfoChange("role", e.target.value)}
                  placeholder="e.g., Senior Technical Lead"
                  disabled={!isEditing ? true : false}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email{isHR ? "" : " *"}</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.personalInfo.email || (session?.user?.email ?? "")}
                  onChange={(e) => handlePersonalInfoChange("email", e.target.value)}
                  placeholder="your.email@company.com"
                  disabled={true}
                  onClick={() => toast("Email address cannot be changed. Contact admin if needed.")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={profile.personalInfo.phone}
                  onChange={(e) => handlePersonalInfoChange("phone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  disabled={!isEditing || isHR}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">Experience</Label>
                <Input
                  id="experience"
                  value={profile.personalInfo.experience}
                  onChange={(e) => handlePersonalInfoChange("experience", e.target.value)}
                  placeholder="e.g., 8 years experience"
                  disabled={!isEditing || isHR}
                />
              </div>
            </div>

            {/* Skills Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Skills</Label>
                {isEditing && !isHR && (
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add a skill (e.g., React, Node.js)"
                      onKeyPress={(e) => e.key === "Enter" && handleAddSkill()}
                    />
                    <Button onClick={handleAddSkill} size="sm" type="button">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Skills Display */}
              <div className="flex flex-wrap gap-2">
                {profile.personalInfo.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                    {skill}
                    {isEditing && !isHR && (
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="ml-2 hover:text-red-500 transition-colors"
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
                {profile.personalInfo.skills.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    {isEditing && !isHR ? "No skills added yet. Add your technical skills above." : "No skills listed."}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 