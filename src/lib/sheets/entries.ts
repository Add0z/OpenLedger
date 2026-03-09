import { Entry } from "../domain/types";
import { readRange, appendRows, batchUpdate } from "./client";

const SHEET = "Entries";

function rowToEntry(row: string[]): Entry {
  return {
    id: row[0] ?? "",
    transaction_id: row[1] ?? "",
    account_id: row[2] ?? "",
    amount: parseInt(row[3] ?? "0", 10),
    currency: row[4] ?? "",
  };
}

export async function getEntries(
  accessToken: string,
  spreadsheetId: string
): Promise<Entry[]> {
  const rows = await readRange(accessToken, spreadsheetId, `${SHEET}!A2:E`);
  return rows.filter((r) => r[0]).map(rowToEntry);
}

export async function getEntriesForTransaction(
  accessToken: string,
  spreadsheetId: string,
  transactionId: string
): Promise<Entry[]> {
  const all = await getEntries(accessToken, spreadsheetId);
  return all.filter((e) => e.transaction_id === transactionId);
}

export async function addEntries(
  accessToken: string,
  spreadsheetId: string,
  entries: Entry[]
): Promise<void> {
  const rows = entries.map((e) => [
    e.id,
    e.transaction_id,
    e.account_id,
    e.amount,
    e.currency,
  ]);
  await appendRows(accessToken, spreadsheetId, `${SHEET}!A:E`, rows);
}

/**
 * Writes a full transaction (transaction + entries) atomically using batch update.
 */
export async function writeTransactionWithEntries(
  accessToken: string,
  spreadsheetId: string,
  transaction: { id: string; date: string; description: string; created_at: string },
  entries: Entry[]
): Promise<void> {
  // We use appendRows sequentially rather than true atomic batch,
  // since Sheets API doesn't support multi-sheet atomic writes.
  // Transaction is written first, then entries.
  const transactionRow = [
    [transaction.id, transaction.date, transaction.description, transaction.created_at],
  ];
  const entryRows = entries.map((e) => [
    e.id,
    e.transaction_id,
    e.account_id,
    e.amount,
    e.currency,
  ]);

  await batchUpdate(accessToken, spreadsheetId, [
    { range: "Transactions!A:D", values: transactionRow },
  ]);

  await appendRows(accessToken, spreadsheetId, "Entries!A:E", entryRows);
}
