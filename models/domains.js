import mongoose from "mongoose"

const domainSchema = new mongoose.Schema({
  domainname: { type: String, required: true, unique: true },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  rounds: [{ 
    roundId: { type: mongoose.Schema.Types.ObjectId, ref: "Round" },
    sequence: { type: Number, default: 0 }
  }],
})

const Domain = mongoose.models.Domain || mongoose.model("Domain", domainSchema)

export default Domain
