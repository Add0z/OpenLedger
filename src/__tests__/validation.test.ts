import { validateAccount, validateCategory, validateTransaction, validateEntry, validateBudget } from "@/lib/domain/validation";
import { AccountType } from "@/lib/domain/types";

describe("validateAccount", () => {
  it("passes for valid account", () => {
    expect(() => validateAccount({ name: "Checking", type: "asset", currency: "USD", active: true })).not.toThrow();
  });

  it("throws when name is missing", () => {
    expect(() => validateAccount({ name: "", type: "asset", currency: "USD" })).toThrow("Account name is required");
  });

  it("throws for invalid account type", () => {
    expect(() => validateAccount({ name: "Test", type: "invalid" as AccountType, currency: "USD" })).toThrow("Invalid account type");
  });

  it("throws when currency is missing", () => {
    expect(() => validateAccount({ name: "Test", type: "asset", currency: "" })).toThrow("Account currency is required");
  });
});

describe("validateCategory", () => {
  it("passes for valid category", () => {
    expect(() => validateCategory({ name: "Groceries", type: "expense", parent: "" })).not.toThrow();
  });

  it("throws when name is missing", () => {
    expect(() => validateCategory({ name: "", type: "expense" })).toThrow("Category name is required");
  });

  it("throws for invalid type", () => {
    expect(() => validateCategory({ name: "Test", type: "invalid" as "expense" | "income" })).toThrow("Invalid category type");
  });
});

describe("validateTransaction", () => {
  it("passes for valid transaction", () => {
    expect(() => validateTransaction({ date: "2025-01-15", description: "Test" })).not.toThrow();
  });

  it("throws when description is missing", () => {
    expect(() => validateTransaction({ date: "2025-01-15", description: "" })).toThrow("Transaction description is required");
  });

  it("throws when date is missing", () => {
    expect(() => validateTransaction({ description: "Test" })).toThrow("Transaction date is required");
  });

  it("throws for invalid date format", () => {
    expect(() => validateTransaction({ date: "15/01/2025", description: "Test" })).toThrow("Invalid date format");
  });
});

describe("validateEntry", () => {
  it("passes for valid entry", () => {
    expect(() => validateEntry({ account_id: "acc1", amount: -1000, currency: "USD" })).not.toThrow();
  });

  it("throws when account_id is missing", () => {
    expect(() => validateEntry({ account_id: "", amount: -1000, currency: "USD" })).toThrow("Entry account_id is required");
  });

  it("throws when amount is not an integer", () => {
    expect(() => validateEntry({ account_id: "acc1", amount: 10.5, currency: "USD" })).toThrow("Entry amount must be an integer");
  });

  it("throws when currency is missing", () => {
    expect(() => validateEntry({ account_id: "acc1", amount: 1000, currency: "" })).toThrow("Entry currency is required");
  });
});

describe("validateBudget", () => {
  it("passes for valid budget", () => {
    expect(() => validateBudget({ category_id: "cat1", period: "2025-01", amount: 50000 })).not.toThrow();
  });

  it("throws when category_id is missing", () => {
    expect(() => validateBudget({ category_id: "", period: "2025-01", amount: 50000 })).toThrow("Budget category_id is required");
  });

  it("throws for negative amount", () => {
    expect(() => validateBudget({ category_id: "cat1", period: "2025-01", amount: -100 })).toThrow("Budget amount must be a non-negative integer");
  });

  it("throws for non-integer amount", () => {
    expect(() => validateBudget({ category_id: "cat1", period: "2025-01", amount: 100.5 })).toThrow("Budget amount must be a non-negative integer");
  });
});
