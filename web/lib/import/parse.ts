// Parsers for documents users upload. Input is plain text pulled from the PDF.
// Only tax figures are extracted: TFN, date of birth and address are never read or stored.

const flat = (t: string) => t.replace(/ /g, " ").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
const num = (s: string | undefined) => (s ? Math.round(Number(s.replace(/[,$A\s]/g, "")) * 100) / 100 : 0);
const AMT = String.raw`(-?)A?\$\s?([\d,]+(?:\.\d{1,2})?)`;
const amt = (t: string, label: string) => {
  const m = t.match(new RegExp(`${label}\\s*-?\\s*${AMT}`, "i"));
  return m ? (m[1] ? -1 : 1) * num(m[2]) : 0;
};
const sumAll = (t: string, label: string) =>
  [...t.matchAll(new RegExp(`${label}\\s*-?\\s*${AMT}`, "gi"))].reduce((s, m) => s + (m[1] ? -1 : 1) * num(m[2]), 0);

// ---------- ATO "customer copy" of a lodged return (myGov > Tax > Lodgments > Print) ----------
export type LodgedReturn = {
  kind: "tax_return"; fy: string; receipt: string | null; taxable: number; wages: number; taxWithheld: number; interest: number;
  businessIncome: number; businessExpenses: number; netBusiness: number; motorVehicle: number; motorVehicleMethod: string | null;
  payers: { name: string; gross: number }[];
};

export function parseLodgedReturn(raw: string): LodgedReturn | null {
  const t = flat(raw);
  const y = t.match(/(\d{4})-(\d{2}) tax return/i);
  if (!y || !/Taxable income/i.test(t)) return null;
  const payers: { name: string; gross: number }[] = [];
  // Income statements: "Payer - NAME ABN or WPN - ... Gross payments $X"
  for (const m of t.matchAll(new RegExp(`Payer - (.+?) ABN or WPN.*?Gross payments ${AMT}`, "gi"))) payers.push({ name: m[1].trim(), gross: num(m[3]) });
  // Business payments (TPAR): "Payer's name - NAME Payer's ABN ... Gross amount paid (...) - $X"
  for (const m of t.matchAll(new RegExp(`Payer's name - (.+?) Payer's ABN.*?Gross amount paid \\([^)]*\\) - ${AMT}`, "gi"))) payers.push({ name: m[1].trim(), gross: num(m[3]) });
  const mvType = t.match(/Motor vehicle expense type - ([A-Z])/i);
  const net = t.match(new RegExp(`Total non-primary production net income or loss from business ${AMT}`, "i"));
  return {
    kind: "tax_return",
    fy: `${y[1]}-${y[2]}`,
    receipt: t.match(/ATO receipt number ([\d ]{6,})/i)?.[1].trim() ?? null,
    taxable: amt(t, "Taxable income"),
    wages: round2(sumAll(t, "Gross payments")),
    taxWithheld: round2(Math.abs(sumAll(t, "Tax withheld -"))),
    interest: round2(sumAll(t, "Gross interest")),
    businessIncome: amt(t, "Non-primary production total business income"),
    businessExpenses: Math.abs(amt(t, "Non-primary production total expenses")),
    netBusiness: net ? (net[1] ? -1 : 1) * num(net[2]) : 0,
    motorVehicle: Math.abs(amt(t, "Motor vehicle expenses")),
    motorVehicleMethod: mvType ? ({ S: "Cents per kilometre", B: "Logbook" } as Record<string, string>)[mvType[1].toUpperCase()] ?? mvType[1] : null,
    payers,
  };
}

// ---------- Uber tax summary (monthly or annual) ----------
export type SummaryEntry = { platform: "Uber" | "Uber Eats"; lines: Record<string, number>; fees: Record<string, number>; km?: number };
export type PlatformSummary = {
  kind: "platform_summary"; source: "Uber"; period: { label: string; start: string | null; end: string | null; annual: boolean };
  totalPayments: number; entries: SummaryEntry[];
  km: number | null; // "On Trip Mileage": km with a passenger or order on board
  mismatch: number; // Total Payments minus what was read; non-zero means a section wasn't recognised
};

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function summaryPeriod(t: string): PlatformSummary["period"] {
  const fy = t.match(/FY (\d{4})\/(\d{4})/i);
  const range = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (range) {
    const start = iso(+range[3], +range[2], +range[1]), end = iso(+range[6], +range[5], +range[4]);
    return { label: `${range[1]}/${range[2]}/${range[3]} – ${range[4]}/${range[5]}/${range[6]}`, start, end, annual: false };
  }
  const mon = t.match(new RegExp(`Tax summary[^.]{0,40}?\\b(${MONTHS.join("|")})\\s+(\\d{4})`, "i"))
    ?? t.match(new RegExp(`\\b(${MONTHS.join("|")})\\s+(\\d{4})\\b`, "i"));
  if (mon && !fy) {
    const m = MONTHS.indexOf(mon[1].toLowerCase()) + 1, y = +mon[2];
    return { label: `${mon[1][0].toUpperCase()}${mon[1].slice(1).toLowerCase()} ${y}`, start: iso(y, m, 1), end: iso(y, m, lastDay(y, m)), annual: false };
  }
  if (fy) return { label: `FY ${fy[1]}/${fy[2]}`, start: iso(+fy[1], 7, 1), end: iso(+fy[2], 6, 30), annual: true };
  return { label: "Unknown period", start: null, end: null, annual: false };
}

