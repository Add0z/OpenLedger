import { Config } from "../domain/types";
import { readRange, appendRows, updateRange } from "./client";

const SHEET = "Config";

function rowToConfig(row: string[]): Config {
  return {
    key: row[0] ?? "",
    value: row[1] ?? "",
  };
}

export async function getConfig(
  accessToken: string,
  spreadsheetId: string
): Promise<Config[]> {
  const rows = await readRange(accessToken, spreadsheetId, `${SHEET}!A2:B`);
  return rows.filter((r) => r[0]).map(rowToConfig);
}

export async function getConfigValue(
  accessToken: string,
  spreadsheetId: string,
  key: string
): Promise<string | undefined> {
  const configs = await getConfig(accessToken, spreadsheetId);
  return configs.find((c) => c.key === key)?.value;
}

export async function setConfigValue(
  accessToken: string,
  spreadsheetId: string,
  key: string,
  value: string
): Promise<void> {
  const rows = await readRange(accessToken, spreadsheetId, `${SHEET}!A2:B`);
  const existingIndex = rows.findIndex((r) => r[0] === key);

  if (existingIndex >= 0) {
    // Update existing row (row 2 is index 0, so add 2)
    const rowNumber = existingIndex + 2;
    await updateRange(
      accessToken,
      spreadsheetId,
      `${SHEET}!A${rowNumber}:B${rowNumber}`,
      [[key, value]]
    );
  } else {
    await appendRows(accessToken, spreadsheetId, `${SHEET}!A:B`, [[key, value]]);
  }
}
