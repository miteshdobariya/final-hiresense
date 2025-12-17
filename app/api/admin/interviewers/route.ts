import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { connect } from "@/dbConfig/dbConfig"
import Interviewer from "@/models/interviewers"

export async function GET(req: NextRequest) {
  try {
    await connect()
    
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !["admin", "hr"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all interviewers from the interviewers collection
    const interviewers = await Interviewer.find({}).lean()

    // Format the data for the frontend
    const formattedInterviewers = interviewers.map((interviewer: any) => {
      const assignedCandidates = Array.isArray(interviewer.assignedCandidates) ? interviewer.assignedCandidates : [];
      return {
        id: interviewer._id.toString(),
        name: interviewer.name,
        email: interviewer.email,
        phone: interviewer.phone || "",
        role: interviewer.role,
        experience: interviewer.experience || "",
        skills: interviewer.skills || [],
        activeInterviews: assignedCandidates.filter((a: any) => ["assigned", "in-progress"].includes(a.status)).length,
        completedInterviews: assignedCandidates.filter((a: any) => a.status === "completed").length,
        status: interviewer.status,
        profileCompleted: interviewer.profileCompleted,
        createdAt: interviewer.createdAt,
        updatedAt: interviewer.updatedAt,
      }
    })

    return NextResponse.json({ 
      interviewers: formattedInterviewers,
      success: true 
    })

  } catch (error: any) {
    console.error("Error fetching interviewers:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connect()
    
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !["admin", "hr"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { interviewerId, status } = body

    if (!interviewerId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Update interviewer status
    const updatedInterviewer = await Interviewer.findByIdAndUpdate(
      interviewerId,
      { status },
      { new: true }
    ).lean()

    if (!updatedInterviewer) {
      return NextResponse.json({ error: "Interviewer not found" }, { status: 404 })
    }

    return NextResponse.json({ 
      message: "Interviewer status updated successfully",
      interviewer: updatedInterviewer,
      success: true 
    })

  } catch (error: any) {
    console.error("Error updating interviewer status:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
} 