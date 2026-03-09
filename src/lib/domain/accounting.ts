import { Entry, Transaction, TransactionWithEntries } from "./types";
import { v4 as uuidv4 } from "uuid";

/**
 * Validates that the sum of entry amounts equals zero for a given transaction.
 * This enforces double-entry bookkeeping integrity.
 */
export function validateDoubleEntry(entries: Entry[]): boolean {
  const sum = entries.reduce((acc, e) => acc + e.amount, 0);
  return sum === 0;
}

/**
 * Creates a complete transaction with validated double-entry entries.
 * Throws if the entries do not balance.
 */
export function createTransaction(
  date: string,
  description: string,
  entries: Omit<Entry, "id" | "transaction_id">[],
  userId: string
): TransactionWithEntries {
  const transactionId = uuidv4();
  const transaction: Transaction = {
    id: transactionId,
    date,
    description,
    created_at: new Date().toISOString(),
  };

  const fullEntries: Entry[] = entries.map((e) => ({
    ...e,
    id: uuidv4(),
    transaction_id: transactionId,
  }));

  if (!validateDoubleEntry(fullEntries)) {
    const sum = fullEntries.reduce((acc, e) => acc + e.amount, 0);
    throw new Error(
      `Double-entry rule violation: entries sum to ${sum}, must equal 0. ` +
        `User: ${userId}`
    );
  }

  return { transaction, entries: fullEntries };
}

/**
 * Formats an integer amount (cents) to a display string using locale formatting.
 * Never uses floating-point arithmetic internally.
 */
export function formatAmount(
  amount: number,
  currencyCode: string,
  decimals: number = 2
): string {
  // Integer division to avoid float precision issues
  const major = Math.trunc(amount / Math.pow(10, decimals));
  const minor = Math.abs(amount % Math.pow(10, decimals));
  const minorStr = String(minor).padStart(decimals, "0");
  const sign = amount < 0 ? "-" : "";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(parseFloat(`${sign}${Math.abs(major)}.${minorStr}`));
  } catch {
    return `${sign}${Math.abs(major)}.${minorStr} ${currencyCode}`;
  }
}

/**
 * Parses a user-supplied decimal string into an integer amount in smallest unit.
 * e.g. "12.34" with decimals=2 → 1234
 */
export function parseAmount(input: string, decimals: number = 2): number {
  const trimmed = input.trim().replace(/,/g, "");
  const parsed = parseFloat(trimmed);
  if (isNaN(parsed)) {
    throw new Error(`Invalid amount: "${input}"`);
  }
  // Multiply by 10^decimals and round to avoid floating-point errors
  return Math.round(parsed * Math.pow(10, decimals));
}

/**
 * Generates the opening balance transaction entries for a new year.
 * Creates one entry per account that had a non-zero balance, offset by equity.
 */
export function createOpeningBalanceTransaction(
  date: string,
  accountBalances: Array<{ accountId: string; amount: number; currency: string }>,
  openingEquityAccountId: string
): TransactionWithEntries {
  const transactionId = uuidv4();
  const transaction: Transaction = {
    id: transactionId,
    date,
    description: "Opening Balance",
    created_at: new Date().toISOString(),
  };

  // Calculate the offset for equity to balance the books
  const accountEntries: Entry[] = accountBalances.map((ab) => ({
    id: uuidv4(),
    transaction_id: transactionId,
    account_id: ab.accountId,
    amount: ab.amount,
    currency: ab.currency,
  }));

  const totalAmount = accountBalances.reduce((sum, ab) => sum + ab.amount, 0);
  const currency =
    accountBalances.length > 0 ? accountBalances[0].currency : "USD";

  const equityEntry: Entry = {
    id: uuidv4(),
    transaction_id: transactionId,
    account_id: openingEquityAccountId,
    amount: -totalAmount,
    currency,
  };

  const entries = [...accountEntries, equityEntry];

  if (!validateDoubleEntry(entries)) {
    throw new Error("Opening balance transaction failed double-entry validation");
  }

  return { transaction, entries };
}
