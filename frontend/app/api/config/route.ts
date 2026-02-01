import { NextResponse } from "next/server";

// Server-side environment variables (NOT exposed to browser directly)
const PRIMUS_APP_ID = process.env.PRIMUS_APP_ID;
const PRIMUS_APP_SECRET = process.env.PRIMUS_APP_SECRET;
const API_URL = process.env.API_URL || "http://localhost:4000";

export async function GET() {
  if (!PRIMUS_APP_ID || !PRIMUS_APP_SECRET) {
    return NextResponse.json(
      { error: "Primus credentials not configured" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    primusAppId: PRIMUS_APP_ID,
    primusAppSecret: PRIMUS_APP_SECRET,
    apiUrl: API_URL,
  });
}
