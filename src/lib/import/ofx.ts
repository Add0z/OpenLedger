/**
 * OFX (Open Financial Exchange) file parser.
 * Supports basic OFX/QFX format used by most banks.
 */

export interface ParsedImportTransaction {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // integer in smallest currency unit (cents)
  currency: string;
  reference?: string;
}

/**
 * Parses an OFX file content string and returns a list of transactions.
 * Handles both SGML-style OFX (no XML declaration) and XML OFX.
 */
export function parseOFX(content: string): ParsedImportTransaction[] {
  const transactions: ParsedImportTransaction[] = [];

  // Determine currency from CURDEF tag
  const curdefMatch = content.match(/<CURDEF>([A-Z]{3})/i);
  const currency = curdefMatch ? curdefMatch[1].toUpperCase() : "USD";

  // Match STMTTRN blocks (works for both SGML and basic XML OFX)
  const stmttrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;

  while ((match = stmttrnRegex.exec(content)) !== null) {
    const block = match[1];

    const dateRaw = extractTag(block, "DTPOSTED");
    const amountRaw = extractTag(block, "TRNAMT");
    const memo = extractTag(block, "MEMO") ?? extractTag(block, "NAME") ?? "";
    const fitid = extractTag(block, "FITID");

    if (!dateRaw || !amountRaw) continue;

    const date = parseOFXDate(dateRaw);
    if (!date) continue;

    // OFX amounts are decimal strings; convert to integer cents
    const amountFloat = parseFloat(amountRaw.replace(",", "."));
    if (isNaN(amountFloat)) continue;
    const amount = Math.round(amountFloat * 100);

    transactions.push({
      date,
      description: memo.trim(),
      amount,
      currency,
      reference: fitid ?? undefined,
    });
  }

  return transactions;
}

function extractTag(block: string, tag: string): string | null {
  // Matches both <TAG>value</TAG> (XML) and <TAG>value\n (SGML)
  const xmlMatch = block.match(new RegExp(`<${tag}>([^<]+)</${tag}>`, "i"));
  if (xmlMatch) return xmlMatch[1].trim();
  const sgmlMatch = block.match(new RegExp(`<${tag}>([^\r\n<]+)`, "i"));
  if (sgmlMatch) return sgmlMatch[1].trim();
  return null;
}

/**
 * Parses an OFX date string (YYYYMMDD or YYYYMMDDHHMMSS) to ISO date YYYY-MM-DD.
 */
function parseOFXDate(raw: string): string | null {
  // Strip timezone info after brackets or dots
  const cleaned = raw.replace(/\[.*$/, "").replace(/\[.*\]/, "").split(".")[0];
  if (cleaned.length < 8) return null;
  const year = cleaned.slice(0, 4);
  const month = cleaned.slice(4, 6);
  const day = cleaned.slice(6, 8);
  return `${year}-${month}-${day}`;
}
