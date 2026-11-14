// Turn OCR text from a receipt photo into suggested expense fields.
import { matchMerchant } from "./merchants.ts";

export type ReceiptGuess = { total: number | null; gst: number | null; date: string | null; supplier: string | null; category: string | null };

const MON: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const money = (s: string) => {
  const v = Number(s.replace(/[,\s$]/g, ""));
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
};
const AMOUNTS = /\$?\s?(\d{1,5}(?:,\d{3})*[.,]\d{2})(?!\d)/g;
const amountsIn = (line: string) => [...line.matchAll(AMOUNTS)].map((m) => money(m[1].replace(/,(\d{2})$/, ".$1"))).filter((v): v is number => v != null);

function findDate(text: string, today: string): string | null {
  const iso = (y: number, m: number, d: number) => {
    if (y < 100) y += 2000;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const s = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return s <= today ? s : null; // receipts aren't from the future
  };
  for (const m of text.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/g)) { const r = iso(+m[3], +m[2], +m[1]); if (r) return r; }
  for (const m of text.matchAll(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s+(\d{2,4})\b/gi)) {
    const r = iso(+m[3], MON[m[2].toLowerCase()], +m[1]); if (r) return r;
  }
  return null;
}

export function parseReceipt(text: string, today: string): ReceiptGuess {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // Total: the amount on a TOTAL / AMOUNT DUE / EFTPOS line (not SUBTOTAL), else the largest amount on the receipt.
  const totalLines = lines.filter((l) => /\b(total|amount due|amount paid|eftpos|balance due|to pay)\b/i.test(l) && !/sub\s?-?total|total\s+gst|gst\s+total/i.test(l));
  const fromTotals = totalLines.flatMap(amountsIn);
  const all = lines.flatMap(amountsIn);
  const total = fromTotals.length ? Math.max(...fromTotals) : all.length ? Math.max(...all) : null;
  // GST: "GST" / "includes GST" line; ignore an amount equal to the total
  const gstLine = lines.find((l) => /\bgst\b/i.test(l) && amountsIn(l).length);
  const gst = gstLine ? (amountsIn(gstLine).filter((v) => v !== total).pop() ?? null) : null;
  const merchant = matchMerchant(text);
  const firstWords = lines.find((l) => /[a-z]{3}/i.test(l) && !/tax invoice|receipt|abn|welcome/i.test(l)) ?? null;
  return {
    total, gst: gst != null && total != null && gst < total ? gst : null, date: findDate(text, today),
    supplier: merchant?.name ?? (firstWords ? firstWords.slice(0, 40) : null), category: merchant?.category ?? null,
  };
}
