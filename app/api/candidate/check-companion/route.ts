import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { connect } from "@/dbConfig/dbConfig"
import candidates from "@/models/candidates"
import Companion from "@/models/companions"

export async function GET() {
  try {
    await connect()
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "candidate") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const candidate = await candidates.findById(session.user._id).populate("companion")
    
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }

    console.log("Candidate email:", candidate.email)
    console.log("Candidate companion:", candidate.companion)

    // Check if companion should be assigned
    const emailDomain = candidate.email.split('@')[1]
    let shouldHaveCompanion = null
    if (emailDomain) {
      shouldHaveCompanion = await Companion.findOne({ 
        emailDomain,
        isActive: true 
      })
    }

    return NextResponse.json({
      candidate: {
        _id: candidate._id,
        email: candidate.email,
        companion: candidate.companion,
        emailDomain,
        shouldHaveCompanion: shouldHaveCompanion ? {
          _id: shouldHaveCompanion._id,
          collegeName: shouldHaveCompanion.collegeName,
          emailDomain: shouldHaveCompanion.emailDomain
        } : null
      }
    })
  } catch (error) {
    console.error("Error checking companion:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 