import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getTransactions, addTransaction } from "@/lib/sheets/transactions";
import { addEntries } from "@/lib/sheets/entries";
import { logAuditEvent } from "@/lib/sheets/audit";
import { detectConflict } from "@/lib/sheets/client";
import { createTransaction } from "@/lib/domain/accounting";
import { validateTransaction, validateEntry } from "@/lib/domain/validation";

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
    const transactions = await getTransactions(session.accessToken, spreadsheetId);
    return NextResponse.json({ transactions });
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

    // Conflict detection
    const knownRevision = body.knownRevision ? parseInt(String(body.knownRevision), 10) : 0;
    if (knownRevision > 0) {
      const conflict = await detectConflict(
        session.accessToken,
        spreadsheetId,
        knownRevision
      );
      if (conflict.hasConflict) {
        return NextResponse.json({ error: conflict.message, conflict }, { status: 409 });
      }
    }

    validateTransaction(body);
    const entries: Array<{ account_id: string; amount: number; currency: string }> = body.entries ?? [];
    entries.forEach(validateEntry);

    const result = createTransaction(
      body.date,
      body.description,
      entries,
      session.user?.email ?? "unknown"
    );

    await addTransaction(session.accessToken, spreadsheetId, result.transaction);
    await addEntries(session.accessToken, spreadsheetId, result.entries);
    await logAuditEvent(
      session.accessToken,
      spreadsheetId,
      "CREATE",
      "Transaction",
      result.transaction.id,
      session.user?.email ?? "unknown"
    );

    return NextResponse.json({ transaction: result.transaction, entries: result.entries }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
