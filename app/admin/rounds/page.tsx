"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Plus, Clock, Users, Eye, FileText, Search, Edit, Sparkles, Trash2, Loader2 } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Loader from "@/components/ui/loader"
import toast from "react-hot-toast"
import { Textarea } from "@/components/ui/textarea"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

// Types
interface Domain {
  _id: string;
  domainname: string;
  rounds?: string[];
}
interface Round {
  _id: string;
  roundname: string;
  type?: string;
  duration?: number;
  questionsCount?: number;
  currentQuestionsCount?: number;
  status?: string;
}

type Question = {
  _id?: string;
  id?: string | number;
  question: string;
  type: string;
  domainname: Domain | string;
  roundname: Round | string;
  difficulty?: string;
  options: string[];
  correctAnswer: string;
  points: number;
  isAIGenerated?: boolean;
  roundType?: string;
};

export default function RoundsPage() {
  const [rounds, setRounds] = useState<Round[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [isLoadingRounds, setIsLoadingRounds] = useState(true)
  const [isLoadingDomains, setIsLoadingDomains] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isQuestionsDialogOpen, setIsQuestionsDialogOpen] = useState(false)
  const [editingRound, setEditingRound] = useState<Round | null>(null)
  const [viewingRound, setViewingRound] = useState<Round | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [domainFilter, setDomainFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    duration: "",
    questionsCount: "",
  })
  const [questions, setQuestions] = useState<Question[]>([])
  const [isAddQuestionDialogOpen, setIsAddQuestionDialogOpen] = useState(false)
  const [isAIQuestionDialogOpen, setIsAIQuestionDialogOpen] = useState(false)
  const [isAIGeneratedModalOpen, setIsAIGeneratedModalOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [addForm, setAddForm] = useState({
    question: '',
    type: viewingRound?.type || '',
    difficulty: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    points: '',
  })
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({})
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [roundToDelete, setRoundToDelete] = useState<Round | null>(null)
  const [aiGeneratedQuestions, setAIGeneratedQuestions] = useState<Question[]>([])
  const [acceptingQuestionId, setAcceptingQuestionId] = useState<string | null>(null)
  const [acceptingAll, setAcceptingAll] = useState(false)
  const [aiFormData, setAiFormData] = useState({
    topic: "",
    type: "",
    difficulty: "",
    numberOfQuestions: "",
    additionalInfo: "",
  })
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      if (session.user.role === "hr") {
        router.replace("/admin")
      }
    }
  }, [status, session, router])

  useEffect(() => {
    setIsLoadingRounds(true)
    setIsLoadingDomains(true)
    
    fetch("/api/rounds")
      .then((res) => res.json())
      .then((data) => {
        setRounds(data.rounds)
        setIsLoadingRounds(false)
      })
      .catch((error) => {
        console.error("Error fetching rounds:", error)
        setIsLoadingRounds(false)
        toast("Failed to load rounds")
      })
      
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
  }, [])

  useEffect(() => {
    if (viewingRound && isQuestionsDialogOpen) {
      fetch(`/api/questions?roundname=${viewingRound._id}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch questions');
          return res.json();
        })
        .then(data => setQuestions(data.questions || []))
        .catch(err => {
          setQuestions([]);
          toast(err.message);
        });
    }
  }, [viewingRound, isQuestionsDialogOpen])

  useEffect(() => {
    async function fetchCounts() {
      const counts: Record<string, number> = {}
      await Promise.all(rounds.map(async (round) => {
        try {
          const res = await fetch(`/api/questions?roundname=${round._id}`)
          if (!res.ok) throw new Error('Failed to fetch questions');
          const data = await res.json()
          counts[round._id] = data.questions.length
        } catch (err) {
          counts[round._id] = 0;
        }
      }))
      setQuestionCounts(counts)
    }
    if (rounds.length > 0) fetchCounts()
  }, [rounds])

  const filteredRounds = rounds.filter((round) => {
    const matchesSearch = round.roundname.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Check if the round type matches the filter
    const matchesType = typeFilter === "all" || round.type === typeFilter
    
    // If "all" domains is selected, only filter by search and type
    if (domainFilter === "all") {
      return matchesSearch && matchesType
    }
    
    // If "unassigned" is selected, show rounds that are not in any domain
    if (domainFilter === "unassigned") {
      const isAssignedToAnyDomain = domains.some(domain => 
        domain.rounds?.some(roundItem => roundItem === round._id)
      )
      return matchesSearch && matchesType && !isAssignedToAnyDomain
    }
    
    // Check if the round is associated with the selected domain
    const selectedDomain = domains.find(domain => domain._id === domainFilter)
    const matchesDomain = selectedDomain?.rounds?.some(roundItem => roundItem === round._id) || false
    
    return matchesSearch && matchesDomain && matchesType
  })

  const handleAdd = () => {
    setEditingRound(null)
    setFormData({
      name: "",
      type: "",
      duration: "",
      questionsCount: "",
    })
    setIsDialogOpen(true)
  }

  const handleViewQuestions = (round: Round) => {
    setViewingRound(round)
    setIsQuestionsDialogOpen(true)
  }

  const handleAddQuestions = (round: Round) => {
    toast("Redirecting to add questions for " + round.roundname)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.type || !formData.duration || !formData.questionsCount) {
      toast("Please fill in all fields")
      return
    }
    try {
      if (editingRound) {
        // Update existing round
        const res = await fetch("/api/rounds", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            _id: editingRound._id,
            roundname: formData.name,
            type: formData.type,
            duration: Number(formData.duration),
            questionsCount: Number(formData.questionsCount),
          }),
        })
        if (!res.ok) throw new Error("Failed to update round")
        const data = await res.json()
        setRounds((prev) => prev.map(r => r._id === editingRound._id ? data.round : r))
        toast("Round updated successfully")
      } else {
        // Create new round
        const res = await fetch("/api/rounds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roundname: formData.name,
            type: formData.type,
            duration: Number(formData.duration),
            questionsCount: Number(formData.questionsCount),
          }),
        })
        if (!res.ok) throw new Error("Failed to add round")
        const data = await res.json()
        setRounds((prev) => [...prev, data.round])
        toast("Round added successfully")
      }
      setIsDialogOpen(false)
      setEditingRound(null)
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

  const handleDeleteRound = async (roundId: string) => {
    try {
      const res = await fetch("/api/rounds", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: roundId }),
      });
      if (!res.ok) throw new Error("Failed to delete round");
      setRounds((prev) => prev.filter((r) => r._id !== roundId));
      toast("Round deleted successfully");
    } catch (err: any) {
      toast(err.message);
    }
  };

  const handleAddQuestionSave = async () => {
    if (!addForm.question || !addForm.type || !viewingRound?._id) {
      toast("Please fill in all required fields")
      return
    }
    try {
      const body = {
        question: addForm.question,
        type: addForm.type,
        roundname: viewingRound._id,
        difficulty: addForm.difficulty,
        options: addForm.type === "MCQ" ? addForm.options.filter((opt) => opt.trim()) : [],
        correctAnswer: addForm.correctAnswer,
      }
      
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      
      if (!res.ok) throw new Error("Failed to add question")
      const data = await res.json()
      
      setQuestions((prev) => [...prev, {
        ...data.question,
        roundname: viewingRound,
      }])
      
      setIsAddQuestionDialogOpen(false)
      setAddForm({ 
        question: '', 
        type: viewingRound?.type || '', 
        difficulty: '', 
        options: ['', '', '', ''], 
        correctAnswer: '', 
        points: '' 
      })
      toast("Question added successfully")
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err))
    }
  }

  const handleGenerateAIQuestions = async () => {
    if (!aiFormData.topic || !aiFormData.type || !aiFormData.numberOfQuestions) {
      toast("Please fill in all required fields")
      return
    }
    setIsGenerating(true)
    
    try {
      const body = {
        domainName: aiFormData.topic || viewingRound?.roundname || "General",
        roundId: viewingRound?._id,
        roundName: viewingRound?.roundname,
        type: aiFormData.type,
        difficulty: aiFormData.difficulty,
        numberOfQuestions: aiFormData.numberOfQuestions,
      }
      
      const res = await fetch("/api/questions/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`)
      }
      
      const data = await res.json()
      
      // Add unique IDs to AI generated questions
      const questionsWithIds = data.questions.map((q: Question, index: number) => ({
        ...q,
        id: `ai_${Date.now()}_${index}`,
        _id: `ai_${Date.now()}_${index}`
      }))
      
      setAIGeneratedQuestions(questionsWithIds)
      setIsGenerating(false)
      setIsAIQuestionDialogOpen(false)
      setIsAIGeneratedModalOpen(true)
      toast(`Generated ${aiFormData.numberOfQuestions} AI questions. Review and accept to add to the database.`)
    } catch (err) {
      setIsGenerating(false)
      toast(err instanceof Error ? err.message : String(err))
    }
  }

  const handleConfirmAcceptAIQuestion = async (question: Question, questionIndex?: number) => {
    if (!question) return;
    
    setAcceptingQuestionId(question.id?.toString() || question._id?.toString() || null);
    
    try {
      const questionData = {
        question: question.question,
        type: question.type,
        roundname: viewingRound?._id,
        difficulty: question.difficulty || "Medium",
        options: question.options || [],
        correctAnswer: question.correctAnswer,
      };

      const res = await fetch("/api/questions/ai", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: [questionData],
          action: "accept"
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      
      if (data.success) {
        // Add the accepted question to the main questions list
        const acceptedQuestion = data.acceptedQuestions[0];
        setQuestions((prev) => [
          ...prev,
          {
            ...acceptedQuestion,
            roundname: viewingRound,
          },
        ]);
        
        // Remove from AI generated questions using index if available, otherwise use ID
        setAIGeneratedQuestions((prev) => {
          let filtered;
          if (questionIndex !== undefined) {
            // Use index-based filtering
            filtered = prev.filter((_, index) => index !== questionIndex);
          } else {
            // Use ID-based filtering as fallback
            filtered = prev.filter((q) => q.id !== question.id && q._id !== question._id);
          }
          return filtered;
        });
        
        toast("Question accepted successfully");
      } else {
        throw new Error("Failed to accept question");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err));
    } finally {
      setAcceptingQuestionId(null);
    }
  };

  const handleAcceptAllAIQuestions = async () => {
    if (aiGeneratedQuestions.length === 0) return;
    
    setAcceptingAll(true);
    
    try {
      const questionsToAccept = [];
      
      for (const question of aiGeneratedQuestions) {
        questionsToAccept.push({
          question: question.question,
          type: question.type,
          roundname: viewingRound?._id,
          difficulty: question.difficulty || "Medium",
          options: question.options || [],
          correctAnswer: question.correctAnswer,
        });
      }

      if (questionsToAccept.length === 0) {
        toast("No valid questions to accept");
        return;
      }

      const res = await fetch("/api/questions/ai", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: questionsToAccept,
          action: "acceptAll"
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      
      if (data.success) {
        // Add all accepted questions to the main questions list
        const acceptedQuestions = data.acceptedQuestions.map((acceptedQuestion: any) => ({
          ...acceptedQuestion,
          roundname: viewingRound,
        }));
        
        setQuestions((prev) => [...prev, ...acceptedQuestions]);
        
        // Clear AI generated questions and close modal
        setAIGeneratedQuestions([]);
        setIsAIGeneratedModalOpen(false);
        
        toast(`Successfully accepted ${acceptedQuestions.length} questions`);
        
        if (data.errors && data.errors.length > 0) {
          toast(`Some questions failed: ${data.errors.join(", ")}`);
        }
      } else {
        throw new Error("Failed to accept questions");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err));
    } finally {
      setAcceptingAll(false);
    }
  }

  const handleDeleteQuestion = async (questionId: string | number) => {
    try {
      const res = await fetch('/api/questions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: questionId }),
      });
      if (!res.ok) throw new Error('Failed to delete question');
      setQuestions(prev => prev.filter(q => (q._id || q.id) !== questionId));
      toast("Question deleted successfully");
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    if (isAIGeneratedModalOpen && aiGeneratedQuestions.length === 0 && !acceptingAll && acceptingQuestionId === null) {
      setIsAIGeneratedModalOpen(false);
    }
  }, [aiGeneratedQuestions, isAIGeneratedModalOpen, acceptingAll, acceptingQuestionId]);

  // Auto-fill type based on viewing round
  useEffect(() => {
    if (viewingRound && viewingRound.type) {
      setAiFormData(prev => ({ ...prev, type: viewingRound.type || "" }));
      setAddForm(prev => ({ ...prev, type: viewingRound.type || "" }));
    }
  }, [viewingRound]);

  if (isLoadingRounds || isLoadingDomains) {
    return <Loader text="Loading rounds and domains..." />;
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Interview Rounds</h2>
        <Button onClick={() => {
          setEditingRound(null);
          setFormData({ name: "", type: "", duration: "", questionsCount: "" });
          setIsDialogOpen(true);
        }} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Round
        </Button>
      </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rounds..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={domainFilter} onValueChange={setDomainFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Domains</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {domains.map((domain) => (
                    <SelectItem key={domain._id} value={domain._id}>
                      {domain.domainname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="MCQ">MCQ</SelectItem>
                  <SelectItem value="Coding">Coding</SelectItem>
                  <SelectItem value="Project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rounds Table */}
          <Table>
            <TableHeader className="bg-gray-100 border-b border-gray-300">
              <TableRow>
                <TableHead className="text-gray-700 font-semibold tracking-wide text-left">Round Name</TableHead>
                <TableHead className="text-gray-700 font-semibold tracking-wide text-left">Type</TableHead>
                <TableHead className="text-gray-700 font-semibold tracking-wide text-center">Duration</TableHead>
                <TableHead className="text-gray-700 font-semibold tracking-wide text-center">Questions</TableHead>
                <TableHead className="text-gray-700 font-semibold tracking-wide text-center">Questions Bank</TableHead>
                <TableHead className="text-gray-700 font-semibold tracking-wide w-36 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRounds.map((round, idx) => (
                <TableRow key={round._id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <TableCell className="text-left">{round.roundname}</TableCell>
                  <TableCell className="text-left">{round.type}</TableCell>
                  <TableCell className="text-center">{round.duration}</TableCell>
                  <TableCell className="text-center">{round.questionsCount}</TableCell>
                  <TableCell className="text-center">{round.currentQuestionsCount}</TableCell>
                  <TableCell className="w-36 text-center">
                    <div className="flex flex-row items-center justify-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button aria-label="View Questions" onClick={() => handleViewQuestions(round)} className="border border-gray-300 rounded-md bg-white text-blue-600 hover:border-blue-700 hover:text-blue-800 p-2 transition-colors">
                              <Eye className="h-5 w-5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>View questions</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button aria-label="Edit" onClick={() => {
                              setEditingRound(round);
                              setFormData({
                                name: round.roundname || "",
                                type: round.type || "",
                                duration: round.duration?.toString() || "",
                                questionsCount: round.questionsCount?.toString() || ""
                              });
                              setIsDialogOpen(true);
                            }} className="border border-gray-300 rounded-md bg-white text-gray-700 hover:border-gray-700 hover:text-black p-2 transition-colors">
                              <Edit className="h-5 w-5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Edit round</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button aria-label="Delete" onClick={() => { setRoundToDelete(round); setIsDeleteDialogOpen(true); }} className="border border-gray-300 rounded-md bg-white text-destructive hover:border-red-700 hover:text-red-800 p-2 transition-colors">
                              <Trash2 className="h-5 w-5 text-destructive" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Delete round</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredRounds.length === 0 && !isLoadingRounds && (
            <div className="text-center py-8 text-muted-foreground">
              No rounds found. Please add a round to get started.
            </div>
      )}

      {/* Add/Edit Round Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingRound ? "Edit Round" : "Add New Round"}</DialogTitle>
            <DialogDescription>Configure the interview round settings</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Round Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., React Basics"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="duration">Duration (min) *</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="60"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="questionsCount">Questions *</Label>
                <Input
                  id="questionsCount"
                  type="number"
                  value={formData.questionsCount}
                  onChange={(e) => setFormData({ ...formData, questionsCount: e.target.value })}
                  placeholder="25"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editingRound ? "Update" : "Create"} Round</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Questions Dialog */}
      <Dialog open={isQuestionsDialogOpen} onOpenChange={setIsQuestionsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Questions - {viewingRound?.roundname}</DialogTitle>
            <DialogDescription>View questions for this round</DialogDescription>
          </DialogHeader>
          {questions.length > 0 ? (
            <div className="grid gap-4">
              {questions.map((question) => (
                <div key={question._id || question.id} className="border rounded-xl p-4 bg-white flex flex-col gap-2 shadow-sm">
                  <div className="flex items-start justify-between mb-1 gap-2">
                    <div className="font-semibold text-base break-words pr-2" style={{ wordBreak: 'break-word' }}>
                      {question.question}
                    </div>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteQuestion(String(question._id || question.id || ''))} aria-label="Delete">
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {question.type && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{question.type}</span>}
                    {question.difficulty && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{question.difficulty}</span>}
                    {question.points !== undefined && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{question.points} pts</span>}
                  </div>
                  {question.type === 'MCQ' && (
                    <div className="mb-2 text-sm text-gray-600">
                      <span>Options:</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                        {question.options.map((opt, idx) => (
                          <div key={idx} className={`px-4 py-2 rounded border ${opt === question.correctAnswer ? 'bg-green-100 text-green-800 font-semibold' : 'bg-gray-50'}`}>
                            <span className="font-semibold mr-2">{String.fromCharCode(65 + idx)}.</span> {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">No questions found for this round.</div>
          )}
          <div className="flex gap-2 mt-4">
            <Button onClick={() => setIsAddQuestionDialogOpen(true)} variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Add Manually
            </Button>
            <Button onClick={() => setIsAIQuestionDialogOpen(true)} variant="outline">
              <Sparkles className="mr-2 h-4 w-4" /> Generate AI Questions
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsQuestionsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Question Dialog */}
      <Dialog open={isAddQuestionDialogOpen} onOpenChange={setIsAddQuestionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Question</DialogTitle>
            <DialogDescription>Configure the question details and settings</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="round">Round *</Label>
                <Select value={viewingRound?._id || ""} disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Round will be auto-filled" />
                  </SelectTrigger>
                  <SelectContent>
                    {viewingRound && <SelectItem value={viewingRound._id}>{viewingRound.roundname}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={addForm.type} disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Type will be set by round" />
                  </SelectTrigger>
                  <SelectContent>
                    {addForm.type && <SelectItem value={addForm.type}>{addForm.type}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="question">Question *</Label>
              <Textarea
                id="question"
                value={addForm.question}
                onChange={(e) => setAddForm({ ...addForm, question: e.target.value })}
                placeholder="Enter your question here..."
              />
            </div>
            {/* MCQ Options Fields */}
            {addForm.type === "MCQ" && (
              <div className="grid gap-2">
                <Label>Options</Label>
                <div className="grid grid-cols-1 gap-2">
                  {addForm.options.map((opt, idx) => (
                    <Input
                      key={idx}
                      value={opt}
                      onChange={e => {
                        const newOptions = [...addForm.options]
                        newOptions[idx] = e.target.value
                        setAddForm({ ...addForm, options: newOptions })
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  value={addForm.difficulty}
                  onValueChange={(value) => setAddForm({ ...addForm, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="correctAnswer">Correct Answer *</Label>
                {addForm.type === "MCQ" ? (
                  <Select
                    value={addForm.correctAnswer}
                    onValueChange={(value) => setAddForm({ ...addForm, correctAnswer: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select correct option" />
                    </SelectTrigger>
                    <SelectContent>
                      {addForm.options.filter(opt => opt.trim()).map((opt, idx) => (
                        <SelectItem key={idx} value={opt}>
                          {String.fromCharCode(65 + idx)}. {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="correctAnswer"
                    value={addForm.correctAnswer}
                    onChange={(e) => setAddForm({ ...addForm, correctAnswer: e.target.value })}
                    placeholder="Enter the correct answer or expected solution..."
                  />
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddQuestionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddQuestionSave}>
              Add Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Question Generation Dialog */}
      <Dialog open={isAIQuestionDialogOpen} onOpenChange={setIsAIQuestionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generate AI Questions</DialogTitle>
            <DialogDescription>Configure the question details and settings</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="round">Round *</Label>
                <Select value={viewingRound?._id || ""} disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Round will be auto-filled" />
                  </SelectTrigger>
                  <SelectContent>
                    {viewingRound && <SelectItem value={viewingRound._id}>{viewingRound.roundname}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={aiFormData.type} disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Type will be set by round" />
                  </SelectTrigger>
                  <SelectContent>
                    {aiFormData.type && <SelectItem value={aiFormData.type}>{aiFormData.type}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="topic">Topic *</Label>
              <Input
                id="topic"
                value={aiFormData.topic}
                onChange={(e) => setAiFormData({ ...aiFormData, topic: e.target.value })}
                placeholder="e.g., React, Data Structures, Algorithms"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  value={aiFormData.difficulty}
                  onValueChange={(value) => setAiFormData({ ...aiFormData, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="number">Number of Questions *</Label>
                <Input
                  id="number"
                  type="number"
                  min="1"
                  max="50"
                  value={aiFormData.numberOfQuestions}
                  onChange={(e) => setAiFormData({ ...aiFormData, numberOfQuestions: e.target.value })}
                  placeholder="e.g., 10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAIQuestionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateAIQuestions} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Questions"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generated Questions Dialog */}
      <Dialog open={isAIGeneratedModalOpen} onOpenChange={setIsAIGeneratedModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Generated Questions</DialogTitle>
            <DialogDescription>Review the generated questions</DialogDescription>
          </DialogHeader>
          {aiGeneratedQuestions.length > 0 ? (
            <>
              <div className="flex justify-end mb-4">
                <Button 
                  onClick={handleAcceptAllAIQuestions} 
                  size="sm" 
                  variant="default"
                  disabled={acceptingAll || acceptingQuestionId !== null}
                >
                  {acceptingAll ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Accepting All...
                    </>
                  ) : (
                    "Accept All"
                  )}
                </Button>
              </div>
              <div className="grid gap-4">
                {aiGeneratedQuestions.map((question, index) => (
                  <div key={question.id} className="border rounded-xl p-4 bg-white flex flex-col gap-2 shadow-sm">
                    <div className="font-semibold text-base mb-1">{question.question}</div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {question.type && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{question.type}</span>}
                      {question.difficulty && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{question.difficulty}</span>}
                      {question.points !== undefined && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{question.points} pts</span>}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleConfirmAcceptAIQuestion(question, index)}
                        disabled={acceptingAll || acceptingQuestionId === (question.id?.toString() || question._id?.toString())}
                      >
                        {acceptingQuestionId === (question.id?.toString() || question._id?.toString()) ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Accepting...
                          </>
                        ) : (
                          "Accept"
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        className="ml-2"
                        onClick={() => {
                          const idStr = question.id?.toString() || question._id?.toString() || '';
                          if (idStr.startsWith('ai_')) {
                            setAIGeneratedQuestions(prev => prev.filter((_, i) => i !== index));
                          } else {
                            handleDeleteQuestion(question._id || question.id || "");
                          }
                        }}
                        disabled={acceptingAll || acceptingQuestionId === (question.id?.toString() || question._id?.toString())}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground py-8">No AI generated questions found.</div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsAIGeneratedModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the round "{roundToDelete?.roundname}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRoundToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (roundToDelete) { await handleDeleteRound(roundToDelete._id); setRoundToDelete(null); setIsDeleteDialogOpen(false); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
