import { type NextRequest, NextResponse } from "next/server"
import { connect } from "@/dbConfig/dbConfig"
import Candidate from "@/models/candidates"
import CandidateInterviewRound from "@/models/candidate_interview_rounds"
import mongoose from "mongoose"
import Interviewer from "@/models/interviewers"

// Get a single candidate by ID with performance details
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connect()

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid candidate ID" }, { status: 400 })
    }

    // Fetch candidate profile
    const candidate = await Candidate.findById(id).lean()

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }

    // Prepare for name lookups
    const assignedRounds = Array.isArray(candidate.assignedRounds) ? candidate.assignedRounds : [];
    const assignedToIds = assignedRounds.map(r => r.assignedTo?.toString()).filter(Boolean);
    const assignedByIds = assignedRounds.map(r => r.assignedBy?.toString()).filter(Boolean);
    const allUserIds = Array.from(new Set([...assignedToIds, ...assignedByIds]));

    // Fetch all possible users (admins/hr/candidates)
    const users = await Candidate.find({ _id: { $in: allUserIds } }).lean();
    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = u.username || u.name || u.email;
    });

    // Fetch all possible interviewers
    const interviewerIds = assignedRounds
      .filter(r => r.assignedToModel === 'interviewers' && r.assignedTo)
      .map(r => r.assignedTo.toString());
    const uniqueInterviewerIds = Array.from(new Set(interviewerIds));
    const interviewers = uniqueInterviewerIds.length
      ? await Interviewer.find({ _id: { $in: uniqueInterviewerIds } }).lean()
      : [];
    const interviewerMap = {};
    interviewers.forEach(i => {
      interviewerMap[i._id.toString()] = i.name || i.username || i.email;
    });

    // Add assignedToName and assignedByName to each round
    const assignedRoundsWithNames = assignedRounds.map(r => {
      let assignedToName = null;
      if (r.assignedToModel === 'interviewers') {
        assignedToName = interviewerMap[r.assignedTo?.toString()] || null;
      } else {
        assignedToName = userMap[r.assignedTo?.toString()] || null;
      }
      const assignedByName = userMap[r.assignedBy?.toString()] || null;
      return { ...r, assignedToName, assignedByName };
    });

    // Fetch all performance rounds for the candidate
    const performanceRounds = await CandidateInterviewRound.find({ candidateId: id })
      .sort({ completedAt: "asc" }) // Sort rounds chronologically
      .lean()

    // Combine the data
    const detailedCandidate = {
      ...candidate,
      assignedRounds: assignedRoundsWithNames,
      performance: performanceRounds,
    }

    return NextResponse.json({ candidate: detailedCandidate })
  } catch (error: any) {
    const { id } = await params
    console.error(`Error fetching candidate details for ${id}:`, error)
    return NextResponse.json({ error: "Failed to fetch candidate details", details: error.message }, { status: 500 })
  }
}







// export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
//   try {
//     connect(); // connect to DB

//     const id = params.id;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return NextResponse.json({ error: "Invalid candidate ID" }, { status: 400 });
//     }

//     const result = await candidates.findByIdAndDelete(id); // 🔥 DELETES FROM DATABASE

//     if (!result) {
//       return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
//     }

//     return NextResponse.json({ message: "Candidate deleted successfully" }, { status: 200 });
//   } catch (error) {
//     console.error("Error deleting candidate:", error);
//     return NextResponse.json({ error: "Failed to delete candidate" }, { status: 500 });
//   }
// }
