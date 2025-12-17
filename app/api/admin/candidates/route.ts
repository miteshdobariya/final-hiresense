import { NextResponse } from "next/server"
import { connect } from "@/dbConfig/dbConfig"
import Candidate from "@/models/candidates"
import CandidateInterviewRound from "@/models/candidate_interview_rounds"
import Round from "@/models/rounds"
import Domain from "@/models/domains"
import { NextRequest } from "next/server"
import Interviewer from "@/models/interviewers"

// Add interfaces for type safety
interface DomainLean {
  _id: any;
  rounds: { roundId: any }[];
}

interface RoundLean {
  _id: any;
  roundname: string;
}

export async function GET() {
  try {
    await connect()

    const allCandidates = await Candidate.find({ role: "candidate" }).lean()
    const allRounds = await Round.find({}).lean()

    // Collect all assigned interviewer IDs
    const interviewerIds = allCandidates
      .map(c => c.assignedInterviewer?.interviewerId)
      .filter(Boolean)
      .map(id => id.toString());
    const uniqueInterviewerIds = Array.from(new Set(interviewerIds));

    // Fetch interviewer names
    let interviewerMap: { [key: string]: string } = {};
    if (uniqueInterviewerIds.length) {
      const interviewers = await Interviewer.find({ _id: { $in: uniqueInterviewerIds } }).lean();
      interviewers.forEach(i => {
        interviewerMap[(i._id as string)] = i.name || i.email;
      });
    }

    // Collect all assigned admin IDs from assignedRounds
    const adminIds = allCandidates
      .flatMap(c => (Array.isArray(c.assignedRounds) ? c.assignedRounds : [])
        .filter(r => r.assignedToModel === 'admins' && r.assignedTo)
        .map(r => r.assignedTo.toString())
      );
    const uniqueAdminIds = Array.from(new Set(adminIds));

    // Fetch admin names
    let adminMap: { [key: string]: string } = {};
    if (uniqueAdminIds.length) {
      const admins = await Candidate.find({ _id: { $in: uniqueAdminIds }, role: 'admin' }).lean();
      admins.forEach(a => {
        adminMap[(a._id as string)] = a.username || a.name || a.email;
      });
    }

    const formattedCandidates = await Promise.all(
      allCandidates.map(async (candidate) => {
        // --- Get Performance Data ---
        const activeDomainId = candidate.workDomain?.id?.toString()
        const performances = await CandidateInterviewRound.find({ candidateId: candidate._id, domainId: activeDomainId }).lean()

        // --- Calculate Average Score for current domain only ---
        let averageScore = 0
        if (performances.length > 0) {
          const totalScore = performances.reduce((acc: number, p: any) => acc + (p.percentage || 0), 0)
          averageScore = Math.round(totalScore / performances.length)
        }

        // --- Determine Current Round from Progress array ---
        let roundsCleared = 0;
        let totalRounds = 0;
        let currentRoundName = "Registered";
        if (activeDomainId) {
          const domain = await Domain.findById(activeDomainId).lean() as DomainLean | null;
          if (domain && Array.isArray(domain.rounds) && domain.rounds.length > 0) {
            totalRounds = domain.rounds.length;
            const progress = Array.isArray(candidate.progress)
              ? candidate.progress.find((p: any) => p.domainId?.toString() === activeDomainId)
              : null;
            const clearedRounds = Array.isArray(progress?.clearedRounds)
              ? progress.clearedRounds.map((id: any) => id.toString())
              : [];
            roundsCleared = clearedRounds.length;
            // Find the next round in sequence not cleared
            const nextRound = domain.rounds.find((r: any) => !clearedRounds.includes(r.roundId.toString()));
            if (nextRound) {
              // You may want to fetch the round name from the Round model if needed
              const roundDoc = await Round.findById(nextRound.roundId).lean() as RoundLean | null;
              currentRoundName = roundDoc?.roundname || "-";
            } else if (totalRounds > 0 && roundsCleared >= totalRounds) {
              currentRoundName = "Completed";
            }
          }
        }

        // Determine assigned person name
        let assignedPersonName = null;
        if (candidate.assignedInterviewer && candidate.assignedInterviewer.interviewerId) {
          assignedPersonName = interviewerMap[candidate.assignedInterviewer.interviewerId?.toString()] || null;
        } else if (Array.isArray(candidate.assignedRounds) && candidate.assignedRounds.length > 0) {
          // Get the latest assigned round
          const latestRound = candidate.assignedRounds[candidate.assignedRounds.length - 1];
          if (latestRound.assignedToModel === 'admins' && latestRound.assignedTo) {
            assignedPersonName = adminMap[latestRound.assignedTo.toString()] || null;
          }
        }
        return {
          id: String(candidate._id),
          name: candidate.username || "Candidate",
          email: candidate.email,
          createdAt: candidate.createdAt, // Pass the creation date
          lastLogin: candidate.lastLogin, // Add lastLogin
          score: averageScore,
          currentRound: currentRoundName,
          roundsCleared,
          totalRounds,
          workDomain: {
            name: candidate.workDomain?.name || "N/A",
          },
          assignedInterviewer: candidate.assignedInterviewer
            ? {
                ...candidate.assignedInterviewer,
                name: interviewerMap[candidate.assignedInterviewer.interviewerId?.toString()] || null
              }
            : null,
          assignedRounds: candidate.assignedRounds || [],
          assignedPersonName, // <-- Add this field
          status: candidate.status, // Add status field
        }
      })
    )

    return NextResponse.json({ candidates: formattedCandidates })
  } catch (error: any) {
    console.error("Error fetching candidates:", error)
    return NextResponse.json({ error: "Failed to fetch candidates", details: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connect();
    const body = await req.json();
    const { candidateId, roundNumber, feedbackData, status, finalnote } = body;
    if (!candidateId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // If roundNumber and feedbackData are provided, update round feedback as before
    if (roundNumber && feedbackData) {
      const adminRounds = candidate.assignedRounds.filter((r: any) => r.assignedToModel === "admins");
      const round = adminRounds[adminRounds.length - 1];
      if (!round) {
        return NextResponse.json({ error: "Admin round not found" }, { status: 404 });
      }
      round.feedback = JSON.stringify(feedbackData);
      round.status = "completed";
      round.responseSubmitted = true;
    }

    // Update candidate status if provided
    if (status) {
      candidate.status = status;
    }
    // Update finalnote if provided
    if (typeof finalnote === "string") {
      candidate.finalnote = finalnote;
    }

    await candidate.save();
    return NextResponse.json({ message: "Candidate updated successfully", success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error in admin review PATCH:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