/** Text between two headings (so labels repeated in several sections, like "Tolls Reimbursement", stay apart). */
const section = (t: string, from: string, to: string) => {
  const a = t.search(new RegExp(from, "i"));
  if (a < 0) return "";
  const b = t.slice(a).search(new RegExp(to, "i"));
  return b < 0 ? t.slice(a) : t.slice(a, a + b + 60);
};

export function parseUberSummary(raw: string): PlatformSummary | null {
  const t = flat(raw);
  if (!/Tax summary/i.test(t) || !/(Uber|Portier Pacific)/i.test(t) || !/Total Payments/i.test(t)) return null;
  const transport = section(t, "Gross transportation fare", "Total Transportation Income");
  const delivery = section(t, "Delivery Fee", "Total Delivery Income");
  const other = section(t, "Other Payments Miscellaneous", "Total Other Payments");
  const deductions = section(t, "Deductions", "Total Potential Tax Deductions");

  const T = amt(transport, "Total Transportation Income");
  const D = amt(delivery, "Total Delivery Income");
  const DI = amt(delivery, "Delivery Incentives");
  const misc = amt(other, "Miscellaneous"), referral = amt(other, "Referral / Incentives"), tips = amt(other, "Tips");
  // Pack & Deliver has its own section; take the detail block just before its total (the cover page repeats the heading).
  const pdTotalAt = t.search(/Total Pack & Deliver Income/i);
  const pdBlock = pdTotalAt < 0 ? "" : t.slice(Math.max(0, t.slice(0, pdTotalAt).search(/Pack & Deliver Income(?![\s\S]*Pack & Deliver Income)/i)), pdTotalAt + 80);
  const PD = amt(pdBlock, "Total Pack & Deliver Income");
  const PDI = amt(pdBlock.replace(/Total Pack & Deliver Income.*$/i, ""), "(?:Pack & Deliver )?Incentives");
  const km = (() => {
    const m = t.match(/On Trip Mileage\s*([\d,.]+)\s*km/i) ?? t.match(/([\d,.]+)\s*km\s*On Trip Mileage/i);
    return m ? Number(m[1].replace(/,/g, "")) : null;
  })();
  const serviceFee = amt(deductions, String.raw`Uber service fee \(transportation leads\)\*?`);
  const otherCharges = amt(deductions, "Other charges from Uber") + amt(deductions, String.raw`Charges from 3rd parties \([^)]*\)`);

  // Gross = net + fees. Rides keep the Uber service fee; other charges and extras go to the bigger platform.
  const rides: SummaryEntry = { platform: "Uber", lines: { "Net fare": round2(T - serviceFee) }, fees: serviceFee ? { "Service fees": serviceFee } : {} };
  // Pack & Deliver is delivery income: counted with Uber Eats (it's all business income at P8 label J).
  const eats: SummaryEntry = { platform: "Uber Eats", lines: { "Net fare": round2(D - DI + PD - PDI), Promotions: round2(DI + PDI) }, fees: {} };
  const main = T >= D + PD ? rides : eats;
  if (km != null) main.km = km;
  main.lines.Promotions = round2((main.lines.Promotions ?? 0) + misc + referral);
  if (tips) main.lines.Tips = tips;
  if (otherCharges) {
    main.lines["Net fare"] = round2(main.lines["Net fare"] - otherCharges);
    main.fees["Service fees"] = round2((main.fees["Service fees"] ?? 0) + otherCharges);
  }
  const entries = [rides, eats].filter((e) => e === main || Object.values(e.lines).some((v) => v));
  for (const e of entries) for (const k of Object.keys(e.lines)) if (!e.lines[k]) delete e.lines[k];
  const totalPayments = amt(t, "Total Payments");
  const read = round2(entries.reduce((sum, e) => sum + entryGross(e), 0));
  return { kind: "platform_summary", source: "Uber", period: summaryPeriod(t), totalPayments, entries, km, mismatch: round2(totalPayments - read) };
}

/** Sales (gross) represented by a summary entry: net + promotions + tips + fees. */
export const entryGross = (e: SummaryEntry) =>
  round2(Object.values(e.lines).reduce((s, v) => s + v, 0) + Object.values(e.fees).reduce((s, v) => s + v, 0));
