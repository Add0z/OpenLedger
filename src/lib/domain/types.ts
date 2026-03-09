// Core domain types for OpenLedger
// All monetary amounts are stored as integers in the smallest currency unit (cents)

export type AccountType = "asset" | "liability" | "income" | "expense" | "equity";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  parent: string;
  type: "expense" | "income";
}

export interface Currency {
  code: string;
  name: string;
  decimals: number;
}

export interface Transaction {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  description: string;
  created_at: string; // ISO timestamp
}

/**
 * A ledger entry. Sum of all entries per transaction_id must equal 0.
 * Amounts are integers in smallest currency unit (e.g. cents).
 */
export interface Entry {
  id: string;
  transaction_id: string;
  account_id: string;
  amount: number; // integer, in smallest currency unit
  currency: string;
}

export interface Budget {
  id: string;
  category_id: string;
  period: string; // YYYY-MM (month) or YYYY (year)
  amount: number; // integer, in smallest currency unit
}

export interface QuickAddRow {
  date: string;
  description: string;
  account: string;
  category: string;
  amount: number; // integer, in smallest currency unit
}

export interface Config {
  key: string;
  value: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  entity: string;
  entity_id: string;
  user: string;
}

/** A transaction together with its entries */
export interface TransactionWithEntries {
  transaction: Transaction;
  entries: Entry[];
}

/** Spreadsheet metadata returned from Google Sheets */
export interface SpreadsheetInfo {
  spreadsheetId: string;
  title: string;
}

/** Conflict information when external edits are detected */
export interface ConflictInfo {
  hasConflict: boolean;
  localRevision?: number;
  remoteRevision?: number;
  message?: string;
}
