import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { connect } from "@/dbConfig/dbConfig"
import Question from "@/models/questions"
import Domain from "@/models/domains"
import Round from "@/models/rounds"
import mongoose from "mongoose"

// --- GET: Fetch questions based on filters ---
export async function GET(req: NextRequest) {
  await connect()
  const { searchParams } = new URL(req.url)
  // const domainname = searchParams.get("domainname") // REMOVE
  const roundname = searchParams.get("roundname")
  const type = searchParams.get("type")

  const filter: any = {}
  // if (domainname) filter.domainname = domainname // REMOVE
  if (roundname) {
    // If roundname looks like an ObjectId, cast it
    filter.roundname = mongoose.Types.ObjectId.isValid(roundname) ? new mongoose.Types.ObjectId(roundname) : roundname;
  }
  if (type) filter.type = type

  const questions = await Question.find(filter)
    // .populate("domainname") // REMOVE
    .populate("roundname")
  return NextResponse.json({ questions })
}

// --- POST: Create a new question ---
export async function POST(req: NextRequest) {
  await connect()
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await req.json()
    const question = await Question.create({ ...body, isAIGenerated: false })
    // Increment currentQuestionsCount in the corresponding round
    if (question.roundname) {
      await Round.findByIdAndUpdate(question.roundname, { $inc: { currentQuestionsCount: 1 } })
    }
    return NextResponse.json({ question })
  } catch (err) {
    console.error("[Questions API] Error creating question:", err)
    return NextResponse.json({ error: "Failed to create question", details: String(err) }, { status: 500 })
  }
}

// --- PATCH: Update an existing question ---
export async function PATCH(req: NextRequest) {
  await connect()
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const { _id, question, options, correctAnswer, points, difficulty } = body
  if (!_id) {
    return NextResponse.json({ error: "Question ID is required" }, { status: 400 })
  }
  const updated = await Question.findByIdAndUpdate(
    _id,
    { question, options, correctAnswer, points, difficulty },
    { new: true }
  )
  return NextResponse.json({ question: updated })
}

// --- DELETE: Delete a question by ID ---
export async function DELETE(req: NextRequest) {
  await connect()
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { _id } = await req.json()
  if (!_id) {
    return NextResponse.json({ error: "Question ID is required" }, { status: 400 })
  }
  // Only proceed if _id is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return NextResponse.json({ error: "Invalid Question ID" }, { status: 400 })
  }
  // Find the question to get the round ID before deleting
  const question = await Question.findById(_id)
  if (question && question.roundname) {
    await Round.findByIdAndUpdate(question.roundname, { $inc: { currentQuestionsCount: -1 } })
  }
  await Question.findByIdAndDelete(_id)
  return NextResponse.json({ success: true })
} 