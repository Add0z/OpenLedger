import { Account, Category, Transaction, Entry, Budget, Expense } from "./types";

/** Validates that a required string field is not empty */
export function requireField(value: string | undefined | null, name: string): string {
  if (!value || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

/** Validates an ISO date string (YYYY-MM-DD) */
export function validateDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date format: "${date}". Expected YYYY-MM-DD`);
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date: "${date}"`);
  }
  return date;
}

/** Validates an Account object */
export function validateAccount(account: Partial<Account>): void {
  requireField(account.name, "Account name");
  if (!["savings", "checking", "investment"].includes(account.type ?? "")) {
    throw new Error(`Invalid account type: "${account.type}"`);
  }
  requireField(account.currency, "Account currency");
}

/** Validates an Expense object */
export function validateExpense(expense: Partial<Expense>): void {
  requireField(expense.description, "Expense description");
  if (expense.date) {
    validateDate(expense.date);
  } else {
    throw new Error("Expense date is required");
  }
  requireField(expense.account_id, "Expense account_id");
  requireField(expense.category_id, "Expense category_id");
  requireField(expense.currency, "Expense currency");
  if (!Number.isInteger(expense.amount) || expense.amount === 0) {
    throw new Error(`Expense amount must be a non-zero integer, got: ${expense.amount}`);
  }
}

/** Validates a Category object */
export function validateCategory(category: Partial<Category>): void {
  requireField(category.name, "Category name");
  if (!["expense", "income", "investment"].includes(category.type ?? "")) {
    throw new Error(`Invalid category type: "${category.type}"`);
  }
}

/** Validates a Transaction object (without entries) */
export function validateTransaction(transaction: Partial<Transaction>): void {
  requireField(transaction.description, "Transaction description");
  if (transaction.date) {
    validateDate(transaction.date);
  } else {
    throw new Error("Transaction date is required");
  }
}

/** Validates a single Entry */
export function validateEntry(entry: Partial<Entry>): void {
  requireField(entry.account_id, "Entry account_id");
  requireField(entry.currency, "Entry currency");
  if (!Number.isInteger(entry.amount)) {
    throw new Error(`Entry amount must be an integer, got: ${entry.amount}`);
  }
}

/** Validates a Budget record */
export function validateBudget(budget: Partial<Budget>): void {
  requireField(budget.category_id, "Budget category_id");
  requireField(budget.period, "Budget period");
  if (!Number.isInteger(budget.amount) || (budget.amount ?? 0) < 0) {
    throw new Error(`Budget amount must be a non-negative integer, got: ${budget.amount}`);
  }
}
