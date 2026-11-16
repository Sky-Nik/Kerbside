// Turn OCR text from a weekly-earnings screenshot (Uber, DiDi, Uber Eats, DoorDash, HungryPanda driver apps)
// into income-form fields. Runs on the device; nothing is uploaded.
// ponytail: keyword heuristics tuned on typical layouts, not on every app version. Always shown for checking before saving.

export type EarningsGuess = {
  platform: string | null; from: string | null; to: string | null;
  netFare: number | null; promotions: number | null; tips: number | null; serviceFee: number | null; hours: number | null;
};

const MON: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const AMT = /-?\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2})/;
const amountOn = (line: string) => { const m = line.match(AMT); return m ? Math.round(Number(m[1].replace(/,/g, "")) * 100) / 100 : null; };
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const addDays = (s: string, n: number) => new Date(Date.parse(s) + n * 86400000).toISOString().slice(0, 10);

function datesIn(text: string, today: string): string[] {
  const year = Number(today.slice(0, 4)), out: { i: number; d: string }[] = [];
  const push = (i: number, y: number | null, m: number, d: number) => {
    if (!m || d < 1 || d > 31) return;
    let s = iso(y ?? year, m, d);
    if (!y && s > today) s = iso(year - 1, m, d); // "15 Dec" seen in January means last year
    out.push({ i, d: s });
  };
  for (const m of text.matchAll(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(?:,?\s+(\d{4}))?/gi)) push(m.index!, m[3] ? +m[3] : null, MON[m[2].toLowerCase()], +m[1]);
  for (const m of text.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/gi)) push(m.index!, m[3] ? +m[3] : null, MON[m[1].toLowerCase()], +m[2]);
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g)) push(m.index!, +m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  return out.sort((a, b) => a.i - b.i).map((x) => x.d);
}

export function parseEarnings(text: string, today: string): EarningsGuess {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const platform = /hungry ?panda/i.test(text) ? "HungryPanda" : /doordash|dasher/i.test(text) ? "DoorDash" : /didi/i.test(text) ? "DiDi"
    : /uber ?eats|deliver(y|ies)/i.test(text) ? "Uber Eats" : /uber|trips?\b/i.test(text) ? "Uber" : null;

  const pick = (re: RegExp, not?: RegExp) => {
    let sum: number | null = null;
    for (const l of lines) if (re.test(l) && !(not && not.test(l))) { const a = amountOn(l); if (a != null) sum = Math.round(((sum ?? 0) + Math.abs(a)) * 100) / 100; }
    return sum;
  };
  const netFare = pick(/^(net )?fares?\b|\bnet fare|\bdelivery pay|\bbase pay|\btrip earnings/i, /promotion|tip|fee|total/i);
  const promotions = pick(/promotion|quest|boost|surge|incentive|bonus|challenge/i);
  const tips = pick(/\btips?\b|customer tips?/i, /fee/i);
  const serviceFee = pick(/service fee|uber fee|platform fee|booking fee|commission/i);

  let hours: number | null = null;
  const h = text.match(/(\d{1,3})\s*h(?:rs?|ours?)?\s*(\d{1,2})?\s*m?(?:in)?/i);
  if (h && /online|hours|time/i.test(text)) hours = Math.round((+h[1] + (h[2] ? +h[2] / 60 : 0)) * 10) / 10;

  const dates = datesIn(text, today);
  const from = dates[0] ?? null;
  let to = dates[1] ?? (from ? addDays(from, 6) : null);
  // Uber's week runs Monday 4am to the next Monday 4am: "9 Nov – 16 Nov" means the week ending Sunday the 15th.
  if (from && to && Math.round((Date.parse(to) - Date.parse(from)) / 86400000) === 7) to = addDays(to, -1);
  if (from && to && to < from) to = addDays(from, 6);
  return { platform, from, to, netFare, promotions, tips, serviceFee, hours };
}
