import {
  validateDoubleEntry,
  createTransaction,
  formatAmount,
  parseAmount,
  createOpeningBalanceTransaction,
  computeAccountBalances,
  computeMonthlyExpenses,
} from "@/lib/domain/accounting";
import { Account, Entry, Expense, Transaction } from "@/lib/domain/types";

describe("validateDoubleEntry", () => {
  it("returns true when entries sum to zero", () => {
    const entries: Entry[] = [
      { id: "1", transaction_id: "tx1", account_id: "a1", amount: -1000, currency: "USD" },
      { id: "2", transaction_id: "tx1", account_id: "a2", amount: 1000, currency: "USD" },
    ];
    expect(validateDoubleEntry(entries)).toBe(true);
  });

  it("returns true when multiple entries sum to zero", () => {
    const entries: Entry[] = [
      { id: "1", transaction_id: "tx1", account_id: "a1", amount: -1500, currency: "USD" },
      { id: "2", transaction_id: "tx1", account_id: "a2", amount: 1000, currency: "USD" },
      { id: "3", transaction_id: "tx1", account_id: "a3", amount: 500, currency: "USD" },
    ];
    expect(validateDoubleEntry(entries)).toBe(true);
  });

  it("returns false when entries do not sum to zero", () => {
    const entries: Entry[] = [
      { id: "1", transaction_id: "tx1", account_id: "a1", amount: -1000, currency: "USD" },
      { id: "2", transaction_id: "tx1", account_id: "a2", amount: 900, currency: "USD" },
    ];
    expect(validateDoubleEntry(entries)).toBe(false);
  });

  it("returns true for empty entries array", () => {
    expect(validateDoubleEntry([])).toBe(true);
  });

  it("handles negative amounts correctly", () => {
    const entries: Entry[] = [
      { id: "1", transaction_id: "tx1", account_id: "a1", amount: 5000, currency: "USD" },
      { id: "2", transaction_id: "tx1", account_id: "a2", amount: -5000, currency: "USD" },
    ];
    expect(validateDoubleEntry(entries)).toBe(true);
  });
});

