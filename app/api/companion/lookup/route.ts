import { NextRequest, NextResponse } from "next/server"
import { connect } from "@/dbConfig/dbConfig"
import Companion from "@/models/companions"

export async function POST(request: NextRequest) {
  try {
    await connect()
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Extract domain from email
    const emailDomain = email.split('@')[1]
    if (!emailDomain) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    console.log("Looking up companion for email domain:", emailDomain)

    // Find companion by email domain
    const companion = await Companion.findOne({ 
      emailDomain,
      isActive: true 
    }).populate("domains", "domainname description")

    console.log("Found companion:", companion)

    if (!companion) {
      return NextResponse.json({ 
        error: "No companion found for this email domain",
        emailDomain 
      }, { status: 404 })
    }

    return NextResponse.json({
      companion: {
        _id: companion._id,
        collegeName: companion.collegeName,
        emailDomain: companion.emailDomain,
        description: companion.description,
        domains: companion.domains,
        settings: companion.settings
      }
    })
  } catch (error) {
    console.error("Error looking up companion:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 