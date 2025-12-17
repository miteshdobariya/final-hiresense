import mongoose from "mongoose"

// Schema for candidate assignment details
const candidateAssignmentSchema = new mongoose.Schema({
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "candidates", required: true },
  candidateName: { type: String, required: true },
  candidateEmail: { type: String, required: true },
  workDomain: { type: String, required: true },
  assignedAt: { type: Date, default: Date.now },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "candidates" }, // Admin who assigned
  status: { 
    type: String, 
    enum: ["assigned", "in-progress", "completed", "cancelled"], 
    default: "assigned" 
  },
  currentRound: { type: Number, default: 0 },
  totalRounds: { type: Number, default: 0 },
  lastActivity: { type: Date },
  notes: { type: String },
  // Interview round tracking
  interviewRounds: [{
    roundId: { type: mongoose.Schema.Types.ObjectId, ref: "rounds" },
    roundName: { type: String },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    score: { type: Number },
    passed: { type: Boolean },
    feedback: { type: String },
    status: { 
      type: String, 
      enum: ["scheduled", "in-progress", "completed", "cancelled"], 
      default: "scheduled" 
    }
  }]
}, { timestamps: true })

const interviewerSchema = new mongoose.Schema({
  // Reference to original user in candidates collection
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "candidates", required: true },
  
  // Personal Information
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  role: { type: String, required: true }, // e.g., "Senior Technical Lead"
  status: { type: String, enum: ["Active", "Inactive", "Busy"], default: "Active" },
  experience: { type: String },
  skills: { type: [String], default: [] },
  
  // Interview Statistics
  activeInterviews: { type: Number, default: 0 },
  completedInterviews: { type: Number, default: 0 },
  
  // Assigned Candidates Array
  assignedCandidates: [candidateAssignmentSchema],
  
  // Profile completion status
  profileCompleted: { type: Boolean, default: false },
  profileCompletedAt: { type: Date },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

// Update the updatedAt field on save
interviewerSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

// Virtual for getting active assignments count
interviewerSchema.virtual('activeAssignmentsCount').get(function() {
  return this.assignedCandidates.filter(assignment => 
    ['assigned', 'in-progress'].includes(assignment.status)
  ).length
})

// Method to add a candidate assignment
interviewerSchema.methods.assignCandidate = function(candidateData) {
  const assignment = {
    candidateId: candidateData.candidateId,
    candidateName: candidateData.candidateName,
    candidateEmail: candidateData.candidateEmail,
    workDomain: candidateData.workDomain,
    assignedBy: candidateData.assignedBy,
    totalRounds: candidateData.totalRounds || 0,
    notes: candidateData.notes || ""
  }
  
  this.assignedCandidates.push(assignment)
  this.activeInterviews = this.activeAssignmentsCount
  return this.save()
}

// Method to update assignment status
interviewerSchema.methods.updateAssignmentStatus = function(candidateId, status, roundData = null) {
  const assignment = this.assignedCandidates.find(a => a.candidateId.toString() === candidateId.toString())
  
  if (assignment) {
    assignment.status = status
    assignment.lastActivity = new Date()
    
    if (roundData) {
      assignment.interviewRounds.push(roundData)
      assignment.currentRound = assignment.interviewRounds.length
    }
    
    this.activeInterviews = this.activeAssignmentsCount
    return this.save()
  }
  
  throw new Error('Assignment not found')
}

// Method to remove candidate assignment
interviewerSchema.methods.removeAssignment = function(candidateId) {
  this.assignedCandidates = this.assignedCandidates.filter(
    a => a.candidateId.toString() !== candidateId.toString()
  )
  this.activeInterviews = this.activeAssignmentsCount
  return this.save()
}

// Prevent OverwriteModelError
const Interviewer = mongoose.models.interviewers || mongoose.model("interviewers", interviewerSchema)

export default Interviewer 