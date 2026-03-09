import { Budget } from "../domain/types";
import { readRange, appendRows } from "./client";

const SHEET = "Budgets";

function rowToBudget(row: string[]): Budget {
  return {
    id: row[0] ?? "",
    category_id: row[1] ?? "",
    period: row[2] ?? "",
    amount: parseInt(row[3] ?? "0", 10),
  };
}

export async function getBudgets(
  accessToken: string,
  spreadsheetId: string
): Promise<Budget[]> {
  const rows = await readRange(accessToken, spreadsheetId, `${SHEET}!A2:D`);
  return rows.filter((r) => r[0]).map(rowToBudget);
}

export async function addBudget(
  accessToken: string,
  spreadsheetId: string,
  budget: Budget
): Promise<void> {
  await appendRows(accessToken, spreadsheetId, `${SHEET}!A:D`, [
    [budget.id, budget.category_id, budget.period, budget.amount],
  ]);
}
