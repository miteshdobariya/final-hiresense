import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { connect } from "@/dbConfig/dbConfig"
import Candidate from "@/models/candidates"
import Interviewer from "@/models/interviewers"

export async function GET(req: NextRequest) {
  try {
    await connect()
    
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user._id

    // First, check if interviewer profile exists in interviewers collection
    let interviewerProfile = await Interviewer.findOne({ userId }).lean()

    if (interviewerProfile) {
      // Profile completed - return from interviewers collection
      return NextResponse.json({
        message: "Interviewer profile found",
        interviewer: interviewerProfile,
        profileCompleted: true,
        success: true,
      }, { status: 200 })
    }

    // If not in interviewers collection, check candidates collection
    const candidateProfile = await Candidate.findOne({ _id: userId, role: "interviewer" }).lean() as any
    
    if (!candidateProfile) {
      return NextResponse.json({
        message: "No interviewer profile found",
        interviewer: null,
        profileCompleted: false,
        success: true,
      }, { status: 200 })
    }

    // Profile exists in candidates but not completed - return basic info
    return NextResponse.json({
      message: "Basic profile found - needs completion",
      interviewer: {
        name: candidateProfile.username || candidateProfile.email,
        email: candidateProfile.email,
        phone: candidateProfile.phonenumber || "",
        role: "",
        status: "Inactive",
        experience: "",
        skills: [],
        profileCompleted: false,
      },
      profileCompleted: false,
      success: true,
    }, { status: 200 })

  } catch (error: any) {
    console.error("Error in interviewer getdetail route:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
} 