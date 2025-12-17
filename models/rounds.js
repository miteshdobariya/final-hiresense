import mongoose from "mongoose"

const roundSchema = new mongoose.Schema({
  // Name of the round (e.g., 'Technical', 'HR')
  roundname: { type: String, required: true },
  // Optional description of the round
  description: { type: String },
  // Type of round (e.g., 'MCQ', 'Coding')
  type: { type: String, enum: ["MCQ", "Coding", "Project"], required: true },
  // Duration of the round in minutes
  duration: { type: Number },
  // Planned number of questions for this round
  questionsCount: { type: Number },
  // Sequence/order of the round within the domain (now just a global order)
  sequence: { type: Number, default: 0 },
  // Status of the round (e.g., 'Draft', 'Active')
  status: { type: String },
  currentQuestionsCount: { type: Number, default: 0 },
})

const Round = mongoose.models.Round || mongoose.model("Round", roundSchema)

export default Round
