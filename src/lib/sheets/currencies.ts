import { Currency } from "../domain/types";
import { readRange, appendRows } from "./client";

const SHEET = "Currencies";

function rowToCurrency(row: string[]): Currency {
  return {
    code: row[0] ?? "",
    name: row[1] ?? "",
    decimals: parseInt(row[2] ?? "2", 10),
  };
}

export async function getCurrencies(
  accessToken: string,
  spreadsheetId: string
): Promise<Currency[]> {
  const rows = await readRange(accessToken, spreadsheetId, `${SHEET}!A2:C`);
  return rows.filter((r) => r[0]).map(rowToCurrency);
}

export async function addCurrency(
  accessToken: string,
  spreadsheetId: string,
  currency: Currency
): Promise<void> {
  await appendRows(accessToken, spreadsheetId, `${SHEET}!A:C`, [
    [currency.code, currency.name, currency.decimals],
  ]);
}
