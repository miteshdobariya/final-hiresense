import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { connect } from "@/dbConfig/dbConfig"
import Domain from "@/models/domains"
import Companion from "@/models/companions"
import candidates from "@/models/candidates"

export async function GET(request: NextRequest) {
  try {
    await connect()
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "candidate") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get candidate's companion
    const candidate = await candidates.findById(session.user._id).populate("companion")
    
    console.log("=== DOMAINS BY COMPANION DEBUG ===")
    console.log("Session user ID:", session.user._id)
    console.log("Candidate found:", candidate?._id)
    console.log("Candidate email:", candidate?.email)
    console.log("Candidate companion:", candidate?.companion)
    
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }

    let domains = []

    if (candidate.companion) {
      // If candidate has a companion, get only the domains assigned to that companion
      const companion = await Companion.findById(candidate.companion).populate("domains")
      
      console.log("Companion found:", companion)
      console.log("Companion ID:", companion?._id)
      console.log("Companion college name:", companion?.collegeName)
      console.log("Companion email domain:", companion?.emailDomain)
      
      if (companion && companion.domains) {
        domains = companion.domains
        console.log("Companion domains count:", domains.length)
        console.log("Companion domains:", domains.map(d => d.domainname))
      } else {
        console.log("No companion domains found")
        console.log("Companion domains array:", companion?.domains)
      }
    } else {
      // If no companion, get all active domains
      domains = await Domain.find({ isActive: true })
      console.log("No companion assigned, returning all active domains:", domains.length)
      console.log("All domains:", domains.map(d => d.domainname))
    }

    console.log("Returning domains:", domains.length, "domains")
    return NextResponse.json(domains)
  } catch (error) {
    console.error("Error fetching domains by companion:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 