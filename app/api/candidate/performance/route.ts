import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { connect } from "@/dbConfig/dbConfig";
import CandidateInterviewRound from "@/models/candidate_interview_rounds";
import candidates from "@/models/candidates";

async function evaluateWithAI(question: string, code: string): Promise<string> {
  const prompt = `
You are a senior technical interviewer responsible for evaluating code submissions from candidates.
If the candidate's answer is empty, blank, or does not address the question at all, assign 0 marks for all criteria and explain that the answer is missing or irrelevant.

Please analyze the candidate's code in response to the given question. Assess it across the following four criteria, each on a scale from 0 to 10:

1. **Correctness** – Does the code produce the correct output and handle edge cases?
2. **Understanding** – Does the solution demonstrate a solid grasp of the problem and its constraints?
3. **Code Quality** – Is the code clean, well-structured, and maintainable? Consider naming, formatting, and logical organization.
4. **Efficiency** – Is the solution efficient in terms of time and space complexity?

Then, provide a brief overall **feedback** paragraph (1-3 sentences) explaining your evaluation and suggesting improvements if applicable.

Finally, generate **2-3 follow-up questions** that an interviewer can ask the candidate during a live interview. These questions should be based on:
- The candidate's specific code implementation
- Areas where they might need improvement
- Alternative approaches they could discuss
- Edge cases they might have missed
- Time/space complexity of their solution
- How they would optimize their code

---

**Problem:**
${question}

**Candidate's Code:**
${code}

---

Please respond strictly in the following JSON format:

{
  "correctness": number,
  "understanding": number,
  "quality": number,
  "efficiency": number,
  "feedback": "string",
  "followUpQuestions": [
    "Question 1 for interviewer to ask",
    "Question 2 for interviewer to ask", 
    "Question 3 for interviewer to ask"
  ]
}
`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY || ""}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    });

    const data: any = await res.json();

    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error("[Groq] Invalid response payload:", data);
      return JSON.stringify({
        feedback: "AI evaluation failed.",
        followUpQuestions: [
          "Can you explain the time complexity of your solution?",
          "How would you handle edge cases in your code?",
          "What alternative approaches could you consider?",
        ],
      });
    }

    const aiText = data.choices[0].message.content as string | null | undefined;
    try {
      return JSON.stringify(JSON.parse(aiText ?? ""));
    } catch (jsonErr: any) {
      console.error("[Groq] Failed to parse AI response as JSON:", aiText, jsonErr);
      return JSON.stringify({ 
        feedback: aiText ?? "",
        followUpQuestions: [
          "Can you explain the time complexity of your solution?",
          "How would you handle edge cases in your code?",
          "What alternative approaches could you consider?"
        ]
      });
    }
  } catch (err: any) {
    console.error("[Groq] API call failed:", err);
    return JSON.stringify({ 
      feedback: 'AI evaluation failed.',
      followUpQuestions: [
        "Can you explain the time complexity of your solution?",
        "How would you handle edge cases in your code?",
        "What alternative approaches could you consider?"
      ]
    });
  }
}

