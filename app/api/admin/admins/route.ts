import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { connect } from "@/dbConfig/dbConfig";
import Candidate from "@/models/candidates";

export async function GET(req: NextRequest) {
  await connect();
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  if (!adminEmails.includes(session.user.email) && !['admin', 'hr'].includes(session.user.role)) {
    return NextResponse.json({ error: "Not authorized to view admins." }, { status: 403 });
  }
  const allAdminsAndHRs = await Candidate.find({ role: { $in: ['admin', 'hr'] } });
  const admins = allAdminsAndHRs.map((admin) => ({
    id: admin._id,
    name: admin.name || admin.username || "",
    username: admin.username || "",
    email: admin.email || "",
    role: admin.role || ""
  }));
  return NextResponse.json({ admins });
}

export async function PATCH(req: NextRequest) {
  await connect();
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  if (!adminEmails.includes(session.user.email)) {
    return NextResponse.json({ error: "Only super admins can demote admins." }, { status: 403 });
  }
  const { adminId } = await req.json();
  if (!adminId) {
    return NextResponse.json({ error: "adminId is required" }, { status: 400 });
  }
  const updated = await Candidate.findByIdAndUpdate(adminId, { role: "interviewer" }, { new: true });
  if (!updated) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }
  return NextResponse.json({ message: "Admin demoted to interviewer", admin: updated });
}

export async function GET_byId(req: NextRequest, { params }: { params: { id: string } }) {
  await connect();
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Admin ID is required" }, { status: 400 });
  }
  const admin = await Candidate.findOne({ _id: id, role: 'admin' }).lean();
  if (!admin) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }
  // Ensure admin is not an array and has the expected properties
  if (Array.isArray(admin) || !admin._id) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: admin._id,
    name: (admin as any).name || (admin as any).username || "",
    username: (admin as any).username || "",
    email: (admin as any).email || ""
  });
} 