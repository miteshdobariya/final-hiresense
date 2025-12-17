import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { connect } from "@/dbConfig/dbConfig"
import candidates from "@/models/candidates"
import Companion from "@/models/companions"

export async function POST() {
  try {
    await connect()
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "candidate") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const candidate = await candidates.findById(session.user._id)

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }

    console.log("=== FORCE ASSIGN COMPANION ===")
    console.log("Candidate email:", candidate.email)

    // Get email domain
    const emailDomain = candidate.email.split('@')[1]
    console.log("Email domain:", emailDomain)

    // Find companion for this domain
    const companion = await Companion.findOne({
      emailDomain,
      isActive: true
    })

    console.log("Found companion:", companion)

    if (!companion) {
      return NextResponse.json({ 
        error: "No companion found for email domain",
        emailDomain 
      }, { status: 404 })
    }

    // Update candidate with companion
    const updatedCandidate = await candidates.findByIdAndUpdate(
      candidate._id,
      { companion: companion._id },
      { new: true }
    )

    console.log("Updated candidate:", {
      _id: updatedCandidate._id,
      email: updatedCandidate.email,
      companion: updatedCandidate.companion
    })

    return NextResponse.json({
      success: true,
      message: `Assigned ${companion.collegeName} companion to candidate`,
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
    console.error("Error force assigning companion:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 