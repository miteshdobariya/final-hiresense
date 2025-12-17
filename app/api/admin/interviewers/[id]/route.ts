import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { connect } from "@/dbConfig/dbConfig"
import Interviewer from "@/models/interviewers"
import Candidate from "@/models/candidates"
import mongoose from "mongoose"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await connect()
    
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!id) {
      return NextResponse.json({ error: "Interviewer ID is required" }, { status: 400 })
    }

    const interviewer = await Interviewer.findById(id).lean() as any

    if (!interviewer) {
      return NextResponse.json({ error: "Interviewer not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Interviewer details retrieved successfully",
      interviewer: {
        _id: interviewer._id,
        name: interviewer.name,
        username: interviewer.username,
        email: interviewer.email,
        role: interviewer.role,
        experience: interviewer.experience,
        skills: interviewer.skills,
        status: interviewer.status,
        activeInterviews: interviewer.activeInterviews,
        completedInterviews: interviewer.completedInterviews
      },
      success: true,
    }, { status: 200 })

  } catch (error: any) {
    console.error("Error in get interviewer details route:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connect();
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only super admins (emails in ADMIN_EMAILS env) can promote
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  if (!adminEmails.includes(session.user.email)) {
    return NextResponse.json({ error: "Only super admins can promote to admin or hr." }, { status: 403 });
  }

  if (!id) {
    return NextResponse.json({ error: "Interviewer ID is required" }, { status: 400 });
  }

  try {
    // Find the interviewer by ID
    const interviewer = await Interviewer.findById(id);
    if (!interviewer) {
      return NextResponse.json({ error: "Interviewer not found" }, { status: 404 });
    }

    // Get role from request body (default to 'admin' for backward compatibility)
    let role = "admin";
    try {
      const body = await req.json();
      if (body.role && ["admin", "hr"].includes(body.role)) {
        role = body.role;
      }
    } catch (e) {
      // If no body or invalid JSON, default to 'admin'
    }

    // Update the role in the candidates collection
    await Candidate.findByIdAndUpdate(interviewer.userId, { role });

    // Clear assignedInterviewer for all candidates assigned to this interviewer
    await Candidate.updateMany(
      { "assignedInterviewer.interviewerId": new mongoose.Types.ObjectId(interviewer._id) },
      { $set: { assignedInterviewer: null } }
    );

    // Remove the interviewer from the interviewers collection
    await Interviewer.findByIdAndDelete(id);

    return NextResponse.json({ message: `Interviewer promoted to ${role} and removed from interviewers collection` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 