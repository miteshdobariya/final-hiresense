import { NextRequest, NextResponse } from "next/server"
import { connect } from "@/dbConfig/dbConfig"
import Companion from "@/models/companions"
import Domain from "@/models/domains"

export async function GET() {
  try {
    await connect()
    
    // Get all companions
    const companions = await Companion.find({}).populate("domains")
    
    // Get all domains
    const allDomains = await Domain.find({ isActive: true })
    
    // Test email domain matching
    const testEmail = "miteshdobariya.co22d1@scet.ac.in"
    const emailDomain = testEmail.split('@')[1]
    
    const matchingCompanion = await Companion.findOne({ 
      emailDomain,
      isActive: true 
    }).populate("domains")
    
    return NextResponse.json({
      testEmail,
      emailDomain,
      matchingCompanion: matchingCompanion ? {
        _id: matchingCompanion._id,
        collegeName: matchingCompanion.collegeName,
        emailDomain: matchingCompanion.emailDomain,
        domains: matchingCompanion.domains?.map(d => d.domainname) || []
      } : null,
      allCompanions: companions.map(c => ({
        _id: c._id,
        collegeName: c.collegeName,
        emailDomain: c.emailDomain,
        isActive: c.isActive,
        domains: c.domains?.map(d => d.domainname) || []
      })),
      allDomains: allDomains.map(d => d.domainname)
    })
  } catch (error) {
    console.error("Error in test:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 