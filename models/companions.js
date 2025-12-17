import mongoose from "mongoose"

const companionSchema = new mongoose.Schema({
  collegeName: { 
    type: String, 
    required: true, 
    unique: true 
  },
  emailDomain: { 
    type: String, 
    required: true, 
    unique: true 
  },
  description: { 
    type: String 
  },
  domains: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Domain",
    required: true 
  }],
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "candidates",
    required: true 
  },
  settings: {
    allowAllDomains: { 
      type: Boolean, 
      default: false 
    },
    maxCandidates: { 
      type: Number 
    },
    interviewDuration: { 
      type: Number, 
      default: 60 // minutes
    }
  }
}, { 
  timestamps: true 
})

// Index for email domain lookup
companionSchema.index({ emailDomain: 1 })

const Companion = mongoose.models.Companion || mongoose.model("Companion", companionSchema)

export default Companion 