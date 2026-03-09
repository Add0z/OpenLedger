import { Category } from "../domain/types";
import { readRange, appendRows } from "./client";

const SHEET = "Categories";

function rowToCategory(row: string[]): Category {
  return {
    id: row[0] ?? "",
    name: row[1] ?? "",
    parent: row[2] ?? "",
    type: (row[3] ?? "expense") as "expense" | "income",
  };
}

export async function getCategories(
  accessToken: string,
  spreadsheetId: string
): Promise<Category[]> {
  const rows = await readRange(accessToken, spreadsheetId, `${SHEET}!A2:D`);
  return rows.filter((r) => r[0]).map(rowToCategory);
}

export async function addCategory(
  accessToken: string,
  spreadsheetId: string,
  category: Category
): Promise<void> {
  await appendRows(accessToken, spreadsheetId, `${SHEET}!A:D`, [
    [category.id, category.name, category.parent, category.type],
  ]);
}
