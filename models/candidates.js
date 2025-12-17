import mongoose from "mongoose"

// Simple education schema
const education = new mongoose.Schema({
  degree: { type: String },
  institution: { type: String },
  graduationYear: { type: String },
  gpa: { type: String },
})

const domainProgressSchema = new mongoose.Schema({
  domainId: { type: mongoose.Schema.Types.ObjectId, ref: "ProfileDomain", required: true },
  domainName: { type: String, required: true },
  currentround: { type: Number, default: 0 },
  currentroundname: { type: String, default: "" },
  status: { type: String, enum: ["in-progress", "completed", "abandoned"], default: "in-progress" },
  clearedRounds: [{ type: mongoose.Schema.Types.ObjectId, ref: "rounds" }], // per-domain cleared rounds
});

const userSchema = new mongoose.Schema({
  username: { type: String },
  email: { type: String, required: true },
  phonenumber: { type: String, unique: true, sparse: true },
  address: { type: String },
  dateofBirth: { type: Date },
  city: { type: String },
  state: { type: String },
  gender: { type: String },
  nationality: { type: String },
  zipCode: { type: String },
  // Add top-level status field
  status: {
    type: String,
    enum: [
      "in-progress",
      "waiting-for-assignment",
      "assigned-interviewer",
      "assigned-admin",
      "waiting-for-admin-assignment",
      "final-accepted",
      "rejected",
      "accepted by candidate",
      "rejected by candidate"
    ],
    default: "in-progress"
  },
  finalnote: { type: String },
  workDomain: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "ProfileDomain" },
    name: { type: String },
  },
  workDomainSelectedAt: { type: Date },
  skills: { type: [String] },
  progress: [domainProgressSchema],
  // Add education array
  education: [education],
  role: { type: String,  enum: ["admin", "candidate", "interviewer", "hr"], default: "candidate" },
  lastLogin: { type: Date },
  companion: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Companion" 
  },
  // Interviewer assignment
  assignedInterviewer: {
    interviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "interviewers" },
    assignedAt: { type: Date },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "candidates" }, // Admin who assigned
    status: { 
      type: String, 
      enum: ["assigned", "in-progress", "completed", "cancelled"], 
      default: "assigned" 
    }
  },
  resume: {
    fileName: { type: String },
    fileUrl: { type: String },
    s3Key: { type: String },
    uploadedAt: { type: Date },
    fileSize: { type: Number }
  },
  professionalDetails: {
    isExperienced: { type: Boolean, default: false },
    fixedCurrentCTC: { type: String },
    inHandCTC: { type: String },
    variableCTC: { type: String },
    expectedCTC: { type: String },
    noticePeriod: { type: String },
    yearsOfExperience: { type: String },
    openToRelocate: { type: Boolean },
    currentCompany: { type: String },
    currentCompanyAddress: { type: String },
    companyContactNumber: { type: String },
    currentLocation: { type: String },
    referenceName: { type: String },
    referenceContact: { type: String },
    linkedInUrl: { type: String},
    githubUrl: { type: String},
  },
  assignedRounds: [
    {
      roundNumber: { type: Number, required: true },
      assignedTo: { type: mongoose.Schema.Types.ObjectId, refPath: 'assignedRounds.assignedToModel', required: true },
      assignedToModel: { type: String, enum: ['interviewers', 'admins'], required: true },
      assignedAt: { type: Date, default: Date.now },
      assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
      scheduledDate: { type: Date },
      scheduledTime: { type: String },
      durationMinutes: { type: Number },
      interviewFormat: { type: String, enum: ["online", "offline", "phone", "other"] },
      status: { type: String, enum: ["assigned", "completed", "cancelled"], default: "assigned" },
      feedback: { type: String },
      responseSubmitted: { type: Boolean, default: false }
    }
  ],
  // Store selected question IDs for each round (for exam persistence)
  examQuestions: [{
    roundId: { type: mongoose.Schema.Types.ObjectId, ref: "rounds" },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "questions" }]
  }],
  // Proctoring / discipline
  freezeUntil: { type: Date, default: null },
  freezeReason: { type: String, default: null },
}, { timestamps: true })

// 👇 Prevent OverwriteModelError
const candidates = mongoose.models.candidates || mongoose.model("candidates", userSchema)

export default candidates


