import { NextResponse } from "next/server";
import Candidate from "@/models/candidates";
import Domain from "@/models/domains";
import Round from "@/models/rounds";
import Question from "@/models/questions";
import Interviewer from "@/models/interviewers";
import Companion from "@/models/companions";
import { connect } from "@/dbConfig/dbConfig";

export async function GET() {
  await connect();
  const totalCandidates = await Candidate.countDocuments({ role: "candidate" });
  const activeDomains = await Domain.countDocuments({ isActive: true });
  const numberOfRounds = await Round.countDocuments();
  const questionsBank = await Question.countDocuments();
  const activeStatuses = [
    "in-progress",
    "waiting-for-assignment",
    "assigned-interviewer",
    "assigned-admin",
    "waiting-for-admin-assignment"
  ];
  const activeCandidates = await Candidate.countDocuments({ role: "candidate", status: { $in: activeStatuses } });
  const completedCandidates = await Candidate.countDocuments({ role: "candidate", status: { $nin: activeStatuses } });
  const activeInterviewers = await Interviewer.countDocuments({ status: "Active" });
  const admins = await Candidate.countDocuments({ role: "admin" });
  const totalCompanions = await Companion.countDocuments();
  const activeCompanions = await Companion.countDocuments({ isActive: true });

  return NextResponse.json({
    totalCandidates,
    activeDomains,
    numberOfRounds,
    questionsBank,
    activeCandidates,
    completedCandidates,
    activeInterviewers,
    admins,
    totalCompanions,
    activeCompanions
  });
} 