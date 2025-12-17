import { NextRequest, NextResponse } from "next/server";
import Candidate from "@/models/candidates";
import { connect } from "@/dbConfig/dbConfig";

export async function POST(req: NextRequest) {
  await connect();
  const { candidateId, roundId } = await req.json();
  await Candidate.updateOne(
    { _id: candidateId },
    { $pull: { examQuestions: { roundId } } }
  );
  return NextResponse.json({ success: true });
} 