export async function POST(req: NextRequest) {
  await connect();
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user._id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const candidateId = session.user._id;
  try {
    const body = await req.json();
    // Expect all necessary fields in body
    const {
      domainId,
      domainName,
      roundId,
      roundName,
      startedAt,
      completedAt,
      durationSeconds,
      questions,
      feedback,
    } = body;
    if (!domainId || !domainName || !roundId || !roundName || !startedAt || !completedAt || !questions) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    // Ensure each question has question text, answer, correctness, etc.
    let correctAnswers = 0;
    const formattedQuestions = await Promise.all(questions.map(async (q: any) => {
      let codeEvaluation = q.codeEvaluation;
      let isCorrect = q.isCorrect;
      let followUpQuestions = [];
      
      if (q.type === "Coding" || q.type === "System Design") {
        codeEvaluation = await evaluateWithAI(q.question, q.candidateAnswer);
        // Parse the AI evaluation and determine correctness
        try {
          const evalObj = JSON.parse(codeEvaluation);
          if (
            typeof evalObj.correctness === 'number' && evalObj.correctness > 5 &&
            typeof evalObj.understanding === 'number' && evalObj.understanding > 5 &&
            typeof evalObj.quality === 'number' && evalObj.quality > 5 &&
            typeof evalObj.efficiency === 'number' && evalObj.efficiency > 5
          ) {
            isCorrect = true;
          } else {
            isCorrect = false;
          }
          // Extract follow-up questions
          followUpQuestions = evalObj.followUpQuestions || [];
        } catch {
          isCorrect = false;
          followUpQuestions = [
            "Can you explain the time complexity of your solution?",
            "How would you handle edge cases in your code?",
            "What alternative approaches could you consider?"
          ];
        }
      }
      // For project rounds, always mark as correct
      if (q.type === "Project") {
        isCorrect = true;
      }
      
      if (isCorrect) correctAnswers++;
      return {
        questionId: q.questionId,
        question: q.question, // text
        candidateAnswer: q.candidateAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        type: q.type,
        options: q.options,
        codeEvaluation,
        followUpQuestions,
      };
    }));
    const totalQuestions = formattedQuestions.length;
    // Determine if this is a coding round (all questions are Coding or System Design)
    const isCodingRound = formattedQuestions.every(q => q.type === "Coding" || q.type === "System Design");
    const isProjectRound = formattedQuestions.every(q => q.type === "Project");
    let percentage = 0;
    let passed = false;
    if (isProjectRound) {
      // No passing/failing for project rounds; always mark as passed, percentage 0
      percentage = 0;
      passed = true;
    } else if (isCodingRound) {
      // Calculate average of all criteria for each question, then average across questions
      let totalCriteriaScore = 0;
      let criteriaCount = 0;
      formattedQuestions.forEach(q => {
        if (q.type === "Coding" || q.type === "System Design") {
          try {
            const evalObj = JSON.parse(q.codeEvaluation || "{}");
            const c = Number(evalObj.correctness) || 0;
            const u = Number(evalObj.understanding) || 0;
            const ql = Number(evalObj.quality) || 0;
            const e = Number(evalObj.efficiency) || 0;
            totalCriteriaScore += c + u + ql + e;
            criteriaCount += 4;
          } catch {}
        }
      });
      percentage = criteriaCount > 0 ? (totalCriteriaScore / criteriaCount) * 100 / 10 : 0;
      passed = percentage >= 60;
    } else {
      // Fallback to previous logic for non-coding rounds
      percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
      passed = percentage >= 60;
    }
    const doc = await CandidateInterviewRound.create({
      candidateId,
      domainId,
      domainName,
      roundId,
      roundName,
      startedAt,
      completedAt,
      durationSeconds,
      questions: formattedQuestions,
      totalQuestions,
      correctAnswers,
      percentage,
      passed,
      feedback,
    });

    // Add roundId to candidate.progress[domain].clearedRounds if passed (for all round types, including Project)
    if (passed) {
      const CandidateModel = (await import('@/models/candidates')).default;
      const candidate = await CandidateModel.findById(candidateId);
      if (candidate) {
        const progress = candidate.progress.find((p: any) => p.domainId?.toString() === domainId.toString());
        if (progress && !progress.clearedRounds.some((id: any) => id.toString() === roundId.toString())) {
          progress.clearedRounds.push(roundId);
          await candidate.save();
        }
      }
    }
    return NextResponse.json({ success: true, id: doc._id });
  } catch (error: any) {
    console.error("Performance API Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  await connect();
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user._id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const candidateId = session.user._id;
  try {
    const candidate = await candidates.findById(candidateId).lean();
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // Global freeze check (e.g., proctoring disqualification)
    if (candidate.freezeUntil) {
      const now = new Date();
      const freezeUntil = new Date(candidate.freezeUntil);
      if (freezeUntil.getTime() > now.getTime()) {
        return NextResponse.json({
          success: false,
          error: `Your exam access is frozen until ${freezeUntil.toLocaleString()}.`,
          nextAvailable: freezeUntil,
          freeze: true,
        });
      }
    }

    const { searchParams } = new URL(req.url);
    const roundId = searchParams.get("roundId");
    const resultId = searchParams.get("id");
    // --- Freezing period logic ---
    const FREEZING_PERIOD_DAYS = parseFloat(process.env.FREEZING_PERIOD_DAYS || "1");
    if (roundId) {
      // Fetch all attempts for this candidate and round, sorted by completion date descending
      const allAttempts = await CandidateInterviewRound.find({ candidateId, roundId }).sort({ completedAt: -1 }).lean();
      if (!allAttempts || allAttempts.length === 0) {
        return NextResponse.json({ success: false, error: "No result found." });
      }
      // Try to find the most recent PASSED attempt
      const lastPassed = allAttempts.find(r => r.passed);
      if (lastPassed) {
        return NextResponse.json({ success: true, round: lastPassed });
      }
      // If no passed attempt, check freezing period for the most recent failed attempt
      const lastFailed = allAttempts.find(r => !r.passed);
      if (lastFailed && lastFailed.completedAt) {
        const now = new Date();
        const lastFailedTime = new Date(lastFailed.completedAt);
        const msSinceFail = now.getTime() - lastFailedTime.getTime();
        const msFreezingPeriod = FREEZING_PERIOD_DAYS * 24 * 60 * 60 * 1000;
        if (msSinceFail < msFreezingPeriod) {
          const nextAvailable = new Date(lastFailedTime.getTime() + msFreezingPeriod);
          return NextResponse.json({
            success: false,
            error: `You can retake this round after ${nextAvailable.toLocaleString()}.`,
            nextAvailable,
            round: lastFailed
          });
        }
      }
      // If freezing period has passed or no failed attempt, allow retake and return the most recent failed attempt
      return NextResponse.json({ success: true, round: allAttempts[0] });
    }
    if (resultId) {
      // Fetch the candidate's result by the result document _id
      const roundResult = await CandidateInterviewRound.findOne({ _id: resultId, candidateId }).lean();
      if (!roundResult) {
        return NextResponse.json({ success: false, error: "No result found." });
      }
      return NextResponse.json({ success: true, round: roundResult });
    }
    // Fetch candidate profile (re-use already loaded candidate)
    const candidateProfile = await import('@/models/candidates').then(m => m.default.findById(candidateId));
    if (!candidateProfile) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }
    // Get active domain
    const activeDomainId = candidate.workDomain?.id;
    if (!activeDomainId) {
      return NextResponse.json({ error: "Candidate has no active work domain set." }, { status: 400 });
    }
    // Fetch current domain rounds (ordered)
    const domain = await import('@/models/domains').then(m => m.default.findById(activeDomainId));
    if (!domain || !domain.rounds || domain.rounds.length === 0) {
      return NextResponse.json({ error: "No rounds found for domain." }, { status: 404 });
    }
    // Fetch all completed rounds for candidate from per-domain clearedRounds
    const progress = candidate.progress.find((p: any) => p.domainId?.toString() === activeDomainId.toString());
    const completedRoundIds = (progress?.clearedRounds || []).map((id: any) => id.toString());
    // Find the next eligible round in the current order
    let nextRound = null;
    for (const round of domain.rounds.sort((a: any, b: any) => a.sequence - b.sequence)) {
      if (!completedRoundIds.includes(round.roundId.toString())) {
        nextRound = round;
        break;
      }
    }
    return NextResponse.json({ success: true, nextRound });
  } catch (error: any) {
    console.error("Next eligible round API Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// New endpoint to get freezing period days
export async function freezingPeriodDaysHandler(req: NextRequest) {
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
  const FREEZING_PERIOD_DAYS = parseFloat(process.env.FREEZING_PERIOD_DAYS || '1');
  return NextResponse.json({ days: FREEZING_PERIOD_DAYS });
} 