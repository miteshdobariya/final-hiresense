"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Plus, Code, Users, BookOpen, Eye, UserCheck, UserX, Search, Edit, Trash2, ToggleLeft, ToggleRight, ChevronUp, ChevronDown, GripVertical, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormField } from "@/components/ui/form"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Loader from "@/components/ui/loader"
import toast from "react-hot-toast"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

type Domain = {
  _id: string;
  domainname: string;
  description?: string;
  isActive?: boolean;
  isCommon?: boolean;
  rounds?: Array<{
    roundId: string;
    sequence: number;
  }>;
};

type Round = {
  _id: string;
  roundname: string;
  type?: string;
  duration?: number;
  questionsCount?: number;
  status?: string;
  sequence?: number;
  description?: string;
  currentQuestionsCount?: number;
};

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [isLoadingDomains, setIsLoadingDomains] = useState(true)
  const [isLoadingRounds, setIsLoadingRounds] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isRoundsDialogOpen, setIsRoundsDialogOpen] = useState(false)
  const [isAddRoundDialogOpen, setIsAddRoundDialogOpen] = useState(false)
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null)
  const [deletingDomain, setDeletingDomain] = useState<Domain | null>(null)
  const [viewingDomain, setViewingDomain] = useState<Domain | null>(null)
  const [selectedDomainForRound, setSelectedDomainForRound] = useState<Domain | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [roundTypeFilter, setRoundTypeFilter] = useState("all")
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })
  const [roundFormData, setRoundFormData] = useState({
    name: "",
    type: "",
    duration: "",
    questionsCount: "",
  })
  const [editRoundDialogOpen, setEditRoundDialogOpen] = useState(false)
  const [editingRound, setEditingRound] = useState<Round | null>(null)
  const [editRoundForm, setEditRoundForm] = useState({
    _id: "",
    name: "",
    type: "",
    duration: "",
    questionsCount: "",
    sequence: "",
  })
  const [isChooseRoundDialogOpen, setIsChooseRoundDialogOpen] = useState(false)
  const [choosingDomain, setChoosingDomain] = useState<Domain | null>(null)
  const [allRounds, setAllRounds] = useState<Round[]>([])
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({})
  const [chooseRoundSearch, setChooseRoundSearch] = useState("")
  const [orderedRounds, setOrderedRounds] = useState<Round[]>([])
  const [isReordering, setIsReordering] = useState(false)
  const { data: session, status } = useSession()
  const router = useRouter()

  // Drag and Drop Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // --- Fetch all domains on mount ---
  useEffect(() => {
    setIsLoadingDomains(true)
    setIsLoadingRounds(true)
    
    fetch("/api/domains")
      .then((res) => res.json())
      .then((data) => {
        setDomains(data.domains)
        setIsLoadingDomains(false)
      })
      .catch((error) => {
        console.error("Error fetching domains:", error)
        setIsLoadingDomains(false)
        toast("Failed to load domains")
      })
      
    fetch("/api/rounds")
      .then((res) => res.json())
      .then((data) => {
        setAllRounds(data.rounds)
        setIsLoadingRounds(false)
      })
      .catch((error) => {
        console.error("Error fetching rounds:", error)
        setIsLoadingRounds(false)
        toast("Failed to load rounds")
      })
  }, [])

  useEffect(() => {
    if (status === "authenticated") {
      if (session.user.role === "hr") {
        router.replace("/admin")
      }
    }
  }, [status, session, router])

  // --- Filter domains by search and status ---
  const filteredDomains = domains.filter((domain) => {
    const matchesSearch = domain.domainname.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? domain.isActive === true : domain.isActive === false)
    return matchesSearch && matchesStatus
  })

  // --- Simple round filtering ---
  const filteredRounds = rounds.filter((round) => {
    if (roundTypeFilter === "all") return true
    return round.type === roundTypeFilter
  })

  // --- Get unique round types ---
  const roundTypes = Array.from(new Set(rounds.map(r => r.type).filter((type): type is string => Boolean(type))))

  // --- Handlers for add, save, delete, toggle, and view rounds ---
  const handleAdd = () => {
    setEditingDomain(null)
    setFormData({
      name: "",
      description: "",
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast("Domain name is required")
      return
    }
    try {
      if (editingDomain) {
        // Update existing domain
        const res = await fetch("/api/domains", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            _id: editingDomain._id,
            domainname: formData.name.trim(),
            description: formData.description.trim(),
          }),
        })
        if (!res.ok) throw new Error("Failed to update domain")
        const data = await res.json()
        setDomains((prev) => prev.map(d => d._id === editingDomain._id ? data.domain : d))
        toast("Domain updated successfully")
      } else {
        // Create new domain
        const res = await fetch("/api/domains", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domainname: formData.name.trim(),
            description: formData.description.trim(),
          }),
        })
        if (!res.ok) throw new Error("Failed to add domain")
        const data = await res.json()
        setDomains((prev: Domain[]) => [...prev, data.domain])
        toast("Domain created successfully")
      }
      setIsDialogOpen(false)
      setEditingDomain(null)
    } catch (err: unknown) {
      let message = "Unknown error"
      if (err instanceof Error) {
        message = err.message
      } else if (typeof err === "string") {
        message = err
      }
      toast(message)
    }
  }

  const handleDelete = async () => {
    if (deletingDomain) {
      try {
        const res = await fetch("/api/domains", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _id: deletingDomain._id }),
        });
        if (!res.ok) throw new Error("Failed to delete domain");
        setDomains(domains.filter((d) => d._id !== deletingDomain._id));
        toast("Domain deleted successfully")
        setIsDeleteDialogOpen(false);
        setDeletingDomain(null);
      } catch (err: unknown) {
        let message = "Failed to delete domain"
        if (err instanceof Error) {
          message = err.message
        } else if (typeof err === "string") {
          message = err
        }
        toast(message)
      }
    }
  }

  const toggleDomainStatus = async (domainId: string) => {
    const domain = domains.find((d) => d._id === domainId);
    if (!domain) return;
    const newStatus = !domain.isActive;
    try {
      const res = await fetch("/api/domains", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: domainId, isActive: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update domain status");
      const data = await res.json();
      setDomains((prev) => prev.map((d) => d._id === domainId ? data.domain : d));
      toast("Domain status updated");
    } catch (err: unknown) {
      let message = "Failed to update domain status";
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === "string") {
        message = err;
      }
      toast(message);
    }
  }

  const handleViewRounds = async (domain: Domain) => {
    setViewingDomain(domain)
    setIsRoundsDialogOpen(true)
    const res = await fetch(`/api/rounds?domainname=${domain.domainname}`)
    const data = await res.json()
    // Only show rounds linked to this domain
    const domainRounds = data.rounds.filter((r: Round) => domain.rounds?.some(round => round.roundId === r._id))
    setRounds(domainRounds)
    setOrderedRounds(domainRounds)
  }

  const handleAddRound = () => {
    setRoundFormData({
      name: "",
      type: "",
      duration: "",
      questionsCount: "",
    })
    setIsAddRoundDialogOpen(true)
  }

  const handleSaveRound = async () => {
    if (!roundFormData.name || !roundFormData.type || !roundFormData.duration || !roundFormData.questionsCount) {
      toast("Please fill in all fields")
      return
    }
    try {
      const res = await fetch("/api/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundname: roundFormData.name,
          type: roundFormData.type,
          duration: Number(roundFormData.duration),
          questionsCount: Number(roundFormData.questionsCount),
        }),
      })
      if (!res.ok) throw new Error("Failed to add round")
      toast("Round added successfully")
      setIsAddRoundDialogOpen(false)
      // Optionally refresh global rounds list here if needed
    } catch (err: unknown) {
      let message = "Failed to add round"
      if (err instanceof Error) {
        message = err.message
      } else if (typeof err === "string") {
        message = err
      }
      toast(message)
    }
  }

  const openEditRoundDialog = (round: Round) => {
    setEditingRound(round)
    setEditRoundForm({
      _id: round._id,
      name: round.roundname || "",
      type: round.type || "",
      duration: round.duration?.toString() || "",
      questionsCount: round.questionsCount?.toString() || "",
      sequence: round.sequence?.toString() || "",
    })
    setEditRoundDialogOpen(true)
  }

  const handleEditRoundSave = async () => {
    if (!editRoundForm._id || !editRoundForm.name || !editRoundForm.type || !editRoundForm.duration || !editRoundForm.questionsCount || !editRoundForm.sequence) {
      toast("Please fill in all fields")
      return
    }
    try {
      const payload = {
        _id: editRoundForm._id,
        roundname: editRoundForm.name,
        type: editRoundForm.type,
        duration: Number(editRoundForm.duration),
        questionsCount: Number(editRoundForm.questionsCount),
        sequence: Number(editRoundForm.sequence),
      };
      const res = await fetch("/api/rounds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        let errorMsg = "Failed to update round";
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorMsg;
        } catch {}
        toast(errorMsg)
        return;
      }
      toast("Round updated successfully")
      setEditRoundDialogOpen(false)
      // Refresh rounds
      if (viewingDomain) handleViewRounds(viewingDomain)
    } catch (err: unknown) {
      let message = "Failed to update round"
      if (err instanceof Error) {
        message = err.message
      } else if (typeof err === "string") {
        message = err
      }
      toast(message)
    }
  }

  const handleDeleteRound = async (roundId: string) => {
    try {
      const res = await fetch("/api/rounds", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: roundId }),
      })
      if (!res.ok) throw new Error("Failed to delete round")
      toast("Round deleted successfully")
      if (viewingDomain) handleViewRounds(viewingDomain)
    } catch (err: unknown) {
      let message = "Failed to delete round"
      if (err instanceof Error) {
        message = err.message
      } else if (typeof err === "string") {
        message = err
      }
      toast(message)
    }
  }

  const handleChooseRound = async (domain: Domain) => {
    setChoosingDomain(domain)
    setIsChooseRoundDialogOpen(true)
    // Fetch all rounds
    const res = await fetch("/api/rounds")
    const data = await res.json()
    // Only show rounds not already in this domain
    setAllRounds(data.rounds.filter((r: Round) => !domain.rounds?.some(round => round.roundId === r._id)))
  }

  const handleTakeRound = async (round: Round) => {
    if (!choosingDomain) return
    try {
      const res = await fetch("/api/domains", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: choosingDomain._id,
          addRoundId: round._id,
        }),
      })
      if (!res.ok) throw new Error("Failed to add round to domain")
      toast(`Round '${round.roundname}' added to '${choosingDomain.domainname}'`)
      // Update the domain's rounds array in state
      setDomains((prev) => prev.map(d => d._id === choosingDomain._id ? { ...d, rounds: [...(d.rounds || []), { roundId: round._id, sequence: 0 }] } : d))
      // Refresh rounds for this domain
      if (viewingDomain && viewingDomain._id === choosingDomain._id) handleViewRounds(choosingDomain)
      setIsChooseRoundDialogOpen(false)
    } catch (err: unknown) {
      let message = "Failed to add round to domain"
      if (err instanceof Error) {
        message = err.message
      } else if (typeof err === "string") {
        message = err
      }
      toast(message)
    }
  }

  const handleRemoveRoundFromDomain = async (domainId: string, roundId: string) => {
    try {
      const res = await fetch("/api/domains", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: domainId, removeRoundId: roundId }),
      })
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to remove round from domain")
      toast("Round removed from domain")
      // Refetch the updated domain and its rounds
      const domainRes = await fetch(`/api/domains`)
      const domainData = await domainRes.json()
      const updatedDomain = domainData.domains.find((d: any) => d._id === domainId)
      setViewingDomain(updatedDomain)
      // Fetch all rounds and update rounds state for this domain
      const roundsRes = await fetch(`/api/rounds`)
      const roundsData = await roundsRes.json()
      setRounds(roundsData.rounds.filter((r: Round) => updatedDomain.rounds?.some((round: { roundId: string; sequence: number }) => round.roundId === r._id)))
    } catch (err: unknown) {
      let message = "Failed to remove round from domain"
      if (err instanceof Error) {
        message = err.message
      } else if (typeof err === "string") {
        message = err
      }
      toast(message)
    }
  }

  const handleUpdateRoundSequence = async (domainId: string, roundId: string, newSequence: number) => {
    try {
      const res = await fetch("/api/domains", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          _id: domainId, 
          updateRoundSequence: { roundId, newSequence } 
        }),
      })
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to update round sequence")
      toast("Round sequence updated")
      // Refresh the domain's rounds
      if (viewingDomain && viewingDomain._id === domainId) {
        handleViewRounds(viewingDomain)
      }
    } catch (err: unknown) {
      let message = "Failed to update round sequence"
      if (err instanceof Error) {
        message = err.message
      } else if (typeof err === "string") {
        message = err
      }
      toast(message)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (active.id !== over?.id) {
      setIsReordering(true)
      
      const oldIndex = orderedRounds.findIndex(round => round._id === active.id)
      const newIndex = orderedRounds.findIndex(round => round._id === over?.id)
      
      // Reorder the rounds array
      const newOrderedRounds = arrayMove(orderedRounds, oldIndex, newIndex)
      setOrderedRounds(newOrderedRounds)
      
      // Update sequences in the database
      try {
        const updatePromises = newOrderedRounds.map((round, index) => {
          return fetch("/api/domains", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              _id: viewingDomain?._id, 
              updateRoundSequence: { roundId: round._id, newSequence: index } 
            }),
          })
        })
        
        await Promise.all(updatePromises)
        toast.success("Round order updated successfully!")
      } catch (error) {
        toast.error("Failed to update round order")
        // Revert the order if update failed
        if (viewingDomain) {
          handleViewRounds(viewingDomain)
        }
      } finally {
        setIsReordering(false)
      }
    }
  }

  // Fetch question counts for all rounds after rounds are loaded
  useEffect(() => {
    async function fetchCounts() {
      const counts: Record<string, number> = {}
      await Promise.all(rounds.map(async (round) => {
        const res = await fetch(`/api/questions?roundname=${round._id}`)
        const data = await res.json()
        counts[round._id] = data.questions.length
      }))
      setQuestionCounts(counts)
    }
    if (rounds.length > 0) fetchCounts()
  }, [rounds])

  // Sortable Round Item Component
  function SortableTableRow({ round, index, questionCounts, viewingDomain, openEditRoundDialog, handleRemoveRoundFromDomain }: {
    round: Round;
    index: number;
    questionCounts: Record<string, number>;
    viewingDomain: Domain | null;
    openEditRoundDialog: (round: Round) => void;
    handleRemoveRoundFromDomain: (domainId: string, roundId: string) => void;
  }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: round._id })
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    }
    return (
      <tr
        key={round._id}
        ref={setNodeRef}
        style={style}
        className={isDragging ? "opacity-50" : ""}
      >
        <td className="px-2 py-2 cursor-grab align-middle">
          <div {...attributes} {...listeners} className="inline-block p-1 hover:bg-gray-100 rounded">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        </td>
        <td className="px-2 py-2 align-middle font-semibold text-gray-700">{index + 1}</td>
        <td className="px-2 py-2 align-middle font-medium text-gray-900">{round.roundname}</td>
        <td className="px-2 py-2 align-middle">
          <Badge variant="outline" className="text-xs">{round.type}</Badge>
        </td>
        <td className="px-2 py-2 align-middle">{round.duration} min</td>
        <td className="px-2 py-2 align-middle">{round.questionsCount ?? 0}</td>
        <td className="px-2 py-2 align-middle">
          <span className={`font-semibold text-sm ${questionCounts[round._id] === round.questionsCount ? 'text-green-700' : 'text-red-600'}`}>{questionCounts[round._id] ?? 0}</span>
        </td>
        <td className="px-2 py-2 align-middle text-center">
          <div className="flex gap-2 justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    aria-label="Edit Round" 
                    onClick={() => openEditRoundDialog(round)} 
                    className="border border-gray-300 rounded-md bg-white text-gray-700 hover:border-gray-700 hover:text-black p-2 transition-colors"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Edit round</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label="Delete Round"
                    onClick={() => handleRemoveRoundFromDomain(viewingDomain?._id ?? '', round._id)}
                    disabled={!viewingDomain}
                    className="border border-gray-300 rounded-md bg-white text-destructive hover:border-red-700 hover:text-red-800 p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Delete round</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </td>
      </tr>
    )
  }

  // --- UI: Domains grid, dialogs for add/edit/view rounds ---
  if (isLoadingDomains || isLoadingRounds) {
    return <Loader text="Loading domains and rounds..." />;
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Domains</h2>
        <div className="flex gap-2">
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Domain
          </Button>
          <Button onClick={handleAddRound} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Round
          </Button>
        </div>
      </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search domains..."
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

          {/* Domains Table */}
          <Table>
            <TableHeader className="bg-gray-100 border-b border-gray-300">
              <TableRow>
                <TableHead className="text-gray-700 font-semibold tracking-wide text-left">Domain Name</TableHead>
                <TableHead className="text-gray-700 font-semibold tracking-wide text-left">Description</TableHead>
                <TableHead className="text-gray-700 font-semibold tracking-wide text-center">Status</TableHead>
                <TableHead className="text-gray-700 font-semibold tracking-wide text-center">Rounds</TableHead>
                <TableHead className="text-gray-700 font-semibold tracking-wide w-36 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDomains.map((domain, idx) => (
                <TableRow key={domain._id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <TableCell className="text-left">{domain.domainname}</TableCell>
                  <TableCell className="text-left">{domain.description || '-'}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => toggleDomainStatus(domain._id)}
                              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                domain.isActive 
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                  : 'bg-red-100 text-red-800 hover:bg-red-200'
                              }`}
                            >
                              {domain.isActive ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
                              {domain.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {domain.isActive ? 'Click to deactivate' : 'Click to activate'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{domain.rounds ? domain.rounds.length : 0}</TableCell>
                  <TableCell className="w-36 text-center">
                    <div className="flex flex-row items-center justify-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button aria-label="Choose Round" onClick={() => handleChooseRound(domain)} className="border border-gray-300 rounded-md bg-white text-gray-500 hover:border-blue-700 hover:text-blue-700 p-2 transition-colors">
                              <BookOpen className="h-5 w-5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Choose Round</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button aria-label="View Rounds" onClick={() => handleViewRounds(domain)} className="border border-gray-300 rounded-md bg-white text-blue-600 hover:border-blue-700 hover:text-blue-800 p-2 transition-colors">
                              <Eye className="h-5 w-5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>View rounds</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button aria-label="Edit" onClick={() => { setEditingDomain(domain); setFormData({ name: domain.domainname, description: domain.description || '' }); setIsDialogOpen(true); }} className="border border-gray-300 rounded-md bg-white text-gray-700 hover:border-gray-700 hover:text-black p-2 transition-colors">
                              <Edit className="h-5 w-5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Edit domain</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button aria-label="Delete" onClick={() => { setDeletingDomain(domain); setIsDeleteDialogOpen(true); }} className="border border-gray-300 rounded-md bg-white text-destructive hover:border-red-700 hover:text-red-800 p-2 transition-colors">
                              <Trash2 className="h-5 w-5 text-destructive" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Delete domain</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredDomains.length === 0 && !isLoadingDomains && (
            <div className="text-center py-8 text-muted-foreground">
              No domains found. Please add a domain to get started.
            </div>
      )}

      {/* Add/Edit Domain Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingDomain ? "Edit Domain" : "Add New Domain"}</DialogTitle>
            <DialogDescription>
              {editingDomain ? "Update the domain information" : "Create a new domain for interview rounds"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Domain Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., React, Node.js, Python"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the domain..."
                className="min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editingDomain ? "Update" : "Create"} Domain</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Rounds Dialog */}
      <Dialog open={isRoundsDialogOpen} onOpenChange={setIsRoundsDialogOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Rounds in {viewingDomain?.domainname}</DialogTitle>
            <DialogDescription>Manage rounds for this domain</DialogDescription>
          </DialogHeader>
          
          {/* Round Type Filter */}
          <div className="mb-4">
            <Select value={roundTypeFilter} onValueChange={setRoundTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by round type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {roundTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="max-h-[500px] overflow-y-auto">
            {rounds.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={orderedRounds.map(round => round._id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Round Name</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Questions</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question Bank</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {orderedRounds
                          .filter(round => roundTypeFilter === "all" || round.type === roundTypeFilter)
                          .map((round, index) => (
                            <SortableTableRow
                              key={round._id}
                              round={round}
                              index={index}
                              questionCounts={questionCounts}
                              viewingDomain={viewingDomain}
                              openEditRoundDialog={openEditRoundDialog}
                              handleRemoveRoundFromDomain={handleRemoveRoundFromDomain}
                            />
                          ))}
                      </tbody>
                    </table>
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {rounds.length === 0 
                  ? "No rounds found for this domain" 
                  : `No ${roundTypeFilter === "all" ? "" : roundTypeFilter} rounds found`
                }
              </p>
            )}
          </div>
          <DialogFooter>
            {isReordering && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating round order...
              </div>
            )}
            <Button onClick={() => setIsRoundsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Round Dialog */}
      <Dialog open={isAddRoundDialogOpen} onOpenChange={setIsAddRoundDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Round</DialogTitle>
            <DialogDescription>Create a new interview round</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="roundName">Round Name *</Label>
              <Input
                id="roundName"
                value={roundFormData.name}
                onChange={(e) => setRoundFormData({ ...roundFormData, name: e.target.value })}
                placeholder="e.g., React Basics"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="roundType">Round Type *</Label>
              <Select
                value={roundFormData.type}
                onValueChange={(value) => setRoundFormData({ ...roundFormData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select round type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MCQ">MCQ</SelectItem>
                  <SelectItem value="Coding">Coding</SelectItem>
                  <SelectItem value="Project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="duration">Duration *</Label>
              <Input
                id="duration"
                type="number"
                value={roundFormData.duration}
                onChange={(e) => setRoundFormData({ ...roundFormData, duration: e.target.value })}
                placeholder="e.g., 1 hour"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="questions">Number of Questions *</Label>
              <Input
                id="questions"
                type="number"
                value={roundFormData.questionsCount}
                onChange={(e) => setRoundFormData({ ...roundFormData, questionsCount: e.target.value })}
                placeholder="e.g., 20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRoundDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRound}>Add Round</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Round Dialog */}
      <Dialog open={editRoundDialogOpen} onOpenChange={setEditRoundDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Round</DialogTitle>
            <DialogDescription>Update the round information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="roundName">Round Name *</Label>
              <Input
                id="roundName"
                value={editRoundForm.name}
                onChange={(e) => setEditRoundForm({ ...editRoundForm, name: e.target.value })}
                placeholder="e.g., React Basics"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="roundType">Round Type *</Label>
              <Select
                value={editRoundForm.type}
                onValueChange={(value) => setEditRoundForm({ ...editRoundForm, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select round type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MCQ">MCQ</SelectItem>
                  <SelectItem value="Coding">Coding</SelectItem>
                  <SelectItem value="Project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="duration">Duration *</Label>
              <Input
                id="duration"
                type="number"
                value={editRoundForm.duration}
                onChange={(e) => setEditRoundForm({ ...editRoundForm, duration: e.target.value })}
                placeholder="e.g., 1 hour"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="questions">Number of Questions *</Label>
              <Input
                id="questions"
                type="number"
                value={editRoundForm.questionsCount}
                onChange={(e) => setEditRoundForm({ ...editRoundForm, questionsCount: e.target.value })}
                placeholder="e.g., 20"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sequence">Sequence *</Label>
              <Input
                id="sequence"
                type="number"
                value={editRoundForm.sequence ?? ''}
                onChange={e => setEditRoundForm({ ...editRoundForm, sequence: e.target.value })}
                placeholder="e.g., 1"
                min={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoundDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditRoundSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the domain "{deletingDomain?.domainname}" and may affect associated rounds and candidates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingDomain(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Choose Round Dialog */}
      <Dialog open={isChooseRoundDialogOpen} onOpenChange={setIsChooseRoundDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Choose Round from Other Domains</DialogTitle>
            <DialogDescription>Select a round to copy into '{choosingDomain?.domainname}'</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Search round name..."
            value={chooseRoundSearch}
            onChange={e => setChooseRoundSearch(e.target.value)}
            className="mb-4"
          />
          <div className="max-h-[400px] overflow-y-auto">
            {allRounds.length > 0 ? (
              <div className="space-y-3">
                {allRounds
                  .filter(round => round.roundname.toLowerCase().includes(chooseRoundSearch.toLowerCase()))
                  .map((round) => (
                    <div key={round._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{round.roundname}</h4>
                        <p className="text-sm text-muted-foreground">
                          Type: {round.type} <br />
                          Duration: {round.duration} min<br />
                          Questions: {round.questionsCount}<br />
                          Status: {round.status}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleTakeRound(round)}>
                        Take this Round
                      </Button>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No rounds found in other domains</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsChooseRoundDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
