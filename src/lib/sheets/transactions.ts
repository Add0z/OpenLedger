import { Transaction } from "../domain/types";
import { readRange, appendRows } from "./client";

const SHEET = "Transactions";

function rowToTransaction(row: string[]): Transaction {
  return {
    id: row[0] ?? "",
    date: row[1] ?? "",
    description: row[2] ?? "",
    created_at: row[3] ?? "",
  };
}

export async function getTransactions(
  accessToken: string,
  spreadsheetId: string
): Promise<Transaction[]> {
  const rows = await readRange(accessToken, spreadsheetId, `${SHEET}!A2:D`);
  return rows.filter((r) => r[0]).map(rowToTransaction);
}

export async function addTransaction(
  accessToken: string,
  spreadsheetId: string,
  transaction: Transaction
): Promise<void> {
  await appendRows(accessToken, spreadsheetId, `${SHEET}!A:D`, [
    [transaction.id, transaction.date, transaction.description, transaction.created_at],
  ]);
}
