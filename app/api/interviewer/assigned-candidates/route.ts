import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { connect } from "@/dbConfig/dbConfig"
import Interviewer from "@/models/interviewers"
import Candidate from "@/models/candidates"

export async function GET(req: NextRequest) {
  try {
    await connect()
    
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user._id

    // Find interviewer by userId
    const interviewer = await Interviewer.findOne({ userId }).lean() as any
    
    if (!interviewer) {
      // Return empty list with success if no interviewer profile found
      return NextResponse.json({
        message: "No assigned candidates",
        assignedCandidates: [],
        interviewerStats: {
          totalAssigned: 0,
          activeInterviews: 0,
          completedInterviews: 0,
          status: null
        },
        success: true,
      }, { status: 200 })
    }

    // Get assigned candidates with detailed information
    const assignedCandidates = await Promise.all(
      interviewer.assignedCandidates.map(async (assignment: any) => {
        // Get candidate details
        const candidate = await Candidate.findById(assignment.candidateId).lean() as any
        
        return {
          id: assignment.candidateId,
          name: assignment.candidateName,
          email: assignment.candidateEmail,
          workDomain: assignment.workDomain,
          status: assignment.status,
          assignedAt: assignment.assignedAt,
          currentRound: assignment.currentRound,
          totalRounds: assignment.totalRounds,
          lastActivity: assignment.lastActivity,
          notes: assignment.notes,
          interviewRounds: assignment.interviewRounds || [],
          // Additional candidate details
          phone: candidate?.phonenumber,
          skills: candidate?.skills || [],
          progress: candidate?.progress || [],
          avatar: `/placeholder.svg?height=40&width=40`, // You can add avatar field to candidates later
          // Include assignedRounds for interview schedule details
          assignedRounds: candidate?.assignedRounds || [],
        }
      })
    )

    return NextResponse.json({
      message: "Assigned candidates retrieved successfully",
      assignedCandidates,
      interviewerStats: {
        totalAssigned: interviewer.assignedCandidates.length,
        activeInterviews: interviewer.assignedCandidates.filter((a: any) => ["assigned", "in-progress"].includes(a.status)).length,
        completedInterviews: interviewer.assignedCandidates.filter((a: any) => a.status === "completed").length,
        status: interviewer.status
      },
      success: true,
    }, { status: 200 })

  } catch (error: any) {
    console.error("Error in assigned candidates route:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connect();
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user._id;
    const { candidateId, roundId, feedbackData } = await req.json();
    // feedbackData: { decision, text, ratings }

    if (!candidateId || !feedbackData || !feedbackData.decision) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Update assignedRounds for the candidate
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }
    const round = candidate.assignedRounds.id(roundId);
    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }
    round.status = "completed";
    round.responseSubmitted = true;
    round.feedback = JSON.stringify(feedbackData);

    // 2. Update candidate status
    if (feedbackData.decision === "pass") {
      candidate.status = "waiting-for-admin-assignment";
    } else if (feedbackData.decision === "reject") {
      candidate.status = "rejected";
    }
    await candidate.save();

    // 3. Update interviewer stats and assignment
    const interviewer = await Interviewer.findOne({ "assignedCandidates.candidateId": candidateId });
    if (interviewer) {
      const assignment = interviewer.assignedCandidates.find((a: any) => a.candidateId.toString() === candidateId);
      if (assignment) {
        assignment.status = "completed";
        assignment.lastActivity = new Date();
      }
      // interviewer.activeInterviews = interviewer.assignedCandidates.filter((a: any) =>
      //   ["assigned", "in-progress"].includes((a as any).status)
      // ).length;
      // interviewer.completedInterviews = interviewer.assignedCandidates.filter((a: any) =>
      //   (a as any).status === "completed"
      // ).length;
      await interviewer.save();
    }

    return NextResponse.json({
      message: "Review submitted and statuses updated successfully",
      success: true,
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error in update assignment status route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 

// POST: Generate follow-up questions based on previous rounds' answers
export async function POST(req: NextRequest) {
  try {
    await connect();
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { candidateId, domainName, limit = 8 } = await req.json();
    if (!candidateId || !domainName) {
      return NextResponse.json({ error: "candidateId and domainName are required" }, { status: 400 });
    }

    // Load previous rounds and answers for this candidate and domain
    const CandidateInterviewRound = (await import("@/models/candidate_interview_rounds")).default as any;

    const rounds = await CandidateInterviewRound.find({ candidateId, domainName })
      .sort({ completedAt: -1 })
      .lean();

    const answers: Array<{ question: string; candidateAnswer?: string; isCorrect?: boolean; type?: string; codeEvaluation?: string }> = [];
    for (const r of rounds) {
      for (const q of r.questions || []) {
        answers.push({
          question: q.question,
          candidateAnswer: q.candidateAnswer,
          isCorrect: q.isCorrect,
          type: q.type,
          codeEvaluation: q.codeEvaluation,
        });
      }
    }

    // Heuristic follow-up generation without external AI: craft prompts based on incorrect/weak answers
    const suggestions: string[] = [];
    for (const a of answers) {
      if (!a.candidateAnswer) {
        suggestions.push(`You skipped a question: "${a.question}". Can you walk me through how you would approach it now?`);
        continue;
      }
      if (a.type === "MCQ") {
        if (a.isCorrect === false) {
          suggestions.push(`Earlier you chose an incorrect option for: "${a.question}". Explain your reasoning and what trade-offs you considered.`);
        } else {
          suggestions.push(`For: "${a.question}", explain why the other options were not optimal and when they might be correct.`);
        }
      } else {
        // Coding / Project
        if (a.codeEvaluation) {
          try {
            const evalObj = JSON.parse(a.codeEvaluation);
            if (typeof evalObj.efficiency === 'number' && evalObj.efficiency < 7) {
              suggestions.push(`Your solution for "${a.question}" could be more efficient. How would you improve time and space complexity?`);
            }
            if (typeof evalObj.quality === 'number' && evalObj.quality < 7) {
              suggestions.push(`Discuss how you would refactor your solution for "${a.question}" to improve readability and maintainability.`);
            }
            if (evalObj.feedback) {
              suggestions.push(`Regarding "${a.question}": ${evalObj.feedback}. Can you elaborate and address these points?`);
            }
          } catch {
            suggestions.push(`For your earlier solution to "${a.question}", explain your design choices and alternatives.`);
          }
        } else {
          suggestions.push(`For your earlier solution to "${a.question}", explain your design choices and alternatives.`);
        }
      }
      if (suggestions.length >= limit) break;
    }

    // Fallback if no prior data
    if (suggestions.length === 0) {
      suggestions.push(`Start with fundamentals in ${domainName}: ask the candidate to explain core concepts and real-world trade-offs.`);
    }

    return NextResponse.json({ success: true, suggestions: suggestions.slice(0, limit) });
  } catch (error) {
    console.error("Error generating follow-up suggestions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}