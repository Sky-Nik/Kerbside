// Read an Australian bank statement CSV (CommBank, NAB, ANZ, Westpac, ING, Up, Macquarie…) in the browser
// and find work costs not yet recorded, plus platform payouts.
import { matchMerchant } from "./merchants.ts";

export type BankRow = { date: string; amount: number; description: string };

const MON: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

function cells(line: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { out.push(cur.trim()); cur = ""; }
    else cur += c;
  }
  out.push(cur.trim());
  return out;
}

export function toIso(s: string): string | null {
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[\s-]([a-z]{3})[a-z]*[\s-](\d{2,4})/i);
  if (m && MON[m[2].toLowerCase()]) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return `${y}-${String(MON[m[2].toLowerCase()]).padStart(2, "0")}-${m[1].padStart(2, "0")}`; }
  return null;
}
const num = (s: string) => {
  const t = s.replace(/[$,\s]/g, "");
  if (!/^[+-]?\(?\d+(\.\d+)?\)?(CR|DR)?$/i.test(t) || t === "") return null;
  let v = Number(t.replace(/[()]|CR|DR/gi, ""));
  if (/^\(|DR$/i.test(t) || /^-/.test(t)) v = -Math.abs(v);
  return v;
};

/** Debits are negative, credits positive. Works with or without a header row. */
export function parseBankCsv(text: string): BankRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const head = cells(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = head.some((h) => /date/.test(h)) && !toIso(cells(lines[0])[0] ?? "");
  const col = (re: RegExp) => head.findIndex((h) => re.test(h));
  const ci = hasHeader ? {
    date: col(/date/), amount: col(/^amount|amount$|value/), debit: col(/debit|withdraw|money out|paid out/), credit: col(/credit|deposit|money in|paid in/),
    desc: col(/desc|narrat|details|transaction|payee|memo|particulars/),
  } : null;
  const rows: BankRow[] = [];
  for (const line of hasHeader ? lines.slice(1) : lines) {
    const c = cells(line);
    let date: string | null, amount: number | null, description: string;
    if (ci) {
      date = toIso(c[ci.date] ?? "");
      if (ci.amount >= 0) amount = num(c[ci.amount] ?? "");
      else { const d = num(c[ci.debit] ?? "") , cr = num(c[ci.credit] ?? ""); amount = d ? -Math.abs(d) : cr ? Math.abs(cr) : null; }
      description = c[ci.desc] ?? "";
    } else {
      // CommBank style: date, amount, description, balance
      const di = c.findIndex((x) => toIso(x)); date = di >= 0 ? toIso(c[di]) : null;
      const ai = c.findIndex((x, i) => i !== di && num(x) != null); amount = ai >= 0 ? num(c[ai]) : null;
      description = c.filter((x, i) => i !== di && i !== ai && num(x) == null).sort((a, b) => b.length - a.length)[0] ?? "";
    }
    if (date && amount != null && amount !== 0) rows.push({ date, amount: Math.round(amount * 100) / 100, description });
  }
  return rows;
}

const PAYOUT = /\b(UBER|DIDI|DOORDASH|HUNGRY ?PANDA)\b/i;
const payoutPlatform = (d: string) => (/didi/i.test(d) ? "DiDi" : /doordash/i.test(d) ? "DoorDash" : /hungry ?panda/i.test(d) ? "HungryPanda" : "Uber");

export type Suggestion = BankRow & { category: string; name: string; kind: string };

/** Work costs (fuel, tolls, phone, parking, car costs) in the statement with no expense of the same amount within 3 days. */
export function reviewStatement(rows: BankRow[], recorded: { date: string; amount: number }[]) {
  const near = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) <= 3 * 86400000;
  const used = new Set<number>();
  const suggestions: Suggestion[] = [];
  for (const r of rows.filter((x) => x.amount < 0)) {
    const m = matchMerchant(r.description);
    if (!m) continue;
    const amt = -r.amount;
    const hit = recorded.findIndex((e, i) => !used.has(i) && Math.abs(e.amount - amt) < 0.01 && near(e.date, r.date));
    if (hit >= 0) { used.add(hit); continue; }
    suggestions.push({ ...r, amount: amt, category: m.category, name: m.name, kind: m.kind });
  }
  const payouts: Record<string, number> = {};
  for (const r of rows.filter((x) => x.amount > 0 && PAYOUT.test(x.description))) {
    const p = payoutPlatform(r.description);
    payouts[p] = Math.round(((payouts[p] ?? 0) + r.amount) * 100) / 100;
  }
  const dates = rows.map((r) => r.date).sort();
  return { suggestions, payouts, from: dates[0] ?? null, to: dates.at(-1) ?? null };
}
