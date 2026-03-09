import { parseOFX } from "@/lib/import/ofx";

const SAMPLE_OFX = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20250115120000
<LANGUAGE>ENG
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STMTRS>
<CURDEF>USD
<BANKTRANLIST>
<DTSTART>20250101
<DTEND>20250131
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20250115
<TRNAMT>-42.50
<FITID>2025011501
<NAME>GROCERY STORE
<MEMO>Grocery shopping
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20250120
<TRNAMT>1500.00
<FITID>2025012001
<NAME>PAYCHECK
<MEMO>Monthly salary
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;

describe("parseOFX", () => {
  it("parses transactions from SGML OFX format", () => {
    const transactions = parseOFX(SAMPLE_OFX);
    expect(transactions).toHaveLength(2);
  });

  it("parses dates correctly", () => {
    const transactions = parseOFX(SAMPLE_OFX);
    expect(transactions[0].date).toBe("2025-01-15");
    expect(transactions[1].date).toBe("2025-01-20");
  });

  it("converts amounts to integer cents", () => {
    const transactions = parseOFX(SAMPLE_OFX);
    // -42.50 should be -4250 cents
    expect(transactions[0].amount).toBe(-4250);
    // 1500.00 should be 150000 cents
    expect(transactions[1].amount).toBe(150000);
  });

  it("extracts descriptions", () => {
    const transactions = parseOFX(SAMPLE_OFX);
    expect(transactions[0].description).toBe("Grocery shopping");
    expect(transactions[1].description).toBe("Monthly salary");
  });

  it("extracts currency", () => {
    const transactions = parseOFX(SAMPLE_OFX);
    expect(transactions[0].currency).toBe("USD");
    expect(transactions[1].currency).toBe("USD");
  });

  it("returns empty array for empty/invalid content", () => {
    expect(parseOFX("")).toHaveLength(0);
    expect(parseOFX("invalid content")).toHaveLength(0);
  });
});
