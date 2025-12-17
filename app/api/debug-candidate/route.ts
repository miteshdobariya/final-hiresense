import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { connect } from "@/dbConfig/dbConfig"
import candidates from "@/models/candidates"
import Companion from "@/models/companions"
import Domain from "@/models/domains"

export async function GET() {
  try {
    await connect()
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "No session" }, { status: 401 })
    }

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

    // Get all companions
    const allCompanions = await Companion.find({}, "collegeName emailDomain isActive")

    // Get all domains
    const allDomains = await Domain.find({ isActive: true }, "domainname description")

    // If candidate has companion, get companion domains
    let companionDomains = []
    if (candidate.companion) {
      const companion = await Companion.findById(candidate.companion).populate("domains")
      if (companion && companion.domains) {
        companionDomains = companion.domains
      }
    }

    return NextResponse.json({
      session: {
        userId: session.user._id,
        email: session.user.email,
        role: session.user.role
      },
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
      allCompanions,
      allDomains: allDomains.length,
      companionDomains: companionDomains.length
    })
  } catch (error) {
    console.error("Error in debug:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 