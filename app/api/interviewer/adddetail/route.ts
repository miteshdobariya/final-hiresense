import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { connect } from "@/dbConfig/dbConfig"
import Candidate from "@/models/candidates"
import Interviewer from "@/models/interviewers"

export async function POST(req: NextRequest) {
  try {
    await connect()
    
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user._id
    const body = await req.json()
    
    const { name, role, email, phone, experience, skills } = body

    // Validate required fields
    if (!name || !role || !email) {
      return NextResponse.json({ 
        error: "Missing required fields: name, role, and email are required" 
      }, { status: 400 })
    }

    // Check if interviewer profile already exists
    let existingInterviewer = await Interviewer.findOne({ userId }).lean()

    if (existingInterviewer) {
      // Update existing interviewer profile
      const updatedInterviewer = await Interviewer.findOneAndUpdate(
        { userId },
        {
          name,
          role,
          status: "Inactive",
          email,
          phone,
          experience,
          skills,
          updatedAt: new Date(),
        },
        { new: true }
      )

      return NextResponse.json({
        message: "Interviewer profile updated successfully",
        interviewer: updatedInterviewer,
        profileCompleted: true,
        success: true,
      }, { status: 200 })
    }

    // Check if user exists in candidates collection
    const candidateProfile = await Candidate.findOne({ _id: userId, role: "interviewer" }).lean()
    
    if (!candidateProfile) {
      return NextResponse.json({ 
        error: "User not found in candidates collection" 
      }, { status: 404 })
    }

    // Create new interviewer profile in interviewers collection
    const newInterviewer = await Interviewer.create({
      userId,
      name,
      role,
      status: "Inactive",
      email,
      phone: phone || "",
      experience: experience || "",
      skills: skills || [],
      profileCompleted: true,
      profileCompletedAt: new Date(),
      activeInterviews: 0,
      completedInterviews: 0,
    })

    return NextResponse.json({
      message: "Interviewer profile created successfully",
      interviewer: newInterviewer,
      profileCompleted: true,
      success: true,
    }, { status: 201 })

  } catch (error: any) {
    console.error("Error in interviewer adddetail route:", error)
    
    // Handle duplicate email error
    if (error.code === 11000 && error.keyPattern?.email) {
      return NextResponse.json({ 
        error: "An interviewer with this email already exists" 
      }, { status: 409 })
    }
    
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
} 