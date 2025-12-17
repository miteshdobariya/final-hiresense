"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import toast from "react-hot-toast"
import { Plus, Edit, Trash2, Search, Sparkles, Loader2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Loader from "@/components/ui/loader"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

type Round = {
  _id: string;
  roundname: string;
  type?: string;
};

type Question = {
  _id?: string;
  id?: string | number;
  question: string;
  type: string;
  roundname: Round | string;
  difficulty?: string;
  options: string[];
  correctAnswer: string;
  points?: number;
  isAIGenerated?: boolean;
  roundType?: string;
};

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [roundFilter, setRoundFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [isGenerating, setIsGenerating] = useState(false)
  const [formData, setFormData] = useState({
    question: "",
    type: "",
    round: "",
    difficulty: "",
    options: ["", "", "", ""],
    correctAnswer: "",
  })
  const [aiFormData, setAiFormData] = useState({
    topic: "",
    type: "",
    difficulty: "",
    numberOfQuestions: "",
    round: "",
  })
  const [aiGeneratedQuestions, setAIGeneratedQuestions] = useState<Question[]>([])
  const [showAIGeneratedModal, setShowAIGeneratedModal] = useState(false)
  const [acceptingQuestionId, setAcceptingQuestionId] = useState<string | null>(null)
  const [acceptingAll, setAcceptingAll] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { data: session, status } = useSession()
  const router = useRouter()

  // --- Fetch all rounds and questions on mount ---
  useEffect(() => {
    // Fetch rounds
    fetch("/api/rounds")
      .then((res) => res.json())
      .then((data) => {
        setRounds(data.rounds);
      })
    
    // Fetch all questions
    fetch("/api/questions")
      .then((res) => res.json())
      .then((data) => {
        setQuestions(data.questions);
      })
  }, [])

  useEffect(() => {
    if (status === "authenticated") {
      if (session.user.role === "hr") {
        router.replace("/admin");
      }
    }
  }, [status, session, router]);

  // --- Client-side filtering ---
  const filteredQuestions = questions.filter((question) => {
    // Search filter
    const matchesSearch = question.question.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Round filter
    let matchesRound = roundFilter === "all"
    if (roundFilter !== "all") {
      // Check for missing round
      if (roundFilter === "missing") {
        // A question has a missing round if:
        // 1. roundname is a string (not an object) and doesn't match any round ID
        // 2. roundname is null/undefined
        // 3. roundname is an object but the round doesn't exist in rounds array
        const hasValidRound = (() => {
          if (!question.roundname) return false
          if (typeof question.roundname === 'string') {
            return rounds.some(round => round._id === question.roundname)
          }
          if (typeof question.roundname === 'object' && question.roundname) {
            return rounds.some(round => round._id === (question.roundname as any)._id)
          }
          return false
        })()
        matchesRound = !hasValidRound
      } else {
        if (typeof question.roundname === 'object' && question.roundname) {
          matchesRound = (question.roundname as any)._id === roundFilter
        } else {
          matchesRound = String(question.roundname) === roundFilter
        }
      }
    }
    
    // Type filter
    const matchesType = typeFilter === "all" || question.type === typeFilter
    
    return matchesSearch && matchesRound && matchesType
  })

  // --- Get unique question types for dynamic filter ---
  const availableQuestionTypes = [...new Set(questions.map(q => q.type).filter(Boolean))]

  const handleAdd = () => {
    setEditingQuestion(null)
    setFormData({
      question: "",
      type: "",
      round: "",
      difficulty: "",
      options: ["", "", "", ""],
      correctAnswer: "",
    })
    setIsDialogOpen(true)
  }

  const handleAIGenerate = () => {
    setAiFormData({
      topic: "",
      type: "",
      difficulty: "",
      numberOfQuestions: "",
      round: "",
    })
    setIsAIDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.question || !formData.type || !formData.round) {
      toast("Please fill in all required fields")
      return
    }
    try {
      const roundObj = rounds.find((round: Round) => round._id === formData.round || round.roundname === formData.round);
      const body = {
        question: formData.question,
        type: formData.type,
        roundname: roundObj ? roundObj._id : formData.round,
        difficulty: formData.difficulty,
        options: formData.type === "MCQ" ? formData.options.filter((opt) => opt.trim()) : [],
        correctAnswer: formData.correctAnswer,
      }
      let res, data: any
      if (editingQuestion && editingQuestion._id) {
        res = await fetch("/api/questions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _id: editingQuestion._id, ...body }),
        })
        if (!res.ok) throw new Error("Failed to update question")
        data = await res.json()
        const roundObj = rounds.find((round: Round) => round._id === (data.question.roundname?._id || data.question.roundname))
        setQuestions((prev) => prev.map(q => (q._id === editingQuestion._id ? {
          ...data.question,
          roundname: roundObj ? { ...roundObj } : data.question.roundname,
        } : q)))
      } else {
        res = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error("Failed to add question")
        data = await res.json()
        const roundObj = rounds.find((round: Round) => round._id === (data.question.roundname?._id || data.question.roundname))
        setQuestions((prev) => [...prev, {
          ...data.question,
          roundname: roundObj ? { ...roundObj } : data.question.roundname,
        }])
      }
      toast(editingQuestion ? "Question updated successfully" : "Question added successfully")
      setIsDialogOpen(false)
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err))
    }
  }

  const handleGenerateAIQuestions = async () => {
    if (!aiFormData.topic || !aiFormData.type || !aiFormData.numberOfQuestions || !aiFormData.round) {
      toast("Please fill in all required fields")
      return
    }
    setIsGenerating(true)
    const roundObj = rounds.find((round: Round) => round._id === aiFormData.round)
    const body = {
      domainName: aiFormData.topic,
      roundId: roundObj ? roundObj._id : aiFormData.round,
      roundName: roundObj ? roundObj.roundname : aiFormData.round,
      type: roundObj ? roundObj.type : aiFormData.type,
      difficulty: aiFormData.difficulty,
      numberOfQuestions: aiFormData.numberOfQuestions,
    }
    
    try {
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
      setIsAIDialogOpen(false)
      setShowAIGeneratedModal(true)
      toast("Generated " + body.numberOfQuestions + " AI questions. Review and accept to add to the database.")
    } catch (err) {
      setIsGenerating(false)
      toast(err instanceof Error ? err.message : String(err))
    }
  }

  const handleAcceptAIQuestion = async (question: Question, questionIndex?: number) => {
    if (!question) return;
    
    setAcceptingQuestionId(question.id?.toString() || question._id?.toString() || null);
    
    try {
      const roundObj = rounds.find((round: Round) => round._id === question.roundname || round.roundname === question.roundname);
      if (!roundObj) {
        toast("Could not resolve round for this question");
        return;
      }

      const questionData = {
        question: question.question,
        type: question.type,
        roundname: roundObj._id,
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
            roundname: roundObj,
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
        const roundObj = rounds.find((round: Round) => round._id === question.roundname || round.roundname === question.roundname);
        if (!roundObj) {
          toast(`Could not resolve round for question: ${question.question}`);
          continue;
        }

        questionsToAccept.push({
          question: question.question,
          type: question.type,
          roundname: roundObj._id,
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
        const acceptedQuestions = data.acceptedQuestions.map((acceptedQuestion: any) => {
          const roundObj = rounds.find((round: Round) => round._id === acceptedQuestion.roundname);
          return {
            ...acceptedQuestion,
            roundname: roundObj || acceptedQuestion.roundname,
          };
        });
        
        setQuestions((prev) => [...prev, ...acceptedQuestions]);
        
        // Clear AI generated questions and close modal
        setAIGeneratedQuestions([]);
        setShowAIGeneratedModal(false);
        
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
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question)
    setFormData({
      question: question.question,
      type: question.type,
      round: typeof question.roundname === 'object' ? question.roundname._id : question.roundname,
      difficulty: question.difficulty || "",
      options: question.options || ["", "", "", ""],
      correctAnswer: question.correctAnswer,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (questionId: string | number) => {
    try {
      const res = await fetch("/api/questions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: questionId }),
      })
      if (!res.ok) throw new Error("Failed to delete question")
      setQuestions((prev) => prev.filter((q) => (q._id || q.id) !== questionId))
      toast("Question deleted successfully")
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err))
    }
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options]
    newOptions[index] = value
    setFormData({ ...formData, options: newOptions })
  }

  // Auto-fill type based on selected round
  useEffect(() => {
    if (formData.round) {
      const roundObj = rounds.find((round: Round) => round._id === formData.round)
      if (roundObj && roundObj.type) {
        setFormData(f => ({ ...f, type: roundObj.type || "" }))
      }
    }
  }, [formData.round, rounds])

  // Auto-fill type in AI form based on selected round
  useEffect(() => {
    if (aiFormData.round) {
      const roundObj = rounds.find((round: Round) => round._id === aiFormData.round)
      if (roundObj && roundObj.type) {
        setAiFormData(f => ({ ...f, type: roundObj.type || "" }))
      }
    }
  }, [aiFormData.round, rounds])

  // Auto-close modal when all AI questions are handled
  useEffect(() => {
    if (showAIGeneratedModal && aiGeneratedQuestions.length === 0 && !acceptingAll && acceptingQuestionId === null) {
      setShowAIGeneratedModal(false);
    }
  }, [aiGeneratedQuestions, showAIGeneratedModal, acceptingAll, acceptingQuestionId]);

  if (isLoading) {
    return <Loader text="Loading questions..." />;
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Questions</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={handleAIGenerate} variant="outline" className="w-full sm:w-auto">
            <Sparkles className="mr-2 h-4 w-4" />
            Generate AI Questions
          </Button>
          <Button onClick={handleAdd} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by rounds..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={roundFilter} onValueChange={setRoundFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Round" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rounds</SelectItem>
              <SelectItem value="missing">Missing Round</SelectItem>
              {rounds.map((round: Round) => (
                <SelectItem key={round._id} value={round._id}>
                  {round.roundname}
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
              {availableQuestionTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Questions Table */}
      {Array.isArray(filteredQuestions) && filteredQuestions.length > 0 ? (
        <div className="grid gap-4">
          {filteredQuestions
            .filter(q => q && typeof q._id === 'string')
            .map((question) => (
              <div key={question._id || question.id} className="border rounded-xl p-6 bg-white flex flex-col gap-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="pt-1 pr-2 text-gray-400 cursor-move">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="5" cy="7" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="5" cy="17" r="1.5"/><circle cx="12" cy="7" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="17" r="1.5"/><circle cx="19" cy="7" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="19" cy="17" r="1.5"/></svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-lg mb-1">{question.question}</div>
                    {/* Tags row under question */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {question.type && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{question.type}</span>}
                      {question.roundname && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{typeof question.roundname === 'object' ? question.roundname.roundname : question.roundname}</span>}
                      {question.difficulty && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${question.difficulty === 'Easy' ? 'bg-black text-white' : question.difficulty === 'Hard' ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-800'}`}>{question.difficulty}</span>}
                      {question.roundType && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{question.roundType}</span>}
                    </div>
                    {/* Only show options if MCQ */}
                    {question.type === "MCQ" && (
                      <>
                        <div className="mb-2 text-sm text-gray-600 flex flex-wrap gap-4">
                          <span>Options:</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {question.options.map((opt: string, idx: number) => (
                            <div
                              key={String(opt) + idx}
                              className={`px-4 py-2 rounded border ${opt === question.correctAnswer ? "bg-green-100 text-green-800 font-semibold" : "bg-gray-50"}`}
                            >
                              <span className="font-semibold mr-2">{String.fromCharCode(65 + idx)}.</span> {opt}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Buttons in a row at the bottom right */}
                  <div className="flex flex-col justify-end items-end ml-4 w-28">
                    <div className="flex gap-2 mt-auto">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(question)}>
                        <Edit className="h-4 w-4" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => {
                          // If the question is AI-generated (id/_id starts with 'ai_'), remove from state only
                          if ((question.id && String(question.id).startsWith('ai_')) || (question._id && String(question._id).startsWith('ai_'))) {
                            setAIGeneratedQuestions(prev => prev.filter(q => (q.id || q._id) !== (question.id || question._id)));
                          } else {
                            // Otherwise, call the existing handleDelete for real questions
                            handleDelete(question._id || question.id || "");
                          }
                        }}
                        disabled={acceptingAll || acceptingQuestionId === (question.id?.toString() || question._id?.toString())}
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No questions found. Please add a question to get started.
        </div>
      )}

      {/* AI Generated Questions Modal */}
      <Dialog open={showAIGeneratedModal} onOpenChange={setShowAIGeneratedModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review & Accept AI Generated Questions</DialogTitle>
            <DialogDescription>Review the generated questions and accept the ones you want to add to the question bank.</DialogDescription>
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
              <div className="grid gap-6">
                {aiGeneratedQuestions.map((question, idx) => (
                  <div key={question.id || idx} className="border rounded-xl p-6 bg-white flex flex-col gap-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="pt-1 pr-2 text-gray-400 cursor-move">
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="5" cy="7" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="5" cy="17" r="1.5"/><circle cx="12" cy="7" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="17" r="1.5"/><circle cx="19" cy="7" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="19" cy="17" r="1.5"/></svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-lg mb-1">{question.question}</div>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {question.type && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{question.type}</span>}
                          {question.roundname && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{typeof question.roundname === 'object' ? question.roundname.roundname : question.roundname}</span>}
                          {question.difficulty && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${question.difficulty === 'Easy' ? 'bg-black text-white' : question.difficulty === 'Hard' ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-800'}`}>{question.difficulty}</span>}
                          {question.roundType && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{question.roundType}</span>}
                        </div>
                        {question.type === "MCQ" && (
                          <>
                            <div className="mb-2 text-sm text-gray-600 flex flex-wrap gap-4">
                              <span>Options:</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {question.options.map((opt: string, idx: number) => (
                                <div
                                  key={String(opt) + idx}
                                  className={`px-4 py-2 rounded border ${opt === question.correctAnswer ? "bg-green-100 text-green-800 font-semibold" : "bg-gray-50"}`}
                                >
                                  <span className="font-semibold mr-2">{String.fromCharCode(65 + idx)}.</span> {opt}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex flex-col justify-end items-end ml-4 w-28">
                        <div className="flex gap-2 mt-auto">
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => handleAcceptAIQuestion(question, idx)}
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
                                setAIGeneratedQuestions(prev => prev.filter((_, i) => i !== idx));
                              } else {
                                handleDelete(question._id || question.id || "");
                              }
                            }}
                            disabled={acceptingAll || acceptingQuestionId === (question.id?.toString() || question._id?.toString())}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500">No AI generated questions to review.</div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Question Generation Dialog */}
      <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generate AI Questions</DialogTitle>
            <DialogDescription>Configure the question details and settings</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="round">Round *</Label>
                <Select
                  value={aiFormData.round}
                  onValueChange={(value) => {
                    setAiFormData((prev) => {
                      const selectedRound = rounds.find((round: Round) => round._id === value)
                      return {
                        ...prev,
                        round: selectedRound ? selectedRound._id : "",
                        type: selectedRound && typeof selectedRound.type === 'string' ? selectedRound.type : "",
                      }
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select round" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(rounds) && rounds.length > 0 && rounds
                      .filter((round: Round) => round && round._id)
                      .map((round: Round) => (
                        <SelectItem key={round._id} value={round._id}>
                          {round.roundname}
                        </SelectItem>
                      ))}
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
            <Button variant="outline" onClick={() => setIsAIDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateAIQuestions} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate Questions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Question Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Edit Question" : "Add New Question"}</DialogTitle>
            <DialogDescription>Configure the question details and settings</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="round">Round *</Label>
                <Select
                  value={formData.round}
                  onValueChange={(value) => {
                    const selectedRound = rounds.find((round: Round) => round._id === value);
                    setFormData((prev) => ({
                      ...prev,
                      round: value,
                      type: selectedRound && typeof selectedRound.type === 'string' ? selectedRound.type : '',
                    }));
                  }}
                  disabled={!!editingQuestion}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select round" />
                  </SelectTrigger>
                  <SelectContent>
                    {rounds && Array.isArray(rounds) && rounds
                      .filter((round: Round) => round && round._id)
                      .map((round: Round) => (
                        <SelectItem key={round._id} value={round._id}>
                          {round.roundname}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={formData.type} disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Type will be set by round" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.type && <SelectItem value={formData.type}>{formData.type}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="question">Question *</Label>
              <Textarea
                id="question"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Enter your question here..."
              />
            </div>
            {/* MCQ Options Fields */}
            {formData.type === "MCQ" && (
              <div className="grid gap-2">
                <Label>Options</Label>
                <div className="grid grid-cols-1 gap-2">
                  {formData.options.map((opt, idx) => (
                    <Input
                      key={idx}
                      value={opt}
                      onChange={e => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      className=""
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
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
                {formData.type === "MCQ" ? (
                  <Select
                    value={formData.correctAnswer}
                    onValueChange={(value) => setFormData({ ...formData, correctAnswer: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select correct option" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.options.filter(opt => opt.trim()).map((opt, idx) => (
                        <SelectItem key={idx} value={opt}>
                          {String.fromCharCode(65 + idx)}. {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="correctAnswer"
                    value={formData.correctAnswer}
                    onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                    placeholder="Enter the correct answer or expected solution..."
                  />
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingQuestion ? "Update Question" : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

