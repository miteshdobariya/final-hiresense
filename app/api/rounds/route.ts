import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { connect } from "@/dbConfig/dbConfig"
import Round from "@/models/rounds"
import Domain from "@/models/domains"
import mongoose from "mongoose"
import Question from "@/models/questions"

// --- GET: Fetch all rounds (global) ---
export async function GET(req: NextRequest) {
  await connect()
  const { searchParams } = new URL(req.url)
  const domainName = searchParams.get('domainname')
  if (domainName) {
    // Find the domain by domainname
    const domain = await Domain.findOne({ domainname: domainName })
    if (!domain) {
      return NextResponse.json({ rounds: [] })
    }
    // Get only the rounds assigned to this domain, ordered by sequence
    const roundIds = domain.rounds.map((r: any) => r.roundId)
    const rounds = await Round.find({ _id: { $in: roundIds } })
    
    // Create a map of round data
    const roundsMap = new Map(rounds.map(r => [r._id.toString(), r]))
    
    // Sort rounds by sequence from domain.rounds
    const orderedRounds = domain.rounds
      .sort((a: any, b: any) => a.sequence - b.sequence)
      .map((r: any) => roundsMap.get(r.roundId.toString()))
      .filter(Boolean)
    
    // For each round, count questions and update currentQuestionsCount
    for (const round of orderedRounds) {
      const count = await Question.countDocuments({ roundname: round._id })
      if (round.currentQuestionsCount !== count) {
        round.currentQuestionsCount = count
        await round.save()
      }
    }
    return NextResponse.json({ rounds: orderedRounds })
  }
  // Default: return all rounds
  const rounds = await Round.find({})
  for (const round of rounds) {
    const count = await Question.countDocuments({ roundname: round._id })
    if (round.currentQuestionsCount !== count) {
      round.currentQuestionsCount = count
      await round.save()
    }
  }
  return NextResponse.json({ rounds })
}

// --- POST: Create a new round (global) ---
export async function POST(req: NextRequest) {
  await connect()
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const { roundname, description, type, duration, questionsCount, currentQuestionsCount, status } = body
  if (!roundname) {
    return NextResponse.json({ error: "Round name is required" }, { status: 400 })
  }
  // Find max sequence globally
  const maxSeq = await Round.find({}).sort({ sequence: -1 }).limit(1)
  const nextSeq = maxSeq.length > 0 ? (maxSeq[0].sequence || 0) + 1 : 1
  const round = await Round.create({ roundname, description, type, duration, questionsCount, currentQuestionsCount, status, sequence: nextSeq })
  return NextResponse.json({ round })
}

// --- PATCH: Update round details or sequence ---
export async function PATCH(req: NextRequest) {
  await connect()
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const { _id, roundname, type, duration, questionsCount, currentQuestionsCount, status, sequence } = body
  if (!_id) {
    return NextResponse.json({ error: "Round ID is required" }, { status: 400 })
  }
  const updateFields: any = { roundname, type, duration, questionsCount, currentQuestionsCount, status }
  if (typeof sequence === 'number') {
    updateFields.sequence = sequence
  }
  const round = await Round.findByIdAndUpdate(
    _id,
    updateFields,
    { new: true }
  )
  return NextResponse.json({ round })
}

// --- DELETE: Delete a round by ID ---
export async function DELETE(req: NextRequest) {
  await connect()
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { _id } = await req.json()
  if (!_id) {
    return NextResponse.json({ error: "Round ID is required" }, { status: 400 })
  }
  await Round.findByIdAndDelete(_id)
  // Remove the round from all domains' rounds arrays
  await Domain.updateMany({}, { $pull: { rounds: _id } })
  return NextResponse.json({ success: true })
} 