import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getQuickAddRows, addQuickAddRow, processQuickAddRow, clearQuickAddRows } from "@/lib/sheets/quickadd";
import { addTransaction } from "@/lib/sheets/transactions";
import { addEntries } from "@/lib/sheets/entries";
import { logAuditEvent } from "@/lib/sheets/audit";

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
    const rows = await getQuickAddRows(session.accessToken, spreadsheetId);
    return NextResponse.json({ rows });
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

    if (body.action === "process") {
      // Process QuickAdd rows into transactions
      const rows = await getQuickAddRows(session.accessToken, spreadsheetId);
      const results = [];

      for (const row of rows) {
        if (!row.date || !row.account || !row.amount) continue;

        const txWithEntries = processQuickAddRow(
          row,
          body.accountId ?? row.account,
          body.offsetAccountId ?? row.category,
          body.currency ?? "USD",
          session.user?.email ?? "unknown"
        );

        await addTransaction(session.accessToken, spreadsheetId, txWithEntries.transaction);
        await addEntries(session.accessToken, spreadsheetId, txWithEntries.entries);
        await logAuditEvent(
          session.accessToken,
          spreadsheetId,
          "CREATE_FROM_QUICKADD",
          "Transaction",
          txWithEntries.transaction.id,
          session.user?.email ?? "unknown"
        );

        results.push(txWithEntries);
      }

      if (rows.length > 0) {
        await clearQuickAddRows(session.accessToken, spreadsheetId, rows.length + 1);
      }

      return NextResponse.json({ processed: results.length, transactions: results });
    }

    // Add a new QuickAdd row
    const row = {
      date: body.date,
      description: body.description ?? "",
      account: body.account ?? "",
      category: body.category ?? "",
      amount: parseInt(String(body.amount), 10),
    };

    await addQuickAddRow(session.accessToken, spreadsheetId, row);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
