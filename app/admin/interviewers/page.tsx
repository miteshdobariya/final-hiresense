"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Mail, Phone, Users, Search, UserCheck, UserX, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { useSession } from "next-auth/react"

interface Interviewer {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  experience: string;
  skills: string[];
  activeInterviews: number;
  completedInterviews: number;
  status: string;
  profileCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  role: string;
  experience: string;
  status: string;
}

export default function InterviewersPage() {
  const { data: session } = useSession();
  const [interviewers, setInterviewers] = useState<Interviewer[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInterviewer, setEditingInterviewer] = useState<Interviewer | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    role: "",
    experience: "",
    status: "Active",
  })

  // Fetch interviewers on component mount
  useEffect(() => {
    fetchInterviewers()
  }, [])

  const fetchInterviewers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/interviewers")
      const data = await response.json()

      if (response.ok && data.success) {
        setInterviewers(data.interviewers)
      } else {
        throw new Error(data.error || "Failed to fetch interviewers")
      }
    } catch (error) {
      console.error("Error fetching interviewers:", error)
      toast.error("Failed to load interviewers")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredInterviewers = interviewers.filter((interviewer) => {
    const matchesSearch =
      interviewer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interviewer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interviewer.role.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || interviewer.status.toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  const handleAdd = () => {
    setEditingInterviewer(null)
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "",
      experience: "",
      status: "Active",
    })
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (!formData.name || !formData.email || !formData.role) {
      toast.error("Please fill in all required fields")
      return
    }

    // For now, we'll just close the dialog since we're not implementing add/edit yet
    // In a real implementation, you would call an API to add/edit interviewers
    toast("Add/Edit functionality will be implemented separately")
    setIsDialogOpen(false)
  }

  const toggleInterviewerStatus = async (interviewerId: string, currentStatus: string) => {
    try {
      setIsUpdatingStatus(true)
      const newStatus = currentStatus === "Active" ? "Inactive" : "Active"
      
      const response = await fetch("/api/admin/interviewers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          interviewerId,
          status: newStatus,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Update local state
        setInterviewers(interviewers.map((i) =>
          i.id === interviewerId ? { ...i, status: newStatus } : i
        ))
        toast.success(`Interviewer status updated to ${newStatus}`)
      } else {
        throw new Error(data.error || "Failed to update status")
      }
    } catch (error) {
      console.error("Error updating interviewer status:", error)
      toast.error("Failed to update interviewer status")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Helper to check if current user is super admin
  const isSuperAdmin = () => {
    if (!session?.user?.email) return false;
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",") || [];
    return adminEmails.includes(session.user.email);
  };

  // Make Admin handler
  const handleMakeAdmin = async (interviewerId: string) => {
    if (!window.confirm("Are you sure you want to promote this interviewer to admin? This action cannot be undone.")) return;
    try {
      const response = await fetch(`/api/admin/interviewers/${interviewerId}`, {
        method: "PATCH",
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("Interviewer promoted to admin!");
        setInterviewers(interviewers.filter((i) => i.id !== interviewerId));
      } else {
        throw new Error(data.error || "Failed to promote interviewer");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to promote interviewer";
      toast.error(errorMessage);
    }
  };

  // Make HR handler
  const handleMakeHR = async (interviewerId: string) => {
    if (!window.confirm("Are you sure you want to promote this interviewer to HR? This action cannot be undone.")) return;
    try {
      const response = await fetch(`/api/admin/interviewers/${interviewerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "hr" }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("Interviewer promoted to HR!");
        setInterviewers(interviewers.filter((i) => i.id !== interviewerId));
      } else {
        throw new Error(data.error || "Failed to promote interviewer to HR");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to promote interviewer to HR";
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading interviewers...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Interviewers</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search interviewers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Interviewers Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredInterviewers.map((interviewer) => (
          <Card key={interviewer.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="/placeholder-user.jpg" alt={interviewer.name} />
                  <AvatarFallback>{interviewer.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg font-semibold truncate">{interviewer.name}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground truncate">
                    {interviewer.email}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <Badge 
                    variant={interviewer.status === "Active" ? "default" : "secondary"}
                    className={`text-xs ${
                      interviewer.status === "Active" 
                        ? "bg-green-100 text-green-800 border-green-200" 
                        : "bg-gray-100 text-gray-800 border-gray-200"
                    }`}
                  >
                  {interviewer.status}
                </Badge>
                  {interviewer.profileCompleted && (
                    <Badge variant="outline" className="text-xs">
                      Profile Complete
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{interviewer.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{interviewer.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{interviewer.role}</span>
                  </div>
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground">Exp:</span>
                  <span className="truncate">{interviewer.experience}</span>
                  </div>
              </div>

              {/* Skills */}
              {interviewer.skills && interviewer.skills.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Skills</Label>
                <div className="flex flex-wrap gap-1">
                    {interviewer.skills.map((skill: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  </div>
                </div>
              )}

              {/* Interview Stats */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">{interviewer.activeInterviews}</div>
                  <div className="text-xs text-muted-foreground">Active Interviews</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">{interviewer.completedInterviews}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t">
                <Button
                  variant={interviewer.status === "Active" ? "outline" : "default"}
                  size="sm"
                  onClick={() => toggleInterviewerStatus(interviewer.id, interviewer.status)}
                  disabled={isUpdatingStatus}
                  className="flex-1"
                >
                  {interviewer.status === "Active" ? (
                    <>
                      <UserX className="h-4 w-4 mr-1" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-1" />
                      Activate
                    </>
                  )}
                </Button>
                {isSuperAdmin() && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMakeAdmin(interviewer.id)}
                      className="flex-1"
                    >
                      Make Admin
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMakeHR(interviewer.id)}
                      className="flex-1"
                    >
                      Make HR
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInterviewers.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No interviewers found matching your criteria.</p>
        </div>
      )}

      {/* Add/Edit Interviewer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingInterviewer ? "Edit Interviewer" : "Add New Interviewer"}
            </DialogTitle>
            <DialogDescription>
              {editingInterviewer 
                ? "Update interviewer information." 
                : "Add a new interviewer to the system."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role *</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="Enter role/title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="experience">Experience</Label>
              <Input
                id="experience"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                placeholder="Enter years of experience"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingInterviewer ? "Update" : "Add"} Interviewer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
