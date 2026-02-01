import { NextResponse } from "next/server";

export async function GET() {
  const PRIMUS_APP_ID = process.env.PRIMUS_APP_ID;
  const PRIMUS_APP_SECRET = process.env.PRIMUS_APP_SECRET;
  const API_URL = process.env.API_URL || "http://localhost:4000";
  const CURRANCE_RECORD_TEMPLATE_ID = process.env.CURRANCE_RECORD_TEMPLATE_ID;
  const CURRANCE_CLAIM_TEMPLATE_ID = process.env.CURRANCE_CLAIM_TEMPLATE_ID;

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
    recordTemplateId: CURRANCE_RECORD_TEMPLATE_ID,
    claimTemplateId: CURRANCE_CLAIM_TEMPLATE_ID,
  });
}
