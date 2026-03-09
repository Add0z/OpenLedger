import { ParsedImportTransaction } from "./ofx";

export interface CSVColumnMapping {
  dateColumn: number;
  descriptionColumn: number;
  amountColumn: number;
  currencyColumn?: number;
  referenceColumn?: number;
  dateFormat?: "YYYY-MM-DD" | "MM/DD/YYYY" | "DD/MM/YYYY" | "MM-DD-YYYY" | "DD.MM.YYYY";
  delimiter?: string;
  hasHeader?: boolean;
  defaultCurrency?: string;
  decimalSeparator?: "." | ",";
}

/**
 * Parses a CSV bank export and returns structured transaction data.
 * Amounts are returned as integers in smallest currency unit (cents).
 */
export function parseCSV(
  content: string,
  mapping: CSVColumnMapping
): ParsedImportTransaction[] {
  const {
    dateColumn,
    descriptionColumn,
    amountColumn,
    currencyColumn,
    referenceColumn,
    dateFormat = "YYYY-MM-DD",
    delimiter = ",",
    hasHeader = true,
    defaultCurrency = "USD",
    decimalSeparator = ".",
  } = mapping;

  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const startIndex = hasHeader ? 1 : 0;
  const transactions: ParsedImportTransaction[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], delimiter);

    const dateRaw = cols[dateColumn]?.trim();
    const description = cols[descriptionColumn]?.trim() ?? "";
    const amountRaw = cols[amountColumn]?.trim();
    const currency = currencyColumn !== undefined
      ? (cols[currencyColumn]?.trim() ?? defaultCurrency)
      : defaultCurrency;
    const reference = referenceColumn !== undefined
      ? cols[referenceColumn]?.trim()
      : undefined;

    if (!dateRaw || !amountRaw) continue;

    const date = parseCSVDate(dateRaw, dateFormat);
    if (!date) continue;

    const amount = parseCSVAmount(amountRaw, decimalSeparator);
    if (isNaN(amount)) continue;

    transactions.push({
      date,
      description,
      amount,
      currency,
      reference,
    });
  }

  return transactions;
}

/**
 * Splits a CSV line respecting quoted fields.
 */
function splitCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Parses a CSV date string to ISO format YYYY-MM-DD.
 */
function parseCSVDate(
  raw: string,
  format: CSVColumnMapping["dateFormat"]
): string | null {
  const clean = raw.replace(/"/g, "").trim();

  let year: string, month: string, day: string;

  if (format === "YYYY-MM-DD") {
    const parts = clean.split("-");
    if (parts.length !== 3) return null;
    [year, month, day] = parts;
  } else if (format === "MM/DD/YYYY") {
    const parts = clean.split("/");
    if (parts.length !== 3) return null;
    [month, day, year] = parts;
  } else if (format === "DD/MM/YYYY") {
    const parts = clean.split("/");
    if (parts.length !== 3) return null;
    [day, month, year] = parts;
  } else if (format === "MM-DD-YYYY") {
    const parts = clean.split("-");
    if (parts.length !== 3) return null;
    [month, day, year] = parts;
  } else if (format === "DD.MM.YYYY") {
    const parts = clean.split(".");
    if (parts.length !== 3) return null;
    [day, month, year] = parts;
  } else {
    return null;
  }

  if (!year || !month || !day) return null;
  return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * Parses an amount string to integer cents.
 * Handles parentheses for negative values, removes currency symbols and whitespace.
 */
function parseCSVAmount(raw: string, decimalSeparator: "." | ","): number {
  let clean = raw.replace(/"/g, "").trim();
  let negative = false;

  if (clean.startsWith("(") && clean.endsWith(")")) {
    negative = true;
    clean = clean.slice(1, -1);
  }

  if (clean.startsWith("-")) {
    negative = true;
    clean = clean.slice(1);
  }

  // Remove currency symbols and spaces
  clean = clean.replace(/[£€$¥₹\s]/g, "");

  if (decimalSeparator === ",") {
    // European format: 1.234,56 → remove dots, replace comma with dot
    clean = clean.replace(/\./g, "").replace(",", ".");
  } else {
    // US format: 1,234.56 → remove commas
    clean = clean.replace(/,/g, "");
  }

  const float = parseFloat(clean);
  if (isNaN(float)) return NaN;
  return Math.round((negative ? -float : float) * 100);
}
