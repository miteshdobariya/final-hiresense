import { NextResponse } from "next/server";
import Candidate from "@/models/candidates";
import Domain from "@/models/domains";
import Round from "@/models/rounds";
import { connect } from "@/dbConfig/dbConfig";
import CandidateInterviewRound from "@/models/candidate_interview_rounds";
import Question from "@/models/questions";

export async function GET() {
  await connect();

  // Overall stats
  const totalCandidates = await Candidate.countDocuments({ role: "candidate" });

  // Average score (across all candidates' progress)
  const candidates = await Candidate.find({ role: "candidate" }).lean();
  let totalScoreSum = 0;
  let totalScoreCount = 0;
  candidates.forEach(c => {
    if (Array.isArray(c.progress)) {
      c.progress.forEach(p => {
        if (typeof p.score === "number") {
          totalScoreSum += p.score;
          totalScoreCount++;
        }
      });
    }
  });
  const averageScore = totalScoreCount > 0 ? (totalScoreSum / totalScoreCount) : 0;

  // Domain performance
  const domains = await Domain.find({}).lean();
  const domainPerformance = await Promise.all(domains.map(async (domain) => {
    const domainCandidates = candidates.filter(c => c.workDomain && c.workDomain.id && String(c.workDomain.id) === String(domain._id));
    // For each candidate, calculate their average score in this domain using CandidateInterviewRound
    const candidateAverages = await Promise.all(domainCandidates.map(async c => {
      const performances = await CandidateInterviewRound.find({ candidateId: c._id, domainId: domain._id }).lean();
      if (performances.length > 0) {
        const totalScore = performances.reduce((acc, p) => acc + (p.percentage || 0), 0);
        return totalScore / performances.length;
      }
      return 0;
    }));
    // Average the candidate averages for the domain
    const averageScore = candidateAverages.length > 0 ? (candidateAverages.reduce((a, b) => a + b, 0) / candidateAverages.length) : 0;
    return {
      domain: domain.domainname,
      candidates: domainCandidates.length,
      averageScore,
    };
  }));

  // Top domain by average score
  const topDomain = domainPerformance.reduce((top, curr) => (curr.averageScore > (top?.averageScore || 0) ? curr : top), null)?.domain || null;

  // Round performance
  const rounds = await Round.find({}).lean();
  const roundPerformance = await Promise.all(rounds.map(async round => {
    // Find all CandidateInterviewRound docs for this round
    const allAttempts = await CandidateInterviewRound.find({ roundId: round._id }).lean();
    // Average score for this round
    const averageScore = allAttempts.length > 0 ? (allAttempts.reduce((sum, p) => sum + (p.percentage || 0), 0) / allAttempts.length) : 0;
    // Number of questions assigned to this round (from round.questionsCount or similar)
    const questions = typeof round.questionsCount === 'number' ? round.questionsCount : 0;
    // Total number of questions in the question bank for this round
    const questionBank = await Question.countDocuments({ roundname: round._id });
    return {
      _id: round._id,
      round: round.roundname,
      type: round.type || "",
      questions,
      questionBank,
      averageScore,
    };
  }));

  // Top performers (top 5 by average score)
  const allowedStatuses = [
    'in-progress',
    'waiting-for-assignment',
    'assigned-interviewer',
    'assigned-admin',
    'waiting-for-admin-assignment',
  ];
  const topPerformers = await Promise.all(candidates.map(async c => {
    let averageScore = 0;
    let roundsCompleted = 0;
    let totalRounds = 0;
    let domainId = c.workDomain?.id;
    let domainName = c.workDomain?.name || "";
    if (domainId) {
      const performances = await CandidateInterviewRound.find({ candidateId: c._id, domainId }).lean();
      roundsCompleted = performances.length;
      const domainDoc = await Domain.findById(domainId).lean();
      totalRounds = Array.isArray(domainDoc?.rounds) ? domainDoc.rounds.length : 0;
      if (roundsCompleted > 0) {
        const totalScore = performances.reduce((acc, p) => acc + (p.percentage || 0), 0);
        averageScore = totalScore / roundsCompleted;
      }
    }
    return {
      _id: c._id,
      name: c.username || c.email,
      domain: domainName,
      averageScore,
      roundsCompleted,
      totalRounds,
      status: c.status || "",
    };
  }))
    .then(arr => arr
      .filter(c => allowedStatuses.includes((c.status || '').toLowerCase()))
      .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
      .slice(0, 5));

  return NextResponse.json({
    overallStats: {
      totalCandidates,
      averageScore,
      topDomain,
    },
    domainPerformance,
    roundPerformance,
    topPerformers,
  });
} 