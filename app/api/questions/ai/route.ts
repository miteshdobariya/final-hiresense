import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { connect } from "@/dbConfig/dbConfig"
import Question from "@/models/questions"
import Round from "@/models/rounds"

// --- POST: Generate AI questions ---
export async function POST(req: NextRequest) {
  await connect()
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const { domainName, type, difficulty, numberOfQuestions, roundId, roundName, metadata } = body

  if (!process.env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY is missing in environment variables.")
    return NextResponse.json({ error: "Groq API key is missing." }, { status: 500 })
  }

  const prompt = `You are an expert technical interviewer and genrating question for post-graduate candidates . Generate ${numberOfQuestions} ${type} interview questions for the topic '${domainName}' with difficulty '${difficulty}'. give question for type ${type} only. If TYPE is "coding" then give question with code example like this: You are given a list of integers. Your task is to write a function that returns the maximum number in the list. For example: find_max([3, 7, 2, 9, 4]) → 9 with 2 more exaple related to question , so candidate can write code in any language. Return only the questions as a JSON array of objects with fields: question, type, difficulty, options (array, if MCQ), correctAnswer (if MCQ), points (suggested), metadata (object, if needed), isAIGenerated (true).`

  
  try {
    const llmRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    })
    const data = await llmRes.json()

    if (!data.choices || !data.choices[0]?.message?.content) {
      return NextResponse.json({ error: "Groq error", raw: data }, { status: 500 })
    }
    let questions = []
    try {
      questions = JSON.parse(data.choices[0].message.content)
    } catch (e) {
      return NextResponse.json({ error: "AI response parsing failed", raw: data }, { status: 500 })
    }
    // Attach domainId, domainName, roundId, roundName, and metadata to each question
    questions = questions.map((q: { metadata: any }) => ({
      ...q,
      domainId: undefined,
      roundId: roundId || undefined,
      roundname: roundName || undefined,
      metadata: q.metadata || metadata || undefined,
    }))
    return NextResponse.json({ questions })
  } catch (err) {
    console.error("[AI Question Generation] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error", details: String(err) }, { status: 500 })
  }
}

// --- PATCH: Accept AI questions (individual or bulk) ---
export async function PATCH(req: NextRequest) {
  await connect()
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { questions, action } = body // action: 'accept' or 'acceptAll'

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: "Questions array is required" }, { status: 400 })
    }

    // Validate all questions first
    const validQuestions = []
    const errors = []
    
    for (const questionData of questions) {
      if (!questionData.question || !questionData.type || !questionData.roundname) {
        errors.push(`Invalid question data: ${questionData.question || 'No question text'}`)
        continue
      }
      validQuestions.push(questionData)
    }

    if (validQuestions.length === 0) {
      return NextResponse.json({ error: "No valid questions to accept" }, { status: 400 })
    }

    // Group questions by round to batch the currentQuestionsCount updates
    const roundUpdates = new Map()
    const questionsToCreate = []

    for (const questionData of validQuestions) {
      questionsToCreate.push({
        ...questionData,
        isAIGenerated: true
      })
      
      // Count questions per round
      const roundId = questionData.roundname
      roundUpdates.set(roundId, (roundUpdates.get(roundId) || 0) + 1)
    }

    // Create all questions in a single operation
    const createdQuestions = await Question.insertMany(questionsToCreate)

    // Update round counts in a single operation per round
    const roundUpdatePromises = []
    for (const [roundId, count] of roundUpdates) {
      roundUpdatePromises.push(
        Round.findByIdAndUpdate(roundId, { 
          $inc: { currentQuestionsCount: count } 
        })
      )
    }
    
    await Promise.all(roundUpdatePromises)

    return NextResponse.json({ 
      success: true,
      acceptedQuestions: createdQuestions,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (err) {
    console.error("[AI Questions API] Error accepting questions:", err)
    return NextResponse.json({ error: "Failed to accept questions", details: String(err) }, { status: 500 })
  }
} 