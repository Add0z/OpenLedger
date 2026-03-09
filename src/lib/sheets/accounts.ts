import { Account, AccountType } from "../domain/types";
import { readRange, appendRows, updateRange } from "./client";

const SHEET = "Accounts";

function rowToAccount(row: string[]): Account {
  return {
    id: row[0] ?? "",
    name: row[1] ?? "",
    type: (row[2] ?? "asset") as AccountType,
    currency: row[3] ?? "USD",
    active: row[4] === "TRUE" || row[4] === "true" || row[4] === "1",
  };
}

function accountToRow(account: Account): (string | boolean)[] {
  return [account.id, account.name, account.type, account.currency, account.active];
}

export async function getAccounts(
  accessToken: string,
  spreadsheetId: string
): Promise<Account[]> {
  const rows = await readRange(accessToken, spreadsheetId, `${SHEET}!A2:E`);
  return rows.filter((r) => r[0]).map(rowToAccount);
}

export async function addAccount(
  accessToken: string,
  spreadsheetId: string,
  account: Account
): Promise<void> {
  await appendRows(accessToken, spreadsheetId, `${SHEET}!A:E`, [
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
    `${SHEET}!A${rowIndex}:E${rowIndex}`,
    [accountToRow(account) as (string | number | boolean)[]]
  );
}
