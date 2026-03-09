import { google, sheets_v4 } from "googleapis";
import { ConflictInfo } from "../domain/types";

/**
 * Creates an authenticated Google Sheets API client using an OAuth access token.
 */
export function getSheetsClient(accessToken: string): sheets_v4.Sheets {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth });
}

/**
 * Reads a range from a spreadsheet and returns the raw values array.
 * Returns an empty array if the range is empty.
 */
export async function readRange(
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  const sheets = getSheetsClient(accessToken);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return (response.data.values as string[][] | null | undefined) ?? [];
}

/**
 * Appends rows to a sheet.
 */
export async function appendRows(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: (string | number | boolean)[][]
): Promise<void> {
  const sheets = getSheetsClient(accessToken);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
}

/**
 * Updates a range in a spreadsheet (overwrites).
 */
export async function updateRange(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: (string | number | boolean)[][]
): Promise<void> {
  const sheets = getSheetsClient(accessToken);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
}

/**
 * Performs a batch update to write multiple ranges atomically.
 */
export async function batchUpdate(
  accessToken: string,
  spreadsheetId: string,
  data: Array<{ range: string; values: (string | number | boolean)[][] }>
): Promise<void> {
  const sheets = getSheetsClient(accessToken);
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data,
    },
  });
}

/**
 * Returns the current revision (version) of a spreadsheet by reading its metadata.
 * Used for conflict detection.
 */
export async function getSpreadsheetRevision(
  accessToken: string,
  spreadsheetId: string
): Promise<number> {
  const drive = google.drive({ version: "v3", auth: (() => {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return auth;
  })() });

  const response = await drive.files.get({
    fileId: spreadsheetId,
    fields: "version",
  });

  return parseInt(String(response.data.version ?? "0"), 10);
}

/**
 * Detects conflicts by comparing a known revision against the current spreadsheet revision.
 */
export async function detectConflict(
  accessToken: string,
  spreadsheetId: string,
  localRevision: number
): Promise<ConflictInfo> {
  const remoteRevision = await getSpreadsheetRevision(accessToken, spreadsheetId);
  if (remoteRevision > localRevision) {
    return {
      hasConflict: true,
      localRevision,
      remoteRevision,
      message: `The spreadsheet was modified externally (revision ${remoteRevision} vs local ${localRevision}). Please review before saving.`,
    };
  }
  return { hasConflict: false, localRevision, remoteRevision };
}

/**
 * Lists all Google Sheets spreadsheets accessible to the user, filtered by name prefix.
 */
export async function listSpreadsheets(
  accessToken: string,
  namePrefix: string = "OpenBudget_"
): Promise<Array<{ id: string; name: string }>> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: "v3", auth });

  const response = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.spreadsheet' and name contains '${namePrefix}' and trashed=false`,
    fields: "files(id, name)",
    orderBy: "name desc",
  });

  return (response.data.files ?? []).map((f) => ({
    id: f.id ?? "",
    name: f.name ?? "",
  }));
}

/**
 * Creates a new spreadsheet with the required sheets for a new year.
 */
export async function createYearSpreadsheet(
  accessToken: string,
  year: number
): Promise<string> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const sheets = google.sheets({ version: "v4", auth });

  const sheetNames = [
    "Accounts",
    "Categories",
    "Currencies",
    "Budgets",
    "Transactions",
    "Entries",
    "QuickAdd",
    "Config",
    "AuditLog",
  ];

  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: `OpenBudget_${year}` },
      sheets: sheetNames.map((name) => ({
        properties: { title: name },
      })),
    },
  });

  const spreadsheetId = response.data.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error("Failed to create spreadsheet: no ID returned");
  }

  // Initialize headers for each sheet
  await initializeSpreadsheetHeaders(accessToken, spreadsheetId);

  return spreadsheetId;
}

/**
 * Writes the header rows for all required sheets.
 */
async function initializeSpreadsheetHeaders(
  accessToken: string,
  spreadsheetId: string
): Promise<void> {
  const headers: Array<{ range: string; values: string[][] }> = [
    {
      range: "Accounts!A1:E1",
      values: [["id", "name", "type", "currency", "active"]],
    },
    {
      range: "Categories!A1:D1",
      values: [["id", "name", "parent", "type"]],
    },
    {
      range: "Currencies!A1:C1",
      values: [["code", "name", "decimals"]],
    },
    {
      range: "Budgets!A1:D1",
      values: [["id", "category_id", "period", "amount"]],
    },
    {
      range: "Transactions!A1:D1",
      values: [["id", "date", "description", "created_at"]],
    },
    {
      range: "Entries!A1:E1",
      values: [["id", "transaction_id", "account_id", "amount", "currency"]],
    },
    {
      range: "QuickAdd!A1:E1",
      values: [["date", "description", "account", "category", "amount"]],
    },
    {
      range: "Config!A1:B1",
      values: [["key", "value"]],
    },
    {
      range: "AuditLog!A1:F1",
      values: [["id", "timestamp", "action", "entity", "entity_id", "user"]],
    },
  ];

  await batchUpdate(accessToken, spreadsheetId, headers);
}
