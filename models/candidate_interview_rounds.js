import mongoose from "mongoose";

const questionResultSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  question: { type: String, required: true },
  candidateAnswer: { type: String },
  correctAnswer: { type: String },
  isCorrect: { type: Boolean, required: true },
  type: { type: String, enum: ["MCQ", "Coding", "Project"], required: true },
  // Optionally store options for MCQ
  options: [{ type: String }],
  // Optionally store code evaluation for Coding/Project
  codeEvaluation: { type: String },
});

const candidateInterviewRoundSchema = new mongoose.Schema({
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "candidates", required: true },
  domainId: { type: mongoose.Schema.Types.ObjectId, ref: "ProfileDomain", required: true },
  domainName: { type: String, required: true },
  roundId: { type: mongoose.Schema.Types.ObjectId, ref: "rounds", required: true },
  roundName: { type: String, required: true },
  startedAt: { type: Date, required: true },
  completedAt: { type: Date },
  durationSeconds: { type: Number },
  questions: [questionResultSchema],
  totalQuestions: { type: Number, required: true },
  correctAnswers: { type: Number, required: true },
  percentage: { type: Number, required: true },
  passed: { type: Boolean, required: true },
  // Optionally store feedback or interviewer notes
  feedback: { type: String },
});

export default mongoose.models.candidate_interview_rounds ||
  mongoose.model("candidate_interview_rounds", candidateInterviewRoundSchema); 