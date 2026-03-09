import { QuickAddRow, TransactionWithEntries } from "../domain/types";
import { readRange, appendRows, updateRange } from "./client";
import { createTransaction } from "../domain/accounting";

const SHEET = "QuickAdd";

function rowToQuickAdd(row: string[]): QuickAddRow {
  return {
    date: row[0] ?? "",
    description: row[1] ?? "",
    account: row[2] ?? "",
    category: row[3] ?? "",
    amount: parseInt(row[4] ?? "0", 10),
  };
}

export async function getQuickAddRows(
  accessToken: string,
  spreadsheetId: string
): Promise<QuickAddRow[]> {
  const rows = await readRange(accessToken, spreadsheetId, `${SHEET}!A2:E`);
  return rows.filter((r) => r[0]).map(rowToQuickAdd);
}

export async function addQuickAddRow(
  accessToken: string,
  spreadsheetId: string,
  row: QuickAddRow
): Promise<void> {
  await appendRows(accessToken, spreadsheetId, `${SHEET}!A:E`, [
    [row.date, row.description, row.account, row.category, row.amount],
  ]);
}

/**
 * Processes QuickAdd rows and converts them into double-entry Transactions + Entries.
 * Each QuickAdd row generates:
 *   - 1 Transaction
 *   - 2 Entries (debit account, credit category/account)
 *
 * Returns the generated TransactionWithEntries records.
 * The caller is responsible for writing them to the Transactions and Entries sheets.
 */
export function processQuickAddRow(
  row: QuickAddRow,
  accountId: string,
  offsetAccountId: string,
  currency: string,
  userId: string
): TransactionWithEntries {
  return createTransaction(
    row.date,
    row.description,
    [
      { account_id: accountId, amount: -row.amount, currency },
      { account_id: offsetAccountId, amount: row.amount, currency },
    ],
    userId
  );
}

/**
 * Clears all data rows from the QuickAdd sheet (leaves header row intact).
 * Call this after processing QuickAdd rows to reset the sheet.
 */
export async function clearQuickAddRows(
  accessToken: string,
  spreadsheetId: string,
  lastRow: number
): Promise<void> {
  if (lastRow < 2) return;
  // Clear rows 2 through lastRow by writing empty strings
  const emptyRows = Array(lastRow - 1).fill(["", "", "", "", ""]);
  await updateRange(
    accessToken,
    spreadsheetId,
    `${SHEET}!A2:E${lastRow}`,
    emptyRows
  );
}
