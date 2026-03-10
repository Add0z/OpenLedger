import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getAccounts, addAccount } from "@/lib/sheets/accounts";
import { logAuditEvent } from "@/lib/sheets/audit";
import { validateAccount } from "@/lib/domain/validation";
import { parseAmount } from "@/lib/domain/accounting";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const spreadsheetId = req.nextUrl.searchParams.get("spreadsheetId");
  if (!spreadsheetId) {
    return NextResponse.json({ error: "spreadsheetId is required" }, { status: 400 });
  }

  try {
    const accounts = await getAccounts(session.accessToken, spreadsheetId);
    return NextResponse.json({ accounts });
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

  const spreadsheetId = req.nextUrl.searchParams.get("spreadsheetId");
  if (!spreadsheetId) {
    return NextResponse.json({ error: "spreadsheetId is required" }, { status: 400 });
  }

  try {
    const body = await req.json();
    validateAccount(body);

    // Parse initial balance — accepts decimal string (e.g. "1500.00") → integer cents
    const initialBalance = body.initialBalance
      ? parseAmount(String(body.initialBalance))
      : 0;

    const account = {
      id: uuidv4(),
      name: body.name,
      type: body.type,
      currency: body.currency,
      active: body.active !== false,
      initialBalance,
    };

    await addAccount(session.accessToken, spreadsheetId, account);

    await logAuditEvent(
      session.accessToken,
      spreadsheetId,
      "CREATE",
      "Account",
      account.id,
      session.user?.email ?? "unknown"
    );

    return NextResponse.json({ account }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

