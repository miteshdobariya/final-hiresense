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

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all candidates
    const allCandidates = await candidates.find({ role: "candidate" })
    
    let updatedCount = 0
    let errors = []

    for (const candidate of allCandidates) {
      try {
        const emailDomain = candidate.email.split('@')[1]
        if (emailDomain) {
          const companion = await Companion.findOne({ 
            emailDomain,
            isActive: true 
          })
          
          if (companion) {
            await candidates.findByIdAndUpdate(candidate._id, { 
              companion: companion._id 
            })
            updatedCount++
            console.log(`Assigned ${companion.collegeName} to ${candidate.email}`)
          }
        }
      } catch (error) {
        console.error(`Error updating candidate ${candidate.email}:`, error)
        errors.push(candidate.email)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} candidates with companions`,
      updatedCount,
      errors
    })
  } catch (error) {
    console.error("Error refreshing companions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 