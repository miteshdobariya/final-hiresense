"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Clock, ChevronLeft, ChevronRight, Flag, Play, CheckCircle, AlertTriangle, Code, Brain, Check, X, FileText, Globe } from "lucide-react"
import axios from "axios"
import toast from "react-hot-toast"
import type { Socket } from "socket.io-client"
import { createSocketClient } from "@/lib/socketClient"
import { SOCKET_EVENTS } from "@/lib/socketEvents"
import type { ForceSubmitPayload } from "@/types/realtime"

type CandidateProctoringEventType =
  | "TAB_HIDDEN"
  | "TAB_VISIBLE"
  | "WINDOW_BLUR"
  | "WINDOW_FOCUS"
  | "WINDOW_BEFORE_UNLOAD"
  | "WINDOW_PAGE_HIDE"

const PROCTORING_EVENT_COOLDOWN_MS = 2000

export default function ExamPage() {
  const router = useRouter()
  const params = useParams() as { roundId: string }
  const roundId = params.roundId
  const [exam, setExam] = useState<any>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<any>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [examStarted, setExamStarted] = useState(false)
  const [examCompleted, setExamCompleted] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<any>>(new Set())
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState("")
  const [examStartTime, setExamStartTime] = useState<Date | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [cooldown, setCooldown] = useState<{ nextAvailable: string; error: string } | null>(null);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState("");
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [disqualificationMessage, setDisqualificationMessage] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const lastEventTimeRef = useRef<Record<string, number>>({});
  const forcedDisqualificationRef = useRef(false);
  const disqualificationMessageRef = useRef<string | null>(null);
  const handleSubmitExamRef = useRef<() => Promise<void>>();
  const examCompletedRef = useRef(false); // Synchronous ref to track exam completion
  
  // Ref to track if resume notification has been shown
  const resumeNotificationShown = useRef(false);

  // Auto-save functionality
  const getStorageKey = (roundId: string) => `exam_answers_${roundId}`;
  const getTimeStorageKey = (roundId: string) => `exam_time_${roundId}`;
  const getStartTimeStorageKey = (roundId: string) => `exam_start_time_${roundId}`;
  const getStartedStorageKey = (roundId: string) => `exam_started_${roundId}`;

  // Save answers to localStorage
  const saveAnswers = useCallback((answers: any) => {
    if (roundId) {
      localStorage.setItem(getStorageKey(roundId), JSON.stringify(answers));
    }
  }, [roundId]);

  // Save time to localStorage
  const saveTime = useCallback((time: number) => {
    if (roundId) {
      localStorage.setItem(getTimeStorageKey(roundId), time.toString());
    }
  }, [roundId]);

  // Save exam start time to localStorage
  const saveStartTime = useCallback((startTime: Date) => {
    if (roundId) {
      localStorage.setItem(getStartTimeStorageKey(roundId), startTime.toISOString());
    }
  }, [roundId]);

  // Save exam started status to localStorage
  const saveExamStarted = useCallback((started: boolean) => {
    if (roundId) {
      localStorage.setItem(getStartedStorageKey(roundId), started.toString());
    }
  }, [roundId]);

  // Load saved answers from localStorage
  const loadSavedAnswers = useCallback(() => {
    if (roundId) {
      const saved = localStorage.getItem(getStorageKey(roundId));
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Error parsing saved answers:', e);
        }
      }
    }
    return {};
  }, [roundId]);

  // Load saved time from localStorage
  const loadSavedTime = useCallback(() => {
    if (roundId) {
      const saved = localStorage.getItem(getTimeStorageKey(roundId));
      return saved ? parseInt(saved, 10) : null;
    }
    return null;
  }, [roundId]);

  // Load saved start time from localStorage
  const loadSavedStartTime = useCallback(() => {
    if (roundId) {
      const saved = localStorage.getItem(getStartTimeStorageKey(roundId));
      return saved ? new Date(saved) : null;
    }
    return null;
  }, [roundId]);

  // Load saved exam started status from localStorage
  const loadSavedExamStarted = useCallback(() => {
    if (roundId) {
      const saved = localStorage.getItem(getStartedStorageKey(roundId));
      return saved === 'true';
    }
    return false;
  }, [roundId]);

  // Clear saved data when exam is completed
  const clearSavedData = useCallback(() => {
    if (roundId) {
      localStorage.removeItem(getStorageKey(roundId));
      localStorage.removeItem(getTimeStorageKey(roundId));
      localStorage.removeItem(getStartTimeStorageKey(roundId));
      localStorage.removeItem(getStartedStorageKey(roundId));
    }
  }, [roundId]);

  const emitProctoringEvent = useCallback(
    (eventType: CandidateProctoringEventType, details?: Record<string, unknown>) => {
      // Only emit proctoring events when exam is started and not completed
      // Use ref for synchronous check to prevent events after submission
      if (!examStarted || examCompleted || examCompletedRef.current) return;
      if (!candidateId || !roundId) return;
      const socket = socketRef.current;
      if (!socket) return;

      const now = Date.now();
      const lastEmitted = lastEventTimeRef.current[eventType] || 0;
      if (now - lastEmitted < PROCTORING_EVENT_COOLDOWN_MS) {
        return;
      }
      lastEventTimeRef.current[eventType] = now;

      socket.emit(SOCKET_EVENTS.PROCTORING_EVENT, {
        eventType,
        candidateId,
        roundId,
        timestamp: new Date().toISOString(),
        details,
      });
      if (process.env.NODE_ENV !== "production") {
        console.debug("[Proctoring] Event emitted", eventType, { candidateId, roundId });
      }
    },
    [candidateId, roundId, examStarted, examCompleted],
  );

  // Sync ref with state and reset when new exam starts
  useEffect(() => {
    if (examCompleted) {
      examCompletedRef.current = true;
    } else if (examStarted && !examCompleted) {
      // Reset ref when a new exam starts
      examCompletedRef.current = false;
    }
  }, [examStarted, examCompleted]);

  useEffect(() => {
    async function fetchCandidateId() {
      try {
        const res = await axios.get("/api/candidate/getdetail");
        setCandidateId(res.data?.candidate?._id || null);
      } catch {
        setCandidateId(null);
      }
    }
    fetchCandidateId();
  }, []);

  useEffect(() => {
    if (!candidateId) return;

    const socket = createSocketClient({
      userId: candidateId,
      role: "candidate",
      candidateId,
      interviewId: roundId,
    });

    if (!socket) return;

    socketRef.current = socket;

    const joinRooms = () =>
      socket.emit(SOCKET_EVENTS.CLIENT_JOIN_ROOMS, {
        candidateId,
        roundId,
        scope: "candidate",
      });

    const handleForceSubmit = (payload: ForceSubmitPayload) => {
      if (!payload || payload.candidateId !== candidateId) return;
      if (forcedDisqualificationRef.current) return;

      const message =
        payload.message ||
        "You are disqualified for not maintaining the integrity and a proper conduct for exam.";

      forcedDisqualificationRef.current = true;
      examCompletedRef.current = true; // Immediately stop proctoring monitoring
      disqualificationMessageRef.current = message;
      setDisqualificationMessage(message);
      toast.error(message);

      if (!examCompleted && handleSubmitExamRef.current) {
        void handleSubmitExamRef.current();
      }
    };

    if (socket.connected) {
      joinRooms();
    } else {
      socket.on("connect", joinRooms);
    }

    socket.on(SOCKET_EVENTS.FORCE_SUBMIT, handleForceSubmit);

    return () => {
      socket.off("connect", joinRooms);
      socket.off(SOCKET_EVENTS.FORCE_SUBMIT, handleForceSubmit);
      if (socketRef.current === socket) {
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, [candidateId, roundId, examCompleted]);

  useEffect(() => {
    async function fetchQuestions() {
      if (!candidateId) return;
      setLoading(true);
      setFetchError("");
      try {
        const res = await axios.post("/api/candidate/start-exam", { candidateId, roundId });
        const questions = res.data.questions || [];
        if (questions.length === 0) {
          setFetchError("No questions found for this round.");
          setExam(null);
        } else {
          // Use the first question's roundname field (populated) for round info
          const roundInfo = questions[0].roundname || {};
          setExam({
            id: roundId,
            name: roundInfo.roundname || "Exam",
            type: roundInfo.type || questions[0].type || "MCQ",
            duration: roundInfo.duration || 60,
            totalQuestions: questions.length,
            questions: questions.map((q: any) => ({
              id: q._id,
              type: q.type,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              points: q.points || 10,
              description: q.description,
              starterCode: q.starterCode,
              expectedOutput: q.expectedOutput,
            })),
          });
          // Load saved exam state
          const savedAnswers = loadSavedAnswers();
          const savedTime = loadSavedTime();
          const savedStartTime = loadSavedStartTime();
          const savedExamStarted = loadSavedExamStarted();
          
          // Set answers if they exist
          if (Object.keys(savedAnswers).length > 0) {
            setAnswers(savedAnswers);
          }
          
          // Set exam state if it was previously started
          if (savedExamStarted && savedStartTime) {
            setExamStarted(true);
            setExamStartTime(savedStartTime);
            
            // Calculate remaining time based on saved start time
            if (savedTime !== null) {
              setTimeLeft(savedTime);
            } else {
              const duration = roundInfo.duration ? roundInfo.duration * 60 : 60 * 60;
              const elapsed = Math.floor((new Date().getTime() - savedStartTime.getTime()) / 1000);
              const remaining = Math.max(0, duration - elapsed);
              setTimeLeft(remaining);
            }
            
            // Show notification that exam was resumed (only once per session)
            if (!resumeNotificationShown.current) {
              resumeNotificationShown.current = true;
              setTimeout(() => {
                toast.success("Exam resumed from where you left off!");
              }, 1000);
            }
          } else {
            setTimeLeft(roundInfo.duration ? roundInfo.duration * 60 : 60 * 60)
          }
        }
      } catch (err) {
        setFetchError("Failed to fetch questions for this round.")
        setExam(null)
      }
      setLoading(false)
    }
    fetchQuestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId, candidateId])

  useEffect(() => {
    // Only monitor proctoring when exam is started and not completed
    if (!examStarted || examCompleted || examCompletedRef.current) return;

    const handleVisibilityChange = () => {
      if (examCompletedRef.current) return; // Double-check before emitting
      if (document.visibilityState === "hidden") {
        emitProctoringEvent("TAB_HIDDEN")
      } else if (document.visibilityState === "visible") {
        emitProctoringEvent("TAB_VISIBLE")
      }
    }

    const handleBlur = () => {
      if (examCompletedRef.current) return;
      emitProctoringEvent("WINDOW_BLUR")
    }
    const handleFocus = () => {
      if (examCompletedRef.current) return;
      emitProctoringEvent("WINDOW_FOCUS")
    }
    const handleBeforeUnload = () => {
      if (examCompletedRef.current) return;
      emitProctoringEvent("WINDOW_BEFORE_UNLOAD")
    }
    const handlePageHide = () => {
      if (examCompletedRef.current) return;
      emitProctoringEvent("WINDOW_PAGE_HIDE")
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("blur", handleBlur)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("pagehide", handlePageHide)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("blur", handleBlur)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("pagehide", handlePageHide)
    }
  }, [examStarted, examCompleted, emitProctoringEvent])

  useEffect(() => {
    // Emit initial focus event when exam starts (only if not completed)
    if (!examStarted || examCompleted || examCompletedRef.current) return
    emitProctoringEvent("WINDOW_FOCUS")
  }, [examStarted, examCompleted, emitProctoringEvent])

  useEffect(() => {
    let timer: any
    if (examStarted && timeLeft > 0 && !examCompleted) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev <= 1 ? 0 : prev - 1;
          // Save time every second
          saveTime(newTime);
          if (prev <= 1) {
            handleSubmitExam()
          }
          return newTime;
        })
      }, 1000)
    }
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examStarted, timeLeft, examCompleted])

  useEffect(() => {
    async function fetchExistingResult() {
      try {
        const res = await axios.get(`/api/candidate/performance?roundId=${roundId}`);
        if (res.data && res.data.success && res.data.round) {
          // Only block retake if the previous attempt was passed
          if (res.data.round.passed) {
          setResults(res.data.round);
          setExamCompleted(true);
            setCooldown(null);
          } else {
            // If failed, allow retake (do not set examCompleted)
            setResults(null);
            setExamCompleted(false);
            setCooldown(null);
          }
        } else if (res.data && res.data.nextAvailable) {
          // Freezing period active
          setCooldown({ nextAvailable: res.data.nextAvailable, error: res.data.error });
        } else {
          setCooldown(null);
        }
      } catch (err) {
        setCooldown(null);
      }
    }
    fetchExistingResult();
  }, [roundId]);

  // Cooldown countdown timer
  useEffect(() => {
    if (!cooldown || !cooldown.nextAvailable) return;
    const interval = setInterval(() => {
      const now = new Date();
      const target = new Date(cooldown.nextAvailable);
      const diff = target - now;
      if (diff <= 0) {
        setCooldownTimeLeft("You can now retake the exam!");
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setCooldownTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  const handleStartExam = () => {
    setExamStarted(true)
    const startTime = new Date();
    setExamStartTime(startTime);
    saveExamStarted(true);
    saveStartTime(startTime);
    toast.success("Exam Started")
  }

  const handleAnswerChange = (questionId: string, answer: any) => {
    const newAnswers = {
      ...answers,
      [questionId]: answer,
    };
    setAnswers(newAnswers);
    // Auto-save answers immediately
    saveAnswers(newAnswers);
  }

  const handleFlagQuestion = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(questionId)) {
        newSet.delete(questionId)
      } else {
        newSet.add(questionId)
      }
      return newSet
    })
  }

  const calculateResults = useCallback(() => {
    if (!exam) return null

    let totalScore = 0
    let correctAnswers = 0
    const questionResults: any[] = []

    exam.questions.forEach((question: any, idx: number) => {
      const userAnswer = answers[question.id]
      let isCorrect = false
      let score = 0

      if (question.type === "MCQ") {
        // Debug log for answer comparison
       
        isCorrect = question.options && userAnswer !== undefined && question.options[userAnswer] === question.correctAnswer;
        score = isCorrect ? question.points : 0
      } else if (question.type === "Coding") {
        // Enhanced scoring for coding questions
        if (userAnswer && userAnswer.trim().length > 50) {
          // Check for key programming concepts
          const hasFunction = userAnswer.includes("function") || userAnswer.includes("=>")
          const hasLogic = userAnswer.includes("if") || userAnswer.includes("for") || userAnswer.includes("while")
          const hasReturn = userAnswer.includes("return")

          let qualityScore = 0
          if (hasFunction) qualityScore += 0.3
          if (hasLogic) qualityScore += 0.4
          if (hasReturn) qualityScore += 0.3

          score = Math.floor(question.points * qualityScore)
          isCorrect = score > question.points * 0.5
        }
      }

      totalScore += score
      if (isCorrect) correctAnswers++

      questionResults.push({
        questionId: question.id,
        question: question.question,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        score,
        maxScore: question.points,
        type: question.type,
      })
    })

    const maxScore = exam.questions.reduce((sum: number, q: any) => sum + q.points, 0)
    const percentage = maxScore > 0 ? ((totalScore / maxScore) * 100) : 0;

    return {
      totalScore,
      maxScore,
      percentage,
      correctAnswers,
      totalQuestions: exam.questions.length,
      questionResults,
      passed: percentage >= 60,
    }
  }, [exam, answers])

  const handleSubmitExam = async () => {
    // Immediately stop proctoring monitoring by setting ref synchronously
    examCompletedRef.current = true;
    
    setResultsLoading(true);
    const examResults = calculateResults()
    if (!examResults || !exam) return;

    const isForcedDisqualification = forcedDisqualificationRef.current;
    const forcedMessage = disqualificationMessageRef.current;
    if (isForcedDisqualification) {
      examResults.passed = false;
    }

    setResults(examResults)
    setExamCompleted(true)
    
    // Clear saved data when exam is completed
    clearSavedData();

    // Show appropriate toast based on round type
    if (!isForcedDisqualification) {
    if (exam.type === "MCQ") {
      toast.success(`Your score: ${examResults.percentage.toFixed(2)}% (${examResults.totalScore}/${examResults.maxScore})`)
    } else if (exam.type === "Coding") {
      toast.success("Your code will be evaluated shortly!");
    } else if (exam.type === "Project") {
      toast.success("Your project has been submitted successfully!");
      }
    } else if (forcedMessage) {
      toast.error(forcedMessage);
    }

    // --- Block to save performance data ---
    try {
      const completedAt = new Date();
      const durationSeconds = examStartTime ? Math.round((completedAt.getTime() - examStartTime.getTime()) / 1000) : null;

      // Map question results to the format expected by the new schema
      const formattedQuestions = examResults.questionResults.map((result: any, index: number) => {
          const originalQuestion = exam.questions[index];
          // Normalize type to match backend enum exactly
          const normalizeType = (t: string) => {
            switch (t.toLowerCase()) {
              case "mcq": return "MCQ";
              case "coding": return "Coding";
              case "mixed": return "Mixed";
              case "system design": return "System Design";
              default: return t;
            }
          };
          const type = normalizeType(originalQuestion.type);
          let candidateAnswer = result.userAnswer;
          if (type === "Project") {
            // Store githubUrl and liveSite as JSON string in candidateAnswer
            candidateAnswer = JSON.stringify({
              githubUrl: answers[originalQuestion.id]?.githubUrl || "",
              liveSite: answers[originalQuestion.id]?.liveSite || ""
            });
          }
          const formatted: any = {
            questionId: result.questionId,
            question: originalQuestion.question,
            candidateAnswer,
            correctAnswer: originalQuestion.correctAnswer,
            isCorrect: result.isCorrect,
            type,
          };
          // Add options for MCQ/Mixed if present
          if (type === "MCQ" || type === "Mixed") {
            if (originalQuestion.options) {
              formatted.options = originalQuestion.options;
            }
          }
          // Add codeEvaluation for Coding/System Design
          if (type === "Coding" || type === "System Design") {
            formatted.codeEvaluation = "";
          }
          return formatted;
      });

      // Fetch candidate details to get the current work domain
      const profileRes = await axios.get("/api/candidate/getdetail");
      const candidate = profileRes.data.candidate;
      
      // Find the progress for the current domain by comparing string representations of ObjectIDs
      const currentDomainProgress = candidate?.progress?.find(
        (p: any) => p.domainId?.toString() === candidate?.workDomain?.id?.toString()
      );
      const currentRoundIndex = currentDomainProgress?.currentround ?? 0;
      
      const newRoundIndex = currentRoundIndex + 1;

      const performanceData = {
        domainId: candidate?.workDomain?.id,
        domainName: candidate?.workDomain?.name,
        roundId: exam.id,
        roundName: exam.name,
        startedAt: examStartTime,
        completedAt: completedAt,
        durationSeconds: durationSeconds,
        questions: formattedQuestions,
        totalQuestions: examResults.totalQuestions,
        correctAnswers: examResults.correctAnswers,
        percentage: examResults.percentage,
        passed: examResults.passed,
      };

      const postRes = await axios.post("/api/candidate/performance", performanceData);
      let roundId = postRes.data?.id;
      let evaluatedResults = null;
      if (roundId) {
        // Fetch the evaluated round from the backend
        const getRes = await axios.get(`/api/candidate/performance?id=${roundId}`);
        if (getRes.data && getRes.data.success && getRes.data.round) {
          evaluatedResults = getRes.data.round;
        }
      }
      if (evaluatedResults) {
        setResults(evaluatedResults);
        // Update progress only if the backend says the candidate passed and this is not a Project round
        if (!isForcedDisqualification && evaluatedResults.passed && exam.type !== "Project") {
          try {
            await axios.post("/api/candidate/progress", {
              currentround: newRoundIndex,
              currentroundname: `Round ${newRoundIndex} completed`,
            });
            toast.success("Round Passed! You have unlocked the next round.")
          } catch (error) {
            toast.error("Update Failed. There was an error updating your progress.")
          }
        }
      }
      
      if (!isForcedDisqualification) {
      toast.success("Performance Saved. Your round performance has been successfully recorded.")
      }

    } catch (error) {
      toast.error("Save Failed. There was an error saving your performance.")
    }
    // --- End of block ---

    if (examResults.passed && !isForcedDisqualification) {
      try {
        // ... existing code ...
      } catch (error) {
        toast.error("Passing Exam Error. There was an error handling the passing of this exam. Please contact support.")
      }
    }
    // Clear examQuestions for this round on submission
    if (candidateId) {
      await axios.post("/api/candidate/exam-questions", { candidateId, roundId });
    }
    setResultsLoading(false);
  }

  handleSubmitExamRef.current = handleSubmitExam;

  const getQuestionStatus = (questionIndex: number) => {
    const question = exam.questions[questionIndex]
    const hasAnswer = answers[question.id] !== undefined
    const isFlagged = flaggedQuestions.has(question.id)

    if (isFlagged) return "flagged"
    if (hasAnswer) return "answered"
    return "unanswered"
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading exam...</div>
  }

  if (fetchError) {
    return <div className="flex items-center justify-center min-h-screen text-lg text-muted-foreground">{fetchError}</div>
  }

  if (!exam) {
    return <div className="flex items-center justify-center min-h-screen">No exam data found.</div>
  }

  if (resultsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
          <span className="text-lg font-semibold text-blue-700">Evaluating your answers, please wait...</span>
        </div>
      </div>
    );
  }

  if (examCompleted && results) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        {disqualificationMessage ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {disqualificationMessage}
          </div>
        ) : null}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            {results.passed ? (
              <CheckCircle className="h-16 w-16 text-green-600" />
            ) : (
              <AlertTriangle className="h-16 w-16 text-red-600" />
            )}
          </div>
          <h2 className="text-3xl font-bold">Exam Completed!</h2>
          <p className="text-muted-foreground">Here are your results for {exam.name}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 max-w-4xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{results.percentage.toFixed(2)}%</CardTitle>
              <CardDescription>Overall Score</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={results.percentage} className="h-3" />
              <p className="text-center text-sm text-muted-foreground mt-2">
                {results.totalScore} out of {results.maxScore} points
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{results.correctAnswers}</CardTitle>
              <CardDescription>Correct Answers</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-sm text-muted-foreground">out of {results.totalQuestions} questions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{results.passed ? "PASSED" : "FAILED"}</CardTitle>
              <CardDescription>Result</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant={results.passed ? "default" : "destructive"} className="w-full justify-center">
                {results.passed ? "Congratulations!" : "Better luck next time"}
              </Badge>
            </CardContent>
          </Card>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Question-wise Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(results.questions || results.questionResults || []).map((result: any, index: number) => {
              // Helper to get option text from index or string
              const getOptionText = (val: any, options: any[]) => {
                if (val === undefined || val === null || val === "") return null;
                if (typeof val === "number" && options[val] !== undefined) return options[val];
                if (typeof val === "string") {
                  if (options.includes(val)) return val;
                  const idx = Number(val);
                  if (!isNaN(idx) && options[idx] !== undefined) return options[idx];
                  return val;
                }
                return null;
              };
              const options = exam.questions[index]?.options || [];
              const userAnswerRaw = result.userAnswer !== undefined ? result.userAnswer : result.candidateAnswer;
              const userAnswerText = getOptionText(userAnswerRaw, options);
              const correctAnswerText = getOptionText(result.correctAnswer, options);
              const isCoding = result.type === "Coding" || result.type === "System Design";
              let aiEval = null;
              if (isCoding && result.codeEvaluation) {
                try { aiEval = JSON.parse(result.codeEvaluation); } catch {}
              }
              return (
                <div key={result.questionId} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium flex items-center gap-2">
                      Question {index + 1}
                      <Badge variant="outline">
                        {result.type === "MCQ" ? <Brain className="h-3 w-3 mr-1" /> : <Code className="h-3 w-3 mr-1" />}
                        {result.type}
                      </Badge>
                    </h4>
                    {isCoding ? (
                      result.isCorrect ? (
                        <span className="flex items-center text-green-600 font-bold"><Check className="h-5 w-5 mr-1" /> Correct</span>
                      ) : (
                        <span className="flex items-center text-red-600 font-bold"><X className="h-5 w-5 mr-1" /> Incorrect</span>
                      )
                    ) : (
                      userAnswerRaw !== undefined && userAnswerRaw !== null && userAnswerRaw !== "" ? (
                        result.isCorrect ? (
                          <span className="flex items-center text-green-600 font-bold"><Check className="h-5 w-5 mr-1" /> Correct</span>
                        ) : (
                          <span className="flex items-center text-red-600 font-bold"><X className="h-5 w-5 mr-1" /> Incorrect</span>
                        )
                      ) : (
                        <span className="flex items-center text-yellow-600 font-bold"><X className="h-5 w-5 mr-1" /> Not answered</span>
                      )
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{result.question}</p>
                  {/* Project round: show links if present */}
                  {result.type === "Project" && result.candidateAnswer && (() => {
                    let links = null;
                    try {
                      const parsed = JSON.parse(result.candidateAnswer);
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
                    return links;
                  })()}
                  {isCoding && (
                    <div className="text-sm space-y-2">
                      <div><b>Your answer:</b></div>
                      <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32 mb-2">{result.candidateAnswer || "Not answered"}</pre>
                      {aiEval && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div>Correctness: <b>{aiEval.correctness ?? "-"}/10</b></div>
                            <div>Understanding: <b>{aiEval.understanding ?? "-"}/10</b></div>
                            <div>Code Quality: <b>{aiEval.quality ?? "-"}/10</b></div>
                            <div>Efficiency: <b>{aiEval.efficiency ?? "-"}/10</b></div>
                          </div>
                          <div className="mt-2">
                            <span className="font-medium">AI Feedback:</span>
                            <div className="bg-muted p-2 rounded text-xs mt-1">{aiEval.feedback ?? "No feedback"}</div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {result.type === "MCQ" && (
                    <div className="text-sm">
                      <p>
                        <b>Your answer:</b>{" "}
                        {userAnswerText
                          || (userAnswerRaw !== undefined && userAnswerRaw !== null && userAnswerRaw !== ""
                            ? String(userAnswerRaw)
                            : "Not answered")}
                      </p>
                      <p>
                        <b>Correct answer:</b> {correctAnswerText || "N/A"}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="text-center">
          <Button onClick={() => router.push("/candidate/interviews")}>Back to Interviews</Button>
        </div>
      </div>
    )
  }

  if (cooldown && cooldown.nextAvailable) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="alert alert-warning text-center my-6 bg-yellow-100 border border-yellow-300 rounded p-6 max-w-lg">
          <strong className="block text-lg mb-2">You cannot retake this round yet.</strong>
          <div>{cooldown.error}</div>
          <div className="mt-2">You can try again on: <b>{new Date(cooldown.nextAvailable).toLocaleString()}</b></div>
          <div className="mt-1">Time remaining: <b>{cooldownTimeLeft}</b></div>
        </div>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{exam.name}</CardTitle>
            <CardDescription>
              <Badge variant="outline" className="mr-2">
                {exam.type}
              </Badge>
              {exam.totalQuestions} Questions • {exam.duration} Minutes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Instructions:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {exam.type === "Project" ? (
                  <>
                    <li>• This is a project submission round.</li>
                    <li>• Upload your project as a zip file (max 100MB).</li>
                    <li>• Optionally, provide your GitHub repository URL and/or a live site link.</li>
                    <li>• You can only submit once. Please double-check your files and links before submitting.</li>
                  </>
                ) : (
                  <>
                    <li>• You have {exam.duration} minutes to complete this exam</li>
                    <li>• Questions are randomly selected from a larger question bank</li>
                    <li>• You can navigate between questions using the navigation buttons</li>
                    <li>• You can flag questions for review</li>
                    <li>• Your answers are automatically saved</li>
                    <li>• The exam will auto-submit when time runs out</li>
                    {exam.type === "MCQ" && <li>• Select the best answer for each question</li>}
                    {exam.type === "Coding" && <li>• Write clean, working code for each problem</li>}
                  </>
                )}
              </ul>
            </div>
            <div className="text-center">
              <Button onClick={handleStartExam} size="lg">
                <Play className="mr-2 h-5 w-5" />
                Start Exam
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentQ = exam.questions[currentQuestion]

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{exam.name}</h2>
            <p className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {exam.totalQuestions}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Auto-save indicator */}
            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Auto-saving
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className={`font-mono ${timeLeft < 300 ? "text-red-600" : ""}`}>{formatTime(timeLeft)}</span>
            </div>
            <Button onClick={handleSubmitExam} variant="destructive">
              Submit Exam
            </Button>
          </div>
        </div>
        <Progress value={((currentQuestion + 1) / exam.totalQuestions) * 100} className="mt-2" />
      </div>

      <div className="mb-4">
        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg px-4 py-3 text-base font-medium">
          Answer all questions carefully. Your performance in this round will determine your progress to the next stage.
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Question Navigation Sidebar */}
        <div className="w-64 border-r bg-muted/30 p-4">
          <h3 className="font-semibold mb-4">Questions</h3>
          <div className="grid grid-cols-4 gap-2">
            {exam.questions.map((question: any, index: number) => {
              const status = getQuestionStatus(index)
              return (
                <Button
                  key={index}
                  variant={currentQuestion === index ? "default" : "outline"}
                  size="sm"
                  className={`h-10 w-10 p-0 relative ${
                    status === "answered"
                      ? "bg-green-100 border-green-300"
                      : status === "flagged"
                        ? "bg-yellow-100 border-yellow-300"
                        : ""
                  }`}
                  onClick={() => setCurrentQuestion(index)}
                >
                  {index + 1}
                  {question.type === "Coding" && <Code className="h-2 w-2 absolute top-0 left-0" />}
                  {status === "flagged" && <Flag className="h-3 w-3 absolute top-0 right-0" />}
                </Button>
              )
            })}
          </div>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span>Flagged</span>
            </div>
            <div className="flex items-center gap-2">
              <Code className="h-3 w-3" />
              <span>Coding</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-6 overflow-auto">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      Question {currentQuestion + 1}
                      {currentQ.type === "Coding" ? (
                        <Code className="h-5 w-5 text-purple-600" />
                      ) : (
                        <Brain className="h-5 w-5 text-blue-600" />
                      )}
                      <Badge variant="outline">{currentQ.type}</Badge>
                    </CardTitle>
                    <CardDescription className="mt-2">{currentQ.question}</CardDescription>
                    {currentQ.description && (
                      <p className="text-sm text-muted-foreground mt-2">{currentQ.description}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFlagQuestion(currentQ.id)}
                    className={flaggedQuestions.has(currentQ.id) ? "bg-yellow-100" : ""}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentQ.type === "Project" ? (
                  <Card className="bg-blue-50/50 border-blue-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" /> Project Submission
                      </CardTitle>
                      <CardDescription>Provide relevant links below. All fields are confidential and reviewed only by interviewers.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="githubUrl" className="font-semibold flex items-center gap-2">
                          <span className="inline-block"><svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path fill="#333" d="M12 2C6.48 2 2 6.58 2 12.26c0 4.48 2.87 8.28 6.84 9.63.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.1-1.5-1.1-1.5-.9-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.38 9.38 0 0112 6.84c.85.004 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.58.69.48C19.13 20.54 22 16.74 22 12.26 22 6.58 17.52 2 12 2z"/></svg></span>
                          GitHub Repository URL
                        </Label>
                        <input
                          type="url"
                          id="githubUrl"
                          className="block w-full mt-1 border border-blue-200 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="https://github.com/your-repo"
                          value={answers[currentQ.id]?.githubUrl || ""}
                          onChange={e => handleAnswerChange(currentQ.id, {
                            ...answers[currentQ.id],
                            githubUrl: e.target.value,
                          })}
                        />
                        <p className="text-xs text-muted-foreground ml-1">Paste the link to your public GitHub repository for this project.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="liveSite" className="font-semibold flex items-center gap-2">
                          <Globe className="h-4 w-4 text-blue-500" /> Live Site Link <span className="text-xs text-muted-foreground">(optional)</span>
                        </Label>
                        <input
                          type="url"
                          id="liveSite"
                          className="block w-full mt-1 border border-blue-200 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="https://your-live-site.com"
                          value={answers[currentQ.id]?.liveSite || ""}
                          onChange={e => handleAnswerChange(currentQ.id, {
                            ...answers[currentQ.id],
                            liveSite: e.target.value,
                          })}
                        />
                        <p className="text-xs text-muted-foreground ml-1">If your project is deployed, provide the live site link here.</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : currentQ.type?.toLowerCase() === "coding" ? (
                  <Textarea
                    id="code-editor"
                    value={answers[currentQ.id] || ""}
                    onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                    placeholder="Write your code here..."
                    className="min-h-[300px] font-mono text-sm mt-2"
                  />
                ) : currentQ.type === "MCQ" ? (
                  <RadioGroup
                    value={answers[currentQ.id]?.toString() || ""}
                    onValueChange={(value) => handleAnswerChange(currentQ.id, Number.parseInt(value))}
                  >
                    {currentQ.options && currentQ.options.map((option: any, index: number) => (
                      <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                        <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                          {String.fromCharCode(65 + index)}. {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* Navigation Footer */}
          <div className="border-t p-4 bg-background">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              <div className="text-sm text-muted-foreground">
                {Object.keys(answers).length} of {exam.totalQuestions} answered
              </div>

              <Button
                onClick={() => setCurrentQuestion(Math.min(exam.totalQuestions - 1, currentQuestion + 1))}
                disabled={currentQuestion === exam.totalQuestions - 1}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
