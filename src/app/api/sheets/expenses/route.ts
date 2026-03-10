import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getExpenses, addExpense } from "@/lib/sheets/expenses";
import { logAuditEvent } from "@/lib/sheets/audit";
import { validateExpense } from "@/lib/domain/validation";
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
        const expenses = await getExpenses(session.accessToken, spreadsheetId);
        return NextResponse.json({ expenses });
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

        // Parse amount from decimal string to integer cents
        const amount = body.amount
            ? (typeof body.amount === "string" ? parseAmount(body.amount) : body.amount)
            : 0;

        const expense = {
            id: uuidv4(),
            date: body.date,
            description: body.description,
            account_id: body.account_id,
            category_id: body.category_id,
            amount,
            currency: body.currency,
            created_at: new Date().toISOString(),
        };

        validateExpense(expense);

        await addExpense(session.accessToken, spreadsheetId, expense);

        await logAuditEvent(
            session.accessToken,
            spreadsheetId,
            "CREATE",
            "Expense",
            expense.id,
            session.user?.email ?? "unknown"
        );

        return NextResponse.json({ expense }, { status: 201 });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
