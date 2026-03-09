import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getConfigValue, setConfigValue } from "@/lib/sheets/config";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const spreadsheetId = req.nextUrl.searchParams.get("spreadsheetId");
  const key = req.nextUrl.searchParams.get("key");
  if (!spreadsheetId || !key) {
    return NextResponse.json({ error: "spreadsheetId and key are required" }, { status: 400 });
  }

  try {
    const value = await getConfigValue(session.accessToken, spreadsheetId, key);
    return NextResponse.json({ key, value });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const spreadsheetId = req.nextUrl.searchParams.get("spreadsheetId");
  if (!spreadsheetId) {
    return NextResponse.json({ error: "spreadsheetId is required" }, { status: 400 });
  }

  try {
    const body = await req.json();
    if (!body.key || body.value === undefined) {
      return NextResponse.json({ error: "key and value are required" }, { status: 400 });
    }
    await setConfigValue(session.accessToken, spreadsheetId, body.key, String(body.value));
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
