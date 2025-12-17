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

    if (!session) {
      return NextResponse.json({ error: "No session" }, { status: 401 })
    }

    console.log("=== TEST CANDIDATE COMPANION ===")
    console.log("Session user:", session.user)

    const candidate = await candidates.findById(session.user._id)

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }

    console.log("Candidate found:", {
      _id: candidate._id,
      email: candidate.email,
      companion: candidate.companion,
      role: candidate.role
    })

    // Check email domain
    const emailDomain = candidate.email.split('@')[1]
    console.log("Email domain:", emailDomain)

    // Find companion for this domain
    const companionForDomain = await Companion.findOne({
      emailDomain,
      isActive: true
    })

    console.log("Companion for domain:", companionForDomain)

    // If candidate has companion, get companion details
    let companionDetails = null
    if (candidate.companion) {
      companionDetails = await Companion.findById(candidate.companion).populate("domains")
    }

    return NextResponse.json({
      candidate: {
        _id: candidate._id,
        email: candidate.email,
        companion: candidate.companion,
        role: candidate.role
      },
      emailDomain,
      companionForDomain: companionForDomain ? {
        _id: companionForDomain._id,
        collegeName: companionForDomain.collegeName,
        emailDomain: companionForDomain.emailDomain
      } : null,
      companionDetails: companionDetails ? {
        _id: companionDetails._id,
        collegeName: companionDetails.collegeName,
        emailDomain: companionDetails.emailDomain,
        domains: companionDetails.domains?.map(d => d.domainname) || []
      } : null
    })
  } catch (error) {
    console.error("Error in test:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 