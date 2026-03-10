import { Account, Entry, Expense, Transaction, TransactionWithEntries } from "./types";
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
 * Parses a user-supplied or spreadsheet decimal string into an integer amount in smallest unit.
 * Safely handles localized formatting like "R$ 6.300,00", "-$ 1,234.56", or "-37,95".
 */
export function parseAmount(input: string | number, decimals: number = 2): number {
  if (typeof input === "number") {
    return Math.round(input * Math.pow(10, decimals));
  }

  // 1. Remove all non-numeric characters EXCEPT digits, minus sign, comma, and dot
  const cleaned = input.replace(/[^\d.,-]/g, "");

  // 2. Normalize the decimal separator to a dot, and remove thousands separators
  // Find the LAST comma or dot. If there's none, it's an integer.
  const lastCommaIndex = cleaned.lastIndexOf(",");
  const lastDotIndex = cleaned.lastIndexOf(".");
  let normalized = cleaned;

  if (lastCommaIndex > -1 || lastDotIndex > -1) {
    const lastSeparatorIndex = Math.max(lastCommaIndex, lastDotIndex);
    // Everything before the last separator -> remove commas and dots
    const intPart = cleaned.slice(0, lastSeparatorIndex).replace(/[.,]/g, "");
    // Everything after -> decimal part
    const decPart = cleaned.slice(lastSeparatorIndex + 1);
    normalized = `${intPart}.${decPart}`;
  }

  const parsed = parseFloat(normalized);
  if (isNaN(parsed)) {
    return 0; // Return 0 instead of throwing, so it doesn't break the whole table rendering
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

/**
 * Computes the current balance for each account.
 * Balance = initialBalance + Σ(entry amounts) − Σ(expense amounts).
 *
 * Entries carry a sign (positive = money in, negative = money out).
 * Expenses are always positive and are subtracted from the source account.
 *
 * Performance: single pass over each array — O(accounts + entries + expenses).
 */
export function computeAccountBalances(
  accounts: Account[],
  entries: Entry[],
  expenses: Expense[] = []
): Map<string, number> {
  const balances = new Map<string, number>();
  accounts.forEach((a) => balances.set(a.id, a.initialBalance ?? 0));
  entries.forEach((e) => {
    balances.set(e.account_id, (balances.get(e.account_id) ?? 0) + e.amount);
  });
  expenses.forEach((e) => {
    balances.set(e.account_id, (balances.get(e.account_id) ?? 0) - e.amount);
  });
  return balances;
}

/**
 * Computes total expenses for a given month.
 * Filters expenses whose date falls within the specified yearMonth.
 *
 * @param expenses - all expense records
 * @param yearMonth - format "YYYY-MM", e.g. "2026-03"
 * @returns total expense amount (positive integer in smallest currency unit)
 *
 * Performance: single pass — O(expenses).
 */
export function computeMonthlyExpenses(
  expenses: Expense[],
  yearMonth: string
): number {
  return expenses
    .filter((e) => e.date.startsWith(yearMonth) && e.amount > 0)
    .reduce((sum, e) => sum + e.amount, 0);
}
