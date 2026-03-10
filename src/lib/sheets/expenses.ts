import { Expense } from "../domain/types";
import { parseAmount } from "../domain/accounting";
import { readRange, appendRows } from "./client";

const SHEET = "Expenses";

function rowToExpense(row: string[]): Expense {
    return {
        id: row[0] ?? "",
        date: row[1] ?? "",
        description: row[2] ?? "",
        account_id: row[3] ?? "",
        category_id: row[4] ?? "",
        amount: row[5] ? parseAmount(row[5]) : 0,
        currency: row[6] ?? "",
        created_at: row[7] ?? "",
    };
}

export async function getExpenses(
    accessToken: string,
    spreadsheetId: string
): Promise<Expense[]> {
    const rows = await readRange(accessToken, spreadsheetId, `${SHEET}!A2:H`);
    return rows.filter((r) => r[0]).map(rowToExpense);
}

export async function addExpense(
    accessToken: string,
    spreadsheetId: string,
    expense: Expense
): Promise<void> {
    await appendRows(accessToken, spreadsheetId, `${SHEET}!A:H`, [
        [
            expense.id,
            expense.date,
            expense.description,
            expense.account_id,
            expense.category_id,
            expense.amount / 100,
            expense.currency,
            expense.created_at,
        ],
    ]);
}
