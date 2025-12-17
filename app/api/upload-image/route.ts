// Deprecated S3-based upload route retained only for backward compatibility
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  return NextResponse.json({ error: "S3 storage is disabled" }, { status: 410 });
}

export async function POST(_req: NextRequest) {
  return NextResponse.json({ error: "S3 storage is disabled" }, { status: 410 });
}