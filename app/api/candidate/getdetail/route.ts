import { connect } from "@/dbConfig/dbConfig"
import candidates from "@/models/candidates"
import Interviewer from "@/models/interviewers"
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"

connect()

export async function GET(req: NextRequest) {
  try {
    // Use session to get user ID
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user._id
    const candidate = await candidates.findOne({ _id: userId }).lean();
    if (!candidate) {
      return NextResponse.json(
        {
          message: "No profile found",
          candidate: null,
          success: true,
        },
        { status: 200 },
      )
    }

    // Prepare for name lookups for assignedRounds
    const assignedRounds = Array.isArray(candidate.assignedRounds) ? candidate.assignedRounds : [];
    const assignedToIds = assignedRounds.map(r => r.assignedTo?.toString()).filter(Boolean);
    const allUserIds = Array.from(new Set(assignedToIds));

    // Fetch all possible users (admins/hr/candidates)
    const users = await candidates.find({ _id: { $in: allUserIds } }).lean();
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

    // Add assignedToName to each round
    const assignedRoundsWithNames = assignedRounds.map(r => {
      let assignedToName = null;
      if (r.assignedToModel === 'interviewers') {
        assignedToName = interviewerMap[r.assignedTo?.toString()] || 'Interviewer';
      } else {
        assignedToName = userMap[r.assignedTo?.toString()] || 'Admin';
      }
      return { ...r, assignedToName };
    });

    return NextResponse.json(
      {
        message: "Profile fetched successfully",
        candidate: { ...candidate, assignedRounds: assignedRoundsWithNames },
        workDomain: candidate.workDomain,
        success: true,
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("Error in getalldetails route:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
