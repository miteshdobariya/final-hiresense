import mongoose from "mongoose"

const proctoringEventSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "candidates", required: true },
    roundId: { type: mongoose.Schema.Types.ObjectId, ref: "Round", required: true },
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Round" },
    eventType: {
      type: String,
      enum: [
        "TAB_HIDDEN",
        "TAB_VISIBLE",
        "WINDOW_BLUR",
        "WINDOW_FOCUS",
        "WINDOW_BEFORE_UNLOAD",
        "WINDOW_PAGE_HIDE",
        "ADMIN_DECISION",
      ],
      required: true,
    },
    details: { type: mongoose.Schema.Types.Mixed },
    emittedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "acknowledged", "resolved"],
      default: "pending",
    },
    decision: {
      type: String,
      enum: ["allow", "disqualify", "warn", null],
      default: null,
    },
    decisionNotes: { type: String },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: "candidates" },
    lastBroadcastAt: { type: Date },
    broadcastCount: { type: Number, default: 0 },
    lastEmailSentAt: { type: Date },
    emailSentCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

const ProctoringEvent =
  mongoose.models.ProctoringEvent || mongoose.model("ProctoringEvent", proctoringEventSchema)

export default ProctoringEvent

