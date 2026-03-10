import { Account, AccountType } from "../domain/types";
import { parseAmount } from "../domain/accounting";
import { readRange, appendRows, updateRange } from "./client";

const SHEET = "Accounts";

function rowToAccount(row: string[]): Account {
  return {
    id: row[0] ?? "",
    name: row[1] ?? "",
    type: (row[2] ?? "checking") as AccountType,
    currency: row[3] ?? "USD",
    active: row[4] === "TRUE" || row[4] === "true" || row[4] === "1",
    initialBalance: row[5] ? parseAmount(row[5]) : 0,
  };
}

function accountToRow(account: Account): (string | boolean | number)[] {
  return [account.id, account.name, account.type, account.currency, account.active, (account.initialBalance ?? 0) / 100];
}

export async function getAccounts(
  accessToken: string,
  spreadsheetId: string
): Promise<Account[]> {
  const rows = await readRange(accessToken, spreadsheetId, `${SHEET}!A2:F`);
  return rows.filter((r) => r[0]).map(rowToAccount);
}

export async function addAccount(
  accessToken: string,
  spreadsheetId: string,
  account: Account
): Promise<void> {
  await appendRows(accessToken, spreadsheetId, `${SHEET}!A:F`, [
    accountToRow(account) as (string | number | boolean)[],
  ]);
}

export async function updateAccount(
  accessToken: string,
  spreadsheetId: string,
  account: Account,
  rowIndex: number // 1-based row index (2 = first data row)
): Promise<void> {
  await updateRange(
    accessToken,
    spreadsheetId,
    `${SHEET}!A${rowIndex}:F${rowIndex}`,
    [accountToRow(account) as (string | number | boolean)[]]
  );
}
