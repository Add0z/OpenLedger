import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getBudgets, addBudget } from "@/lib/sheets/budgets";
import { logAuditEvent } from "@/lib/sheets/audit";
import { validateBudget } from "@/lib/domain/validation";
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
    const budgets = await getBudgets(session.accessToken, spreadsheetId);
    return NextResponse.json({ budgets });
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
    validateBudget(body);

    const budget = {
      id: uuidv4(),
      category_id: body.category_id,
      period: body.period,
      amount: body.amount,
    };

    await addBudget(session.accessToken, spreadsheetId, budget);
    await logAuditEvent(
      session.accessToken,
      spreadsheetId,
      "CREATE",
      "Budget",
      budget.id,
      session.user?.email ?? "unknown"
    );

    return NextResponse.json({ budget }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
