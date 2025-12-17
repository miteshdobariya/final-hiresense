import { connect } from "@/dbConfig/dbConfig"
import candidates from "@/models/candidates"
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import Domain from "@/models/domains"

// Add interface for type safety
interface DomainLean {
  _id: any;
  rounds: any[];
}

export async function POST(req: NextRequest) {
  try {
    await connect()
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user._id

    const { currentround, currentroundname } = await req.json()

    if (typeof currentround !== "number" || typeof currentroundname !== "string") {
      return NextResponse.json(
        { error: "Invalid data: currentround and currentroundname are required and must be of correct type." },
        { status: 400 },
      )
    }

    // 1. Find the candidate
    const candidate = await candidates.findById(userId)
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }

    // 2. Get the current active domain ID from the candidate's profile
    const activeDomainId = candidate.workDomain?.id
    if (!activeDomainId) {
      return NextResponse.json({ error: "Candidate has no active work domain set." }, { status: 400 })
    }

    // 3. Find the corresponding progress sub-document
    const progressIndex = candidate.progress.findIndex((p: { domainId: { toString: () => any } }) => p.domainId?.toString() === activeDomainId.toString())

    if (progressIndex === -1) {
      return NextResponse.json({ error: `Progress for domain ${activeDomainId} not found.` }, { status: 404 })
    }

    // 4. Update the progress for that domain
    candidate.progress[progressIndex].currentround = currentround
    candidate.progress[progressIndex].currentroundname = currentroundname

    // Fetch the domain to get total rounds
    const domain = await Domain.findById(activeDomainId).lean() as DomainLean | null;
    const totalRounds = domain?.rounds?.length || 0

    // Only mark as completed if this is the last round for the current domain
    if (totalRounds > 0 && currentround >= totalRounds) {
      candidate.progress[progressIndex].status = "completed"
    } else {
      candidate.progress[progressIndex].status = "in-progress"
    }

    // Check if the current domain's progress is completed
    if (candidate.progress[progressIndex].status === "completed") {
      candidate.status = "waiting-for-assignment"
    } else {
      candidate.status = "in-progress"
    }

    // 5. Save the updated candidate document
    const updatedCandidate = await candidate.save()

    return NextResponse.json({ success: true, candidate: updatedCandidate })
  } catch (error: any) {
    console.error("Error in /api/candidate/progress:", error)
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 })
  }
} 