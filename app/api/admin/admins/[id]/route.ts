import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/dbConfig/dbConfig";
import Candidate from "@/models/candidates";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  await connect();
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Admin ID is required" }, { status: 400 });
  }
  const admin = await Candidate.findOne({ _id: id, role: { $in: ['admin', 'hr'] } }).lean() as any;
  if (!admin) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: admin._id,
    name: admin.name || admin.username || "",
    username: admin.username || "",
    email: admin.email || ""
  });
} 