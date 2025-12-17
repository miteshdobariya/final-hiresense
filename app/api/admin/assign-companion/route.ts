import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { connect } from "@/dbConfig/dbConfig"
import candidates from "@/models/candidates"
import Companion from "@/models/companions"

export async function POST(request: NextRequest) {
  try {
    await connect()
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { candidateEmail, companionId } = await request.json()

    if (!candidateEmail) {
      return NextResponse.json({ error: "Candidate email is required" }, { status: 400 })
    }

    // Find candidate by email
    const candidate = await candidates.findOne({ email: candidateEmail })
    
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }

    let companion = null
    if (companionId) {
      // Use provided companion ID
      companion = await Companion.findById(companionId)
    } else {
      // Find companion by email domain
      const emailDomain = candidateEmail.split('@')[1]
      if (emailDomain) {
        companion = await Companion.findOne({ 
          emailDomain,
          isActive: true 
        })
      }
    }

    if (!companion) {
      return NextResponse.json({ error: "No companion found" }, { status: 404 })
    }

    // Update candidate with companion
    const updatedCandidate = await candidates.findByIdAndUpdate(
      candidate._id,
      { companion: companion._id },
      { new: true }
    )

    console.log("Assigned companion to candidate:", {
      candidate: candidateEmail,
      companion: companion.collegeName,
      companionId: companion._id
    })

    return NextResponse.json({
      success: true,
      candidate: {
        _id: updatedCandidate._id,
        email: updatedCandidate.email,
        companion: updatedCandidate.companion
      },
      companion: {
        _id: companion._id,
        collegeName: companion.collegeName,
        emailDomain: companion.emailDomain
      }
    })
  } catch (error) {
    console.error("Error assigning companion:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 