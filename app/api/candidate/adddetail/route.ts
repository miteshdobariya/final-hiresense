import { connect } from "@/dbConfig/dbConfig"
import candidates from "@/models/candidates"
import { type NextRequest, NextResponse } from "next/server"
import Domain from "@/models/domains"
import Round from "@/models/rounds"
import Companion from "@/models/companions"
import mongoose from "mongoose"

export async function POST(req: NextRequest) {
  try {
    // Connect to database
    await connect()

    const reqBody = await req.json()

    const {
      email,
      username,
      address,
      phonenumber,
      dateofBirth,
      city,
      state,
      skills,
      userId,
      nationality,
      zipCode,
      gender,
      country,
      profilePhoto,
      education,
      currentround,
    } = reqBody

    // Accept workDomain as an object with id and name, or as a single value
    let workDomain = reqBody.workDomain || null
    let workDomainId = null
    let workDomainName = null
    
    if (workDomain) {
      if (typeof workDomain === 'object' && workDomain.id && workDomain.name) {
        workDomainId = workDomain.id
        workDomainName = workDomain.name
      } else if (typeof workDomain === 'string' && mongoose.Types.ObjectId.isValid(workDomain)) {
        // Only id provided, look up name
        const domainDoc = await Domain.findById(workDomain)
        workDomainId = workDomain
        workDomainName = domainDoc ? domainDoc.domainname : null
      } else if (typeof workDomain === 'string') {
        // Only name provided, look up id
        const domainDoc = await Domain.findOne({ domainname: workDomain })
        workDomainId = domainDoc ? domainDoc._id : null
        workDomainName = workDomain
      }
    }

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ error: "User ID is required", success: false }, { status: 400 })
    }

    if (!email || !username || !phonenumber) {
      return NextResponse.json(
        { error: "Email, username, and phone number are required", success: false },
        { status: 400 },
      )
    }

    // Look up companion based on email domain
    const emailDomain = email.split('@')[1]
    let companion = null
    if (emailDomain) {
      console.log("Looking up companion for email domain:", emailDomain)
      companion = await Companion.findOne({ 
        emailDomain,
        isActive: true 
      })
      console.log("Found companion:", companion)
    }

    // Check if candidate already exists
    const existingCandidate = await candidates.findOne({ _id: userId })

    if (existingCandidate) {
      // Defensive: ensure progress is always an array
      if (!Array.isArray(existingCandidate.progress)) {
        existingCandidate.progress = [];
      }

      // --- Domain Change Logic ---
      const previousDomainId = existingCandidate.workDomain?.id?.toString();
      const newDomainId = workDomainId?.toString();

      if (newDomainId && newDomainId !== previousDomainId) {
        // Mark previous domain's progress as 'abandoned' if it exists
        if (previousDomainId) {
          const previousProgress = existingCandidate.progress.find((p: any) => p.domainId?.toString() === previousDomainId);
          if (previousProgress) {
            previousProgress.status = 'abandoned';
          }
        }
        // Find or create progress for the new domain
        let newDomainProgress = existingCandidate.progress.find((p: any) => p.domainId?.toString() === newDomainId);
        if (newDomainProgress) {
          // If returning to a domain, mark it as in-progress
          newDomainProgress.status = 'in-progress';
        } else {
          // If it's a completely new domain, add a new progress entry
          existingCandidate.progress.push({
            domainId: workDomainId,
            domainName: workDomainName,
            currentround: 0,
            currentroundname: "",
            status: 'in-progress'
          });
        }

        // --- Recalculate top-level status for the new domain ---
        const domainDoc = await Domain.findById(newDomainId).lean() as { rounds?: any[] };
        const totalRounds = domainDoc && Array.isArray(domainDoc.rounds) ? domainDoc.rounds.length : 0;
        newDomainProgress = existingCandidate.progress.find((p: any) => p.domainId?.toString() === newDomainId);
        if (newDomainProgress && totalRounds > 0 && newDomainProgress.currentround >= totalRounds) {
          newDomainProgress.status = "completed";
          existingCandidate.status = "waiting-for-assignment";
        } else {
          existingCandidate.status = "in-progress";
        }
        // --- End status recalculation ---
      }
      // --- End of Domain Change Logic ---

      // Update existing candidate
      const updateData: any = {
        email,
        username,
        address: address || "",
        dateofBirth: dateofBirth || "",
        city: city || "",
        state: state || "",
        skills: skills || [],
        updatedAt: new Date(),
        gender: gender,
        zipCode: zipCode,
        nationality: nationality,
        country: country || "",
        profilePhoto: profilePhoto || "",
        education: education || [],
        workDomain: { id: workDomainId, name: workDomainName },
        progress: existingCandidate.progress, // Pass the updated progress array
        resume: reqBody.resume || existingCandidate.resume,
        professionalDetails: reqBody.professionalDetails || existingCandidate.professionalDetails,
        companion: companion?._id || null,
      }
      
      console.log("Updating existing candidate with companion:", companion?._id)
      
      // Check if phone number has changed
      const phoneNumberChanged = existingCandidate.phonenumber !== phonenumber;
      
      // Only include phone number in update if it has changed
      if (phoneNumberChanged) {
        updateData.phonenumber = phonenumber;
      }
      
      const updatedCandidate = await candidates.findOneAndUpdate(
        { _id: userId },
        updateData,
        { new: true, runValidators: true },
      )

      return NextResponse.json(
        {
          message: "Profile updated successfully",
          savedcandidates: updatedCandidate,
          success: true,
        },
        { status: 200 },
      )
    } else {
      // --- Find the first common round ---
      const commonDomain = await Domain.findOne({ domainname: "common" }).lean() as any;
      
      let firstRound = null;
      if (commonDomain) {
        firstRound = await Round.findOne({ domainname: commonDomain._id }).sort({ roundnumber: 1 }).lean() as any;
      }

      // Create new candidate
      const newCandidate = new candidates({
        email,
        username,
        address: address || "",
        phonenumber,
        dateofBirth: dateofBirth || "",
        city: city || "",
        state: state || "",
        skills: skills || [],
        createdAt: new Date(),
        gender: gender,
        zipCode: zipCode,
        nationality: nationality,
        country: country || "",
        profilePhoto: profilePhoto || "",
        education: education || [],
        workDomain: { id: workDomainId, name: workDomainName },
        // Initialize progress for the selected domain AND the common starting round
        progress: [
          {
            domainId: workDomainId,
            domainName: workDomainName,
            // The candidate starts at index 0, which is the first round.
            currentround: 0, 
            // The name of the first round is set here.
            currentroundname: firstRound ? firstRound.roundname : "Registered",
            status: "in-progress",
          },
        ],
        status: "in-progress",
        resume: reqBody.resume || {},
        professionalDetails: reqBody.professionalDetails || {},
        companion: companion?._id || null,
      })

      console.log("Creating new candidate with companion:", companion?._id)

      const savedCandidate = await newCandidate.save()

      return NextResponse.json(
        {
          message: "Profile created successfully",
          savedcandidates: savedCandidate,
          success: true,
        },
        { status: 201 },
      )
    }
  } catch (error: any) {
    // Handle duplicate key errors specifically
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return NextResponse.json(
        { 
          error: `A candidate with this ${field} (${value}) already exists. Please use a different ${field}.` 
        },
        { status: 409 }
      )
    }
    
    return NextResponse.json({ error: error.message || "Internal Server Error", details: error }, { status: 500 })
  }
}