describe("createTransaction", () => {
  it("creates a valid transaction with balanced entries", () => {
    const result = createTransaction(
      "2025-01-15",
      "Grocery shopping",
      [
        { account_id: "checking", amount: -5000, currency: "USD" },
        { account_id: "expenses", amount: 5000, currency: "USD" },
      ],
      "user@example.com"
    );

    expect(result.transaction.date).toBe("2025-01-15");
    expect(result.transaction.description).toBe("Grocery shopping");
    expect(result.transaction.id).toBeTruthy();
    expect(result.entries).toHaveLength(2);
    expect(result.entries.every((e) => e.transaction_id === result.transaction.id)).toBe(true);
  });

  it("throws an error when entries don't sum to zero", () => {
    expect(() => {
      createTransaction(
        "2025-01-15",
        "Bad transaction",
        [
          { account_id: "a1", amount: -1000, currency: "USD" },
          { account_id: "a2", amount: 800, currency: "USD" },
        ],
        "user@example.com"
      );
    }).toThrow("Double-entry rule violation");
  });

  it("assigns unique IDs to each entry", () => {
    const result = createTransaction(
      "2025-01-15",
      "Test",
      [
        { account_id: "a1", amount: -100, currency: "USD" },
        { account_id: "a2", amount: 100, currency: "USD" },
      ],
      "user"
    );
    const ids = result.entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("formatAmount", () => {
  it("formats USD cents correctly", () => {
    // 1234 cents = $12.34
    const formatted = formatAmount(1234, "USD");
    expect(formatted).toContain("12");
    expect(formatted).toContain("34");
  });

  it("formats zero correctly", () => {
    const formatted = formatAmount(0, "USD");
    expect(formatted).toContain("0");
  });

  it("formats negative amounts", () => {
    const formatted = formatAmount(-1000, "USD");
    expect(formatted).toContain("-");
    expect(formatted).toContain("10");
  });
});

describe("parseAmount", () => {
  it("parses a simple decimal amount to integer cents", () => {
    expect(parseAmount("12.34")).toBe(1234);
  });

  it("parses a whole number amount", () => {
    expect(parseAmount("50")).toBe(5000);
  });

  it("parses amounts with commas as thousand separators", () => {
    expect(parseAmount("1,234.56")).toBe(123456);
  });

  it("returns 0 on invalid input instead of throwing to prevent grid crashes", () => {
    expect(parseAmount("abc")).toBe(0);
  });

  it("handles zero", () => {
    expect(parseAmount("0")).toBe(0);
  });

  it("handles negative amounts", () => {
    expect(parseAmount("-10.50")).toBe(-1050);
  });

  it("respects custom decimal places", () => {
    expect(parseAmount("1.234", 3)).toBe(1234);
  });
});

describe("createOpeningBalanceTransaction", () => {
  it("creates a balanced opening balance transaction", () => {
    const result = createOpeningBalanceTransaction(
      "2026-01-01",
      [
        { accountId: "checking", amount: 500000, currency: "USD" },
        { accountId: "savings", amount: 1000000, currency: "USD" },
      ],
      "opening-equity"
    );

    expect(result.transaction.description).toBe("Opening Balance");
    expect(result.transaction.date).toBe("2026-01-01");

    // Should have 3 entries: 2 account + 1 equity
    expect(result.entries).toHaveLength(3);

    // All entries must sum to zero
    const sum = result.entries.reduce((acc, e) => acc + e.amount, 0);
    expect(sum).toBe(0);
  });

  it("equity entry offsets all account balances", () => {
    const result = createOpeningBalanceTransaction(
      "2026-01-01",
      [{ accountId: "checking", amount: 100000, currency: "USD" }],
      "equity"
    );

    const equityEntry = result.entries.find((e) => e.account_id === "equity");
    expect(equityEntry?.amount).toBe(-100000);
  });
});

// --- computeAccountBalances ---

describe("computeAccountBalances", () => {
  const makeAccount = (id: string, initialBalance?: number): Account => ({
    id,
    name: id,
    type: "checking",
    currency: "BRL",
    active: true,
    initialBalance,
  });

  it("returns initialBalance when there are no entries", () => {
    const accounts = [makeAccount("a1", 50000)];
    const result = computeAccountBalances(accounts, []);
    expect(result.get("a1")).toBe(50000);
  });

  it("sums initialBalance + entry amounts", () => {
    const accounts = [makeAccount("a1", 10000)];
    const entries: Entry[] = [
      { id: "e1", transaction_id: "tx1", account_id: "a1", amount: 5000, currency: "BRL" },
      { id: "e2", transaction_id: "tx2", account_id: "a1", amount: -2000, currency: "BRL" },
    ];
    const result = computeAccountBalances(accounts, entries);
    expect(result.get("a1")).toBe(13000); // 10000 + 5000 - 2000
  });

  it("treats undefined initialBalance as zero", () => {
    const accounts = [makeAccount("a1")]; // no initialBalance
    const entries: Entry[] = [
      { id: "e1", transaction_id: "tx1", account_id: "a1", amount: 3000, currency: "BRL" },
    ];
    const result = computeAccountBalances(accounts, entries);
    expect(result.get("a1")).toBe(3000);
  });

  it("includes entries for accounts not in the accounts list", () => {
    const accounts = [makeAccount("a1", 100)];
    const entries: Entry[] = [
      { id: "e1", transaction_id: "tx1", account_id: "unknown", amount: 7777, currency: "BRL" },
    ];
    const result = computeAccountBalances(accounts, entries);
    expect(result.get("unknown")).toBe(7777);
    expect(result.get("a1")).toBe(100);
  });
});

// --- computeMonthlyExpenses ---

describe("computeMonthlyExpenses", () => {
  const makeExpense = (date: string, amount: number): Expense => ({
    id: `exp-${date}-${amount}`,
    date,
    description: "Test",
    account_id: "checking",
    category_id: "food",
    amount,
    currency: "BRL",
    created_at: "",
  });

  it("sums expenses within the target month", () => {
    const expenses = [
      makeExpense("2026-03-05", 5000),
      makeExpense("2026-03-15", 3000),
    ];
    const total = computeMonthlyExpenses(expenses, "2026-03");
    expect(total).toBe(8000);
  });

  it("ignores expenses from a different month", () => {
    const expenses = [
      makeExpense("2026-04-01", 3000),
    ];
    const total = computeMonthlyExpenses(expenses, "2026-03");
    expect(total).toBe(0);
  });

  it("returns 0 when there are no expenses", () => {
    const total = computeMonthlyExpenses([], "2026-03");
    expect(total).toBe(0);
  });
});
