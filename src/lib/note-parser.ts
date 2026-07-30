/**
 * Malaysian shopping note parser.
 * Extracts ingredients from free-form text like:
 *   "Cream cheese 500g: 21.4"
 *   "Plastik vakum 12 utk 50pcs"
 */

export interface ParsedItem {
  name: string;
  purchase_qty: number;
  unit: string;
  purchase_price: number;
  raw: string; // original line for debugging
}

export interface ParseResult {
  supplier: string;
  items: ParsedItem[];
  skipped: string[]; // lines we couldn't parse
}

const UNIT_PATTERN = /(\d+\.?\d*)\s*(kg|g|l|ml|pcs|piece|pieces|paket|packet)\b/gi;
const UNIT_ATTACHED = /(\d+)(kg|g|l|ml|pcs)\b/gi;
const PRICE_AFTER_COLON = /:\s*([\d.]+)\b/;
const PRICE_BEFORE_UTK = /([\d.]+)\s*(?:utk|untuk|guna|for)\b/i;
const NOISE_WORDS = /\b(utk|untuk|guna|shj|sahaja|je|je\b)\b/gi;
const GUNA_PATTERN = /\bguna\s+\d+\s*\w*\s*/gi; // "guna 9 pelekat" → remove entirely

// Keywords that suggest a line is NOT an ingredient
const HEADER_KEYWORDS = /^(total|jumlah|batch|yield|hasil)/i;
const X_PATTERN = /\d+\s*\w*\s*x\s*\d+/i; // "10pcs x 5 paket" = batch calc
const GARBAGE_AFTER_PRICE = /,.*$/; // ", kita guna 500g shj" — remove after comma

export function parseShoppingNote(text: string): ParseResult {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let supplier = "";
  const items: ParsedItem[] = [];
  const skipped: string[] = [];

  for (const line of lines) {
    // --- Supplier detection ---
    // Short line ending with colon, no price pattern
    if (
      !supplier &&
      line.endsWith(":") &&
      !/\d/.test(line.replace(":", "")) &&
      line.length < 30
    ) {
      supplier = line.replace(/:$/, "").trim();
      continue;
    }

    // Skip batch calculation lines ("10pcs x 5 paket", "70 pcs")
    if (X_PATTERN.test(line)) {
      skipped.push(line);
      continue;
    }
    if (/^\d+\s*(pcs|pieces?)\s*$/i.test(line.trim())) {
      skipped.push(line);
      continue;
    }
    if (HEADER_KEYWORDS.test(line)) {
      skipped.push(line);
      continue;
    }

    // --- Try to parse as ingredient ---
    const item = parseIngredientLine(line);
    if (item) {
      items.push(item);
    } else {
      skipped.push(line);
    }
  }

  return { supplier, items, skipped };
}

function parseIngredientLine(line: string): ParsedItem | null {
  // Strip garbage after comma (notes like "kita guna 500g shj")
  let working = line.replace(GARBAGE_AFTER_PRICE, "").trim();

  // --- Extract price ---
  let price = 0;

  // Pattern A: "name : price qty unit" → price after colon, keep rest for qty/unit
  const colonMatch = working.match(PRICE_AFTER_COLON);
  if (colonMatch) {
    price = parseFloat(colonMatch[1]);
    // Remove only the ": price" part, keep everything after
    working = working.replace(/:\s*[\d.]+\b/, "").trim();
  } else {
    // Pattern B: "name price utk qty+unit"
    const utkMatch = working.match(PRICE_BEFORE_UTK);
    if (utkMatch) {
      price = parseFloat(utkMatch[1]);
      working = working.replace(utkMatch[0], "").trim();
    } else {
      // Pattern C: "name price qty+unit" — price is the first standalone number
      const priceRx = /([\d.]+)\s+(\d+)(kg|g|l|ml|pcs)\b/i;
      const pcMatch = working.match(priceRx);
      if (pcMatch) {
        price = parseFloat(pcMatch[1]);
        working = working.replace(pcMatch[1], "").trim();
      }
    }
  }

  if (price === 0) return null;

  // --- Extract quantity + unit ---
  let qty = 1;
  let unit = "pcs";

  // Try space-separated: "500 g", "1 kg", "50 pcs"
  const unitSpaceMatch = UNIT_PATTERN.exec(working);
  UNIT_PATTERN.lastIndex = 0; // reset
  if (unitSpaceMatch) {
    qty = parseFloat(unitSpaceMatch[1]);
    unit = unitSpaceMatch[2].toLowerCase();
    working = working.replace(unitSpaceMatch[0], "").trim();
  } else {
    // Try attached: "500g", "1kg", "50pcs"
    const unitAttachedMatch = UNIT_ATTACHED.exec(working);
    UNIT_ATTACHED.lastIndex = 0;
    if (unitAttachedMatch) {
      qty = parseFloat(unitAttachedMatch[1]);
      unit = unitAttachedMatch[2].toLowerCase();
      working = working.replace(unitAttachedMatch[0], "").trim();
    }
  }

  // --- Clean name ---
  let name = working
    .replace(GUNA_PATTERN, "")
    .replace(NOISE_WORDS, "")
    .replace(/[,\s]+$/g, "")
    .replace(/^[,\s]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Title case the name
  name = name
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  if (!name) return null;

  // Normalise units
  if (unit === "l") unit = "L";
  if (unit === "paket" || unit === "packet") unit = "pcs";

  return {
    name,
    purchase_qty: qty,
    unit,
    purchase_price: price,
    raw: line,
  };
}
