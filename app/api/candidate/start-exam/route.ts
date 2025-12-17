import { NextRequest, NextResponse } from "next/server";
import Candidate from "@/models/candidates";
import Question from "@/models/questions";
import Round from "@/models/rounds";
import { connect } from "@/dbConfig/dbConfig";

export async function POST(req: NextRequest) {
  await connect();
  const { candidateId, roundId } = await req.json();
  const candidate = await Candidate.findById(candidateId);
  const round = await Round.findById(roundId);
  if (!candidate || !round) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check if already has questions for this round
  let examEntry = candidate.examQuestions.find((eq: any) => eq.roundId.toString() === round._id.toString());
  if (!examEntry) {
    // Randomly select questionsCount questions for this round
    const questions = await Question.aggregate([
      { $match: { roundname: round._id } },
      { $sample: { size: round.questionsCount } }
    ]);
    const questionIds = questions.map((q: any) => q._id);
    candidate.examQuestions.push({ roundId: round._id, questionIds });
    await candidate.save();
    examEntry = candidate.examQuestions.find((eq: any) => eq.roundId.toString() === round._id.toString());
  }
  // Serve the questions in order
  const questions = await Question.find({ _id: { $in: examEntry.questionIds } });
  // Ensure order matches questionIds
  const orderedQuestions = examEntry.questionIds.map((id: any) => questions.find((q: any) => q._id.equals(id)));
  return NextResponse.json({ questions: orderedQuestions });
} 