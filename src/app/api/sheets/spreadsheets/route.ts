import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { listSpreadsheets, createYearSpreadsheet } from "@/lib/sheets/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const spreadsheets = await listSpreadsheets(session.accessToken);
    return NextResponse.json({ spreadsheets });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const year = parseInt(String(body.year), 10);
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }
    const spreadsheetId = await createYearSpreadsheet(session.accessToken, year);
    return NextResponse.json({ spreadsheetId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
