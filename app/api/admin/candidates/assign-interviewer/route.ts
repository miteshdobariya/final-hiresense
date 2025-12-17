import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { connect } from "@/dbConfig/dbConfig"
import Candidate from "@/models/candidates"
import Interviewer from "@/models/interviewers"

// Type definitions for better type safety
interface CandidateDocument {
  _id: string
  username?: string
  email: string
  workDomain?: {
    name?: string
  }
  progress?: any[]
  assignedInterviewer?: {
    interviewerId: string
    assignedAt: Date
    assignedBy: string
    status: string
  }
}

interface InterviewerDocument {
  _id: string
  status: string
  assignedCandidates?: Array<{
    candidateId: string
    candidateName: string
    candidateEmail: string
    workDomain: string
    assignedAt: Date
    assignedBy: string
    status: string
    currentRound: number
    totalRounds: number
    lastActivity?: Date
    notes: string
    interviewRounds: any[]
  }>
}

export async function POST(req: NextRequest) {
  try {
    await connect()
    
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !["admin", "hr"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { candidateId, assigneeId, assigneeType, notes, date, time, duration, type } = body

    if (!candidateId || !assigneeId || !assigneeType) {
      console.log("[ASSIGNMENT EMAIL] Early return: missing required fields", { candidateId, assigneeId, assigneeType });
      return NextResponse.json({ 
        error: "Missing required fields: candidateId, assigneeId, and assigneeType are required" 
      }, { status: 400 })
    }

    // Check if candidate exists
    const candidate = await Candidate.findById(candidateId).lean() as any
    if (!candidate) {
      console.log("[ASSIGNMENT EMAIL] Early return: candidate not found", { candidateId });
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }

    // Check if assignee exists and is active (if interviewer)
    let assignee = null;
    if (assigneeType === "interviewers") {
      let assigneeRaw = await Interviewer.findById(assigneeId).lean();
      assignee = Array.isArray(assigneeRaw) ? assigneeRaw[0] : assigneeRaw;
      if (!assignee) {
        console.log("[ASSIGNMENT EMAIL] Early return: interviewer not found", { assigneeId });
        return NextResponse.json({ error: "Interviewer not found" }, { status: 404 })
      }
      if (assignee.status !== "Active") {
        console.log("[ASSIGNMENT EMAIL] Early return: interviewer not active", { assigneeId });
        return NextResponse.json({ error: "Interviewer is not active. Please activate the interviewer first." }, { status: 400 })
      }
    } else if (assigneeType === "admins" || assigneeType === "admin") {
      let assigneeRaw = await Candidate.findById(assigneeId).lean();
      assignee = Array.isArray(assigneeRaw) ? assigneeRaw[0] : assigneeRaw;
      if (!assignee) {
        console.log("[ASSIGNMENT EMAIL] Early return: admin not found", { assigneeId });
        return NextResponse.json({ error: "Admin not found" }, { status: 404 })
      }
    }
    // (Optional: add admin check if you have a separate Admins model)

    // Add debug log before assignee/candidate check
    console.log("[ASSIGNMENT EMAIL] Debug: about to check assignee and candidate", { assignee, candidate });

    // Remove any previous assignment in assignedRounds for this candidate (optional, for single active assignment)
    await Candidate.findByIdAndUpdate(candidateId, {
      $pull: { assignedRounds: { status: "assigned" } }
    });

    // Set status based on assigneeType
    let newStatus = assigneeType === "interviewers" ? "assigned-interviewer" : "assigned-admin";

    // Update candidate with assignment
    await Candidate.findByIdAndUpdate(
      candidateId,
      {
        status: newStatus,
        assignedInterviewer: assigneeType === "interviewers" ? {
          interviewerId: assigneeId,
          assignedAt: new Date(),
          assignedBy: session.user._id,
          status: "assigned"
        } : undefined
      },
      { new: true }
    )

    // Add to assignedRounds
    await Candidate.findByIdAndUpdate(
      candidateId,
      {
        $push: {
          assignedRounds: {
            roundNumber: 1, // or determine dynamically
            assignedTo: assigneeId,
            assignedToModel: assigneeType,
            assignedAt: new Date(),
            assignedBy: session.user._id,
            scheduledDate: date,
            scheduledTime: time,
            durationMinutes: duration,
            interviewFormat: type,
            status: "assigned",
            feedback: "",
            responseSubmitted: false
          }
        }
      },
      { new: true }
    )

    // If interviewer, remove candidate from previous interviewer's assignedCandidates (if reassigned)
    if (assigneeType === "interviewers") {
      // Find previous interviewer assignment
      const prevAssignment = candidate.assignedInterviewer?.interviewerId;
      if (prevAssignment && prevAssignment !== assigneeId) {
        console.log(`[POST] Removing candidate ${candidateId} from previous interviewer ${prevAssignment}`);
        await Interviewer.findByIdAndUpdate(
          prevAssignment,
          { $pull: { assignedCandidates: { candidateId } } }
        );
      }
      // Add candidate to new interviewer's assignedCandidates
      await Interviewer.findByIdAndUpdate(
        assigneeId,
        {
          $push: {
            assignedCandidates: {
              candidateId,
              candidateName: candidate.username || candidate.email,
              candidateEmail: candidate.email,
              workDomain: candidate.workDomain?.name || "Not specified",
              assignedAt: new Date(),
              assignedBy: session.user._id,
              status: "assigned",
              currentRound: 0,
              totalRounds: candidate.progress?.length || 0,
              lastActivity: new Date(),
              notes: notes || "",
              interviewRounds: []
            }
          },
          $inc: { activeInterviews: 1 }
        },
        { new: true }
      )
    }

    // After all DB updates succeed, send email to assigned person (interviewer or admin)
    try {
      if (assignee && candidate) {
        const emailPayload = {
          type: "assignment-notification",
          to: assignee.email,
          assigneeName: assignee.name || assignee.email,
          assigneeRole: assigneeType === "interviewers" ? "Interviewer" : "Admin",
          candidateName: candidate.username || candidate.email,
          candidateEmail: candidate.email,
          interviewDate: date,
          interviewTime: time,
          duration: duration,
          interviewFormat: type,
          timeZone: "IST",
          assignedBy: session.user.name || session.user.email
        };
        await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailPayload)
        });

        // Send email to candidate as well
        const candidateEmailPayload = {
          type: "candidate-assignment",
          to: candidate.email,
          candidateName: candidate.username || candidate.email,
          interviewerName: assignee.name || assignee.email,
          interviewDate: date,
          interviewTime: time,
          duration: duration,
          interviewFormat: type,
          timeZone: "IST"
        };
        await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(candidateEmailPayload)
        });
      }
    } catch (emailError) {
      console.error("[ASSIGNMENT EMAIL] Failed to send assignment notification email:", emailError);
    }

    return NextResponse.json({
      message: `${assigneeType === "interviewers" ? "Interviewer" : "Admin"} assigned successfully`,
      success: true,
    }, { status: 200 })

  } catch (error: any) {
    console.error("Error in assign route:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connect()
    
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !["admin", "hr"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const candidateId = searchParams.get("candidateId")
    const interviewerId = searchParams.get("interviewerId")

    if (!candidateId || !interviewerId) {
      return NextResponse.json({ 
        error: "Missing required parameters: candidateId and interviewerId" 
      }, { status: 400 })
    }

    // Remove assignment from candidate
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      candidateId,
      {
        $unset: { assignedInterviewer: 1 }
      },
      { new: true }
    )

    // Remove candidate from interviewer's assigned candidates array
    const updatedInterviewer = await Interviewer.findOneAndUpdate(
      { "assignedCandidates.candidateId": candidateId },
      { $pull: { assignedCandidates: { candidateId } } },
      { new: true }
    );
    // Update activeInterviews count if interviewer found
    if (updatedInterviewer) {
      const activeCount = updatedInterviewer.assignedCandidates.filter(
        (assignment: any) => ['assigned', 'in-progress'].includes(assignment.status)
      ).length;
      await Interviewer.findByIdAndUpdate(updatedInterviewer._id, {
        activeInterviews: activeCount
      });
    }

    return NextResponse.json({
      message: "Interviewer assignment removed successfully",
      success: true,
    }, { status: 200 })

  } catch (error: any) {
    console.error("Error in remove interviewer assignment route:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  console.log('[PATCH] /api/admin/candidates/assign-interviewer called');
  try {
    await connect()
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !["admin", "hr"].includes(session.user.role)) {
      console.log('[PATCH] Unauthorized or missing session');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const body = await req.json()
    const { candidateId, newAssigneeId, role, date, time, duration, type, action, roundNumber } = body
    console.log('[PATCH] Body:', body);
    if (!candidateId || !role) {
      console.log('[PATCH] Missing required fields');
      return NextResponse.json({ error: "Missing required fields: candidateId and role are required" }, { status: 400 })
    }
    // Check if candidate exists
    const candidate = await Candidate.findById(candidateId).lean() as any
    if (!candidate) {
      console.log('[PATCH] Candidate not found:', candidateId);
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }
    let assignedRounds = candidate.assignedRounds || [];
    // --- Unassignment logic ---
    if (action === 'unassign' && roundNumber) {
      console.log('[PATCH] Unassign logic triggered');
      const before = assignedRounds.length;
      assignedRounds = assignedRounds.filter((r: any) => !(r.roundNumber === roundNumber && r.assignedToModel === role));
      if (assignedRounds.length === before) {
        console.log('[PATCH] No such assignment to unassign');
        return NextResponse.json({ error: "No such assignment to unassign." }, { status: 404 })
      }
      // Determine candidate status after unassignment
      // Fetch candidate's progress for the current work domain
      const candidateDocRaw = await Candidate.findById(candidateId).lean();
      const candidateDoc = Array.isArray(candidateDocRaw) ? candidateDocRaw[0] : candidateDocRaw;
      let newStatus = "in-progress";
      let currentround = null;
      let totalRounds = null;
      if (candidateDoc && candidateDoc.workDomain && candidateDoc.progress) {
        const activeDomainId = candidateDoc.workDomain.id?.toString();
        const progress = candidateDoc.progress.find((p: any) => p.domainId?.toString() === activeDomainId);
        if (progress) {
          currentround = progress.currentround;
          // Fetch total rounds for the domain
          const domainRaw = await import("@/models/domains").then(m => m.default.findById(activeDomainId).lean());
          const domain = Array.isArray(domainRaw) ? domainRaw[0] : domainRaw;
          totalRounds = domain?.rounds?.length || 0;
          if (progress.currentround >= totalRounds && totalRounds > 0) {
            newStatus = "waiting-for-assignment";
          }
        }
      }
      // Debug log
      console.log({ currentround, totalRounds, newStatus });
      await Candidate.findByIdAndUpdate(candidateId, { assignedRounds, status: newStatus, $unset: { assignedInterviewer: 1 } });
      // Also remove candidate from interviewer's assignedCandidates array
      await Interviewer.findOneAndUpdate(
        { "assignedCandidates.candidateId": candidateId },
        { $pull: { assignedCandidates: { candidateId } } }
      );
      // Send unassignment email to candidate
      try {
        const unassignmentEmailPayload = {
          type: "candidate-unassignment",
          to: candidate.email,
          candidateName: candidate.username || candidate.email
        };
        await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(unassignmentEmailPayload)
        });
      } catch (emailError) {
        console.error("[UNASSIGNMENT EMAIL] Failed to send candidate unassignment email:", emailError);
      }
      return NextResponse.json({ message: `Unassigned ${role} from round ${roundNumber}.`, success: true }, { status: 200 });
    }
    // --- Reassignment logic ---
    if (action === 'reassign' && roundNumber && newAssigneeId) {
      console.log('[PATCH] Reassign logic triggered');
      let found = false;
      let previousAssigneeId = null;
      let previousAssigneeModel = null;
      assignedRounds = assignedRounds.map((r: any) => {
        if (r.roundNumber === roundNumber && r.assignedToModel === role) {
          found = true;
          previousAssigneeId = r.assignedTo;
          previousAssigneeModel = r.assignedToModel;
          return {
            ...r,
            assignedTo: newAssigneeId,
            assignedAt: new Date(),
            scheduledDate: date,
            scheduledTime: time,
            durationMinutes: duration,
            interviewFormat: type,
            status: "assigned"
          };
        }
        return r;
      });
      if (!found) {
        console.log('[PATCH] No such assignment to reassign');
        return NextResponse.json({ error: "No such assignment to reassign." }, { status: 404 })
      }
      await Candidate.findByIdAndUpdate(candidateId, { assignedRounds });
      // Remove candidate from previous interviewer's assignedCandidates if role is interviewers
      if (role === "interviewers" && previousAssigneeId && previousAssigneeId !== newAssigneeId) {
        console.log(`[REASSIGN] Removing candidate ${candidateId} from previous interviewer ${previousAssigneeId}`);
        const result = await Interviewer.findByIdAndUpdate(
          previousAssigneeId,
          { $pull: { assignedCandidates: { candidateId } } }
        );
        console.log(`[REASSIGN] Result of $pull from interviewer ${previousAssigneeId}:`, result);
      }
      // Add candidate to new interviewer's assignedCandidates if role is interviewers
      if (role === "interviewers" && newAssigneeId) {
        // Fetch candidate details for assignment
        const candidateDoc = await Candidate.findById(candidateId).lean();
        if (!candidateDoc) {
          return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
        }
        const candidateObj: any = candidateDoc; // Explicitly type as any to avoid TS property errors
        console.log(`[REASSIGN] Adding candidate ${candidateId} to new interviewer ${newAssigneeId}`);
        await Interviewer.findByIdAndUpdate(
          newAssigneeId,
          {
            $push: {
              assignedCandidates: {
                candidateId,
                candidateName: candidateObj.username || candidateObj.email,
                candidateEmail: candidateObj.email,
                workDomain: candidateObj.workDomain?.name || "Not specified",
                assignedAt: new Date(),
                assignedBy: session.user._id,
                status: "assigned",
                currentRound: 0,
                totalRounds: candidateObj.progress?.length || 0,
                lastActivity: new Date(),
                notes: "",
                interviewRounds: []
              }
            }
          }
        );
      }
      return NextResponse.json({ message: `Reassigned ${role} for round ${roundNumber}.`, success: true }, { status: 200 });
    }
    // --- Default sequential assignment logic ---
    // Check assignedRounds for round 1 and round 2
    const hasRound1 = assignedRounds.some((r: any) => r.roundNumber === 1);
    const hasRound2 = assignedRounds.some((r: any) => r.roundNumber === 2);
    let nextRound = 1;
    if (!hasRound1 && role === 'interviewers') {
      nextRound = 1;
    } else if (hasRound1 && !hasRound2 && role === 'admins') {
      nextRound = 2;
    } else {
      return NextResponse.json({ error: "All rounds are already assigned or invalid role sequence." }, { status: 400 })
    }
    if (!newAssigneeId) {
      return NextResponse.json({ error: "Missing required field: newAssigneeId is required for assignment." }, { status: 400 })
    }
    await Candidate.findByIdAndUpdate(
      candidateId,
      {
        $push: {
          assignedRounds: {
            roundNumber: nextRound,
            assignedTo: newAssigneeId,
            assignedToModel: role,
            assignedAt: new Date(),
            assignedBy: session.user._id,
            scheduledDate: date,
            scheduledTime: time,
            durationMinutes: duration,
            interviewFormat: type,
            status: "assigned",
            feedback: "",
            responseSubmitted: false
          }
        }
      },
      { new: true }
    )
    return NextResponse.json({
      message: `Assignment for round ${nextRound} to ${role === 'interviewers' ? 'interviewer' : 'admin'} successful`,
      success: true,
    }, { status: 200 })
  } catch (error: any) {
    console.error("Error in assign interviewer/admin route:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
} 