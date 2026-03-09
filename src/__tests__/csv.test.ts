import { parseCSV } from "@/lib/import/csv";

const SAMPLE_CSV_US = `Date,Description,Amount,Currency
2025-01-15,Grocery Store,-42.50,USD
2025-01-20,Paycheck,1500.00,USD
2025-01-25,"Coffee, Extra","-3.75",USD
`;

const SAMPLE_CSV_EU = `Datum;Beschreibung;Betrag;Währung
15.01.2025;Supermarkt;-42,50;EUR
20.01.2025;Gehalt;1.500,00;EUR
`;

describe("parseCSV", () => {
  describe("US format (comma delimiter, YYYY-MM-DD dates)", () => {
    it("parses transactions correctly", () => {
      const transactions = parseCSV(SAMPLE_CSV_US, {
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2,
        currencyColumn: 3,
        dateFormat: "YYYY-MM-DD",
        delimiter: ",",
        hasHeader: true,
      });
      expect(transactions).toHaveLength(3);
    });

    it("parses dates to ISO format", () => {
      const transactions = parseCSV(SAMPLE_CSV_US, {
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2,
        dateFormat: "YYYY-MM-DD",
        delimiter: ",",
        hasHeader: true,
      });
      expect(transactions[0].date).toBe("2025-01-15");
      expect(transactions[1].date).toBe("2025-01-20");
    });

    it("converts amounts to integer cents", () => {
      const transactions = parseCSV(SAMPLE_CSV_US, {
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2,
        dateFormat: "YYYY-MM-DD",
        delimiter: ",",
        hasHeader: true,
      });
      expect(transactions[0].amount).toBe(-4250);
      expect(transactions[1].amount).toBe(150000);
    });

    it("handles quoted fields with commas", () => {
      const transactions = parseCSV(SAMPLE_CSV_US, {
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2,
        dateFormat: "YYYY-MM-DD",
        delimiter: ",",
        hasHeader: true,
      });
      expect(transactions[2].description).toBe("Coffee, Extra");
      expect(transactions[2].amount).toBe(-375);
    });
  });

  describe("European format (semicolon delimiter, DD.MM.YYYY dates)", () => {
    it("parses European CSV format", () => {
      const transactions = parseCSV(SAMPLE_CSV_EU, {
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2,
        currencyColumn: 3,
        dateFormat: "DD.MM.YYYY",
        delimiter: ";",
        hasHeader: true,
        decimalSeparator: ",",
      });
      expect(transactions).toHaveLength(2);
    });

    it("converts European amounts correctly", () => {
      const transactions = parseCSV(SAMPLE_CSV_EU, {
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2,
        dateFormat: "DD.MM.YYYY",
        delimiter: ";",
        hasHeader: true,
        decimalSeparator: ",",
      });
      expect(transactions[0].amount).toBe(-4250);
      expect(transactions[1].amount).toBe(150000);
    });

    it("converts European dates to ISO format", () => {
      const transactions = parseCSV(SAMPLE_CSV_EU, {
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2,
        dateFormat: "DD.MM.YYYY",
        delimiter: ";",
        hasHeader: true,
        decimalSeparator: ",",
      });
      expect(transactions[0].date).toBe("2025-01-15");
      expect(transactions[1].date).toBe("2025-01-20");
    });
  });

  it("skips rows with missing date or amount", () => {
    const csv = `Date,Description,Amount\n,No date,100\n2025-01-01,,\n2025-01-02,Valid,50`;
    const transactions = parseCSV(csv, {
      dateColumn: 0,
      descriptionColumn: 1,
      amountColumn: 2,
      dateFormat: "YYYY-MM-DD",
      delimiter: ",",
      hasHeader: true,
    });
    expect(transactions).toHaveLength(1);
    expect(transactions[0].date).toBe("2025-01-02");
  });

  it("returns empty array for empty CSV", () => {
    const transactions = parseCSV("", {
      dateColumn: 0,
      descriptionColumn: 1,
      amountColumn: 2,
      dateFormat: "YYYY-MM-DD",
      delimiter: ",",
      hasHeader: true,
    });
    expect(transactions).toHaveLength(0);
  });
});
