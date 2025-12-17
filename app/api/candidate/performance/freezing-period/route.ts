import { NextRequest, NextResponse } from "next/server";
 
export async function GET(req: NextRequest) {
  const FREEZING_PERIOD_DAYS = parseFloat(process.env.FREEZING_PERIOD_DAYS || "1");
  return NextResponse.json({ days: FREEZING_PERIOD_DAYS });
} 