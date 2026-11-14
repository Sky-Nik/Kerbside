// Kerbside tax engine (rebuilt from the Rideshare Tax Tracker spreadsheet). Pure functions, no I/O.
// Amounts are dollars (numbers); everything is rounded to cents where the ATO would.

export type PctKey = "car" | "phone" | "internet" | "music" | "computer";
export type UseKey = PctKey | "business";
export type Pct = Record<PctKey, number[]>; // 4 quarters, fractions 0..1

export const PCT_LABELS: Record<PctKey, string> = {
  car: "Car",
  phone: "Mobile phone",
  internet: "Home internet",
  music: "Music (passenger use)",
  computer: "Computer",
};

export const FEE_TYPES = [
  "Service fees",
  "Split fare fees",
  "Tolls",
  "City / government fees",
  "Airport fees",
  "Booking fees",
  "Instant pay fees",
  "Other fees",
] as const;
export type FeeType = (typeof FEE_TYPES)[number];

type PlatformDef = {
  lines: string[];
  fees: FeeType[]; // fees the user types in
  passThrough: Record<string, FeeType>; // income line -> fee it is paid on as
};

// Lines match the earnings screen in the driver apps. Net fare is after the platform's service fee,
// so no fees are entered. ponytail: fees/passThrough kept for old-style rows; add fields back if needed.
export const INCOME_LINES = ["Net fare", "Promotions", "Tips"] as const;
export const PLATFORMS: Record<string, PlatformDef> = {
  Uber: { lines: [...INCOME_LINES], fees: [], passThrough: {} },
  DiDi: { lines: [...INCOME_LINES], fees: [], passThrough: {} },
  "Uber Eats": { lines: [...INCOME_LINES], fees: [], passThrough: {} },
  DoorDash: { lines: [...INCOME_LINES], fees: [], passThrough: {} },
  HungryPanda: { lines: [...INCOME_LINES], fees: [], passThrough: {} },
};

/** Monday (ISO date) of the week containing `iso`. */
export function mondayOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
/** Ids of entries whose date range overlaps another entry for the same platform (would double count). */
export function overlappingIds(entries: { id: string; platform: string; start_date: string; end_date: string }[]): Set<string> {
  const out = new Set<string>();
  const sorted = [...entries].sort((a, b) => a.platform.localeCompare(b.platform) || a.start_date.localeCompare(b.start_date));
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1], cur = sorted[i];
    if (prev.platform === cur.platform && cur.start_date <= prev.end_date) out.add(prev.id).add(cur.id);
  }
  return out;
}
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export type Category = { name: string; gst: boolean; use: UseKey; line: string };
export const CATEGORIES: Category[] = [
  { name: "Car - Fuel", gst: true, use: "car", line: "Car - Fuel & charging" },
  { name: "Car - EV home charging (business kWh only)", gst: true, use: "car", line: "Car - Fuel & charging" },
  { name: "Car - EV public charging", gst: true, use: "car", line: "Car - Fuel & charging" },
  { name: "Car - Registration", gst: false, use: "car", line: "Car - Registration" },
  { name: "Car - Insurance & CTP", gst: true, use: "car", line: "Car - Insurance" },
  { name: "Car - Servicing, repairs & tyres", gst: true, use: "car", line: "Car - Repairs & maintenance" },
  { name: "Car - Rent, hire & lease payments", gst: true, use: "car", line: "Car - Lease & hire" },
  { name: "Car - Cleaning", gst: true, use: "car", line: "Car - Other" },
  { name: "Car - Accessories & other (GST)", gst: true, use: "car", line: "Car - Other" },
  { name: "Car - Accessories & other (no GST)", gst: false, use: "car", line: "Car - Other" },
  { name: "Accountancy", gst: true, use: "business", line: "Accountancy" },
  { name: "Bank fees", gst: false, use: "business", line: "Bank fees" },
  { name: "Computer expenses (GST)", gst: true, use: "computer", line: "Computer expenses" },
  { name: "Computer expenses (no GST)", gst: false, use: "computer", line: "Computer expenses" },
  { name: "Courses & training", gst: true, use: "business", line: "Courses & training" },
  { name: "Equipment (dashcam, tools etc)", gst: true, use: "business", line: "Equipment" },
  { name: "Internet at home", gst: true, use: "internet", line: "Internet" },
  { name: "Licences, permits, checks, medicals (GST)", gst: true, use: "business", line: "Licences & permits" },
  { name: "Licences, permits, checks, medicals (no GST)", gst: false, use: "business", line: "Licences & permits" },
  { name: "Mobile phone - mixed use", gst: true, use: "phone", line: "Mobile phone" },
  { name: "Mobile phone - 100% business", gst: true, use: "business", line: "Mobile phone" },
  { name: "Music subscriptions (passenger use)", gst: true, use: "music", line: "Music subscriptions" },
  { name: "Parking", gst: true, use: "business", line: "Parking" },
  { name: "Rider amenities - water (no GST)", gst: false, use: "business", line: "Rider amenities" },
  { name: "Rider amenities - mints, tissues etc (GST)", gst: true, use: "business", line: "Rider amenities" },
  { name: "Sanitisation & hygiene", gst: true, use: "business", line: "Sanitisation & hygiene" },
  { name: "Stationery", gst: true, use: "business", line: "Stationery" },
  { name: "Sunglasses (business portion only)", gst: true, use: "business", line: "Sunglasses" },
  { name: "Tolls (business tolls not reimbursed)", gst: true, use: "business", line: "Tolls" },
  { name: "Other expenses (GST)", gst: true, use: "business", line: "Other" },
  { name: "Other expenses (no GST)", gst: false, use: "business", line: "Other" },
];
const CAT_BY_NAME = new Map(CATEGORIES.map((c) => [c.name, c]));
export const CAR_LINES = [...new Set(CATEGORIES.filter((c) => c.use === "car").map((c) => c.line))];
export const OTHER_LINES = [...new Set(CATEGORIES.filter((c) => c.use !== "car").map((c) => c.line))];

// ATO rates. ponytail: 2026-27 copies 2025-26 until the ATO publishes it; users can override per year in Settings.
/** Instant asset write-off limit per asset for small businesses (ATO: $20,000 for assets first used on or after 1 July 2023). */
export const IAWO_LIMIT = 20000;
/** Concessional (deductible) super contributions cap. ATO: $30,000 2024-25 to 2025-26, $32,500 from 1 July 2026. */
export const SUPER_CAP: Record<string, number> = { "2026-27": 32500, "2025-26": 30000, "2024-25": 30000, "2023-24": 27500 };
export const SG_RATE = 0.12; // employer super guarantee from 1 July 2025

export const ATO_RATES: Record<string, { carLimit: number; cpk: number }> = {
  "2026-27": { carLimit: 69674, cpk: 0.91 }, // cpk: ATO 91c (89c + 2c one-off uplift). Car limit: not yet published, 2025-26 figure.
  "2025-26": { carLimit: 69674, cpk: 0.88 },
  "2024-25": { carLimit: 69674, cpk: 0.88 },
  "2023-24": { carLimit: 68108, cpk: 0.85 },
  "2022-23": { carLimit: 64741, cpk: 0.78 },
};

export const QUARTERS = ["Q1 Jul-Sep", "Q2 Oct-Dec", "Q3 Jan-Mar", "Q4 Apr-Jun"];
export const BAS_DUE = ["28 October", "28 February", "28 April", "28 July"];

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

// ---------- dates (ISO yyyy-mm-dd strings, no timezone surprises) ----------
export function fyOf(iso: string): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const start = m >= 7 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}
export function fyRange(fy: string) {
  const s = Number(fy.slice(0, 4));
  return { start: `${s}-07-01`, end: `${s + 1}-06-30` };
}
export function quarterOf(iso: string): number {
  const m = Number(iso.slice(5, 7));
  return m >= 7 ? Math.floor((m - 7) / 3) : 2 + Math.floor((m - 1) / 3);
}
/** First-of-month ISO dates for a quarter (0-3) of a financial year. */
export function monthsOf(fy: string, q: number): string[] {
  const s = Number(fy.slice(0, 4));
  return [0, 1, 2].map((i) => {
    const idx = 6 + q * 3 + i; // months since Jan of start year, 0-based
    const y = s + Math.floor(idx / 12);
    const m = (idx % 12) + 1;
    return `${y}-${String(m).padStart(2, "0")}-01`;
  });
}
/** Days the car was owned within the FY (inclusive), given optional purchase / sale dates. */
export function daysOwned(fy: string, from?: string | null, to?: string | null): number {
  const { start, end } = fyRange(fy);
  const a = from && from > start ? from : start;
  const b = to && to < end ? to : end;
  return Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1);
}
/** Today's date in Australia (ISO). The server runs in UTC, which is a calendar day behind each morning here. */
export const todayAu = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(new Date());
export const currentFy = () => fyOf(todayAu());
export function fyOptions(around = currentFy(), back = 3): string[] {
  const s = Number(around.slice(0, 4));
  return Array.from({ length: back + 2 }, (_, i) => s + 1 - i).map((y) => fyOf(`${y}-07-01`));
}

// ---------- row calculations ----------
export const gstOf = (amount: number, registered: boolean, gstFree = false) =>
  registered && !gstFree ? round2(amount / 11) : 0;

export function platformMonth(platform: string, lines: Record<string, unknown>, fees: Record<string, unknown>,
  registered: boolean) {
  const def = PLATFORMS[platform];
  // ATO: GST is on the full fare the passenger pays. "Net fare" is after the platform's service fee,
  // so the full fare = net fare + service fee.
  const grossUp = "Net fare" in lines ? num(fees["Service fees"]) : 0;
  const sales = round2(Object.values(lines).reduce<number>((s, v) => s + num(v), 0) + grossUp);
  const derived: Partial<Record<FeeType, number>> = {};
  if (def) for (const [line, fee] of Object.entries(def.passThrough)) derived[fee] = num(derived[fee]) + num(lines[line]);
  const feeRows = FEE_TYPES.map((type) => {
    const override = fees[type];
    const amount = round2(override === undefined || override === null || override === "" ? num(derived[type]) : num(override));
    return { type, amount, derived: num(derived[type]), gst: gstOf(amount, registered) };
  }).filter((f) => f.amount !== 0 || f.derived !== 0);
  const feeTotal = round2(feeRows.reduce((s, f) => s + f.amount, 0));
  const feeGst = round2(feeRows.reduce((s, f) => s + f.gst, 0));
  const gst = gstOf(sales, registered);
  return { sales, gst, net: round2(sales - gst), feeRows, feeTotal, feeGst, feeNet: round2(feeTotal - feeGst) };
}

export function expenseCalc(amount: number, category: string, pct: Pct, q: number, registered: boolean) {
  const cat = CAT_BY_NAME.get(category);
  const use = cat?.use ?? "business";
  const share = use === "business" ? 1 : num(pct[use]?.[q]);
  const business = round2(amount * share);
  const gst = registered && cat?.gst ? round2(business / 11) : 0;
  return { share, business, gst, deductible: round2(business - gst), line: cat?.line ?? "Other" };
}

export function carPurchaseGst(seller: string | null, gst: number, carLimit: number, businessPct: number) {
  if (!seller || seller === "private_no_gst") return 0;
  return round2(Math.min(gst, round2(carLimit / 11)) * businessPct);
}

export type Trip = { odo_start: number; odo_end: number; purpose: string; vehicle_id?: string | null };
export function logbook(trips: Trip[], odoYearStart?: number | null, odoYearEnd?: number | null) {
  const km = { rideshare: 0, other_abn: 0, employment: 0, private: 0 };
  let min = Infinity, max = -Infinity;
  for (const t of trips) {
    if (t.purpose in km) km[t.purpose as keyof typeof km] += t.odo_end - t.odo_start;
    min = Math.min(min, t.odo_start);
    max = Math.max(max, t.odo_end);
  }
  // Gaps between odometer readings count as private.
  const total = trips.length ? max - min : 0;
  const businessKm = km.rideshare + km.other_abn;
  const businessPct = total ? businessKm / total : 0;
  const yearKm = odoYearStart && odoYearEnd && odoYearEnd > odoYearStart ? odoYearEnd - odoYearStart : 0;
  return {
    total, ...km, businessKm, businessPct,
    employmentPct: total ? km.employment / total : 0,
    annualBusinessKm: Math.round(yearKm ? yearKm * businessPct : businessKm),
  };
}

// ---------- whole-year summary ----------
export type YearSettings = {
  fy: string; gst_registered: boolean; car_method: "logbook" | "cpk"; pct: Pct;
  car_limit: number; cpk_rate: number; gov_payments: number; other_business_income: number;
  car_cost: number; opening_value: number; days_owned: number; effective_life: number; loan_interest: number;
  // Other parts of your return, for the refund / amount-owing estimate (optional)
  wages?: number; tax_withheld?: number; payg_instalments?: number; other_income?: number; other_deductions?: number;
  // Odometer at the start/end of the period you had the car this FY (defaults 1 July / 30 June).
  odo_year_start?: number | null; odo_year_end?: number | null;
  car_start_date?: string | null; car_end_date?: string | null;
};
export type YearData = {
  // ponytail: an entry counts in the quarter its start ("From") date falls in.
  incomeEntries: { start_date: string; platform: string; lines: Record<string, unknown>; fees: Record<string, unknown> }[];
  otherIncome: { date: string; amount: number; gst_free: boolean }[];
  expenses: { date: string; amount: number; category: string; vehicle_id?: string | null }[];
  trips: Trip[];
  /** Cars other than the main one (set up in Settings / the year's car fields). Trips and expenses point at them by vehicle_id. */
  vehicles?: Vehicle[];
  carTx: { date: string; kind: "purchase" | "sale"; seller: string | null; amount: number; gst: number; business_pct: number }[];
};

export type Vehicle = { id: string; name: string; cost: number; start_date: string; end_date: string | null; effective_life: number };

const nextFy = (fy: string) => fyOf(addDays(fyRange(fy).end, 1));
/** Diminishing-value written-down value at the start of `fy` (instant asset write-off cars are nil after their first year). */
export function openingValue(costBase: number, start: string, end: string | null, life: number, fy: string) {
  let v = costBase;
  for (let f = fyOf(start); f < fy; f = nextFy(f)) {
    if (f === fyOf(start) && costBase < IAWO_LIMIT) return 0;
    v -= (v * daysOwned(f, start, end)) / 365 * (2 / life);
  }
  return round2(Math.max(0, v));
}

const zero4 = () => [0, 0, 0, 0];

export function summarise(y: YearSettings, d: YearData) {
  const reg = y.gst_registered;
  const q = { sales: zero4(), gstSales: zero4(), netIncome: zero4(), g10: zero4(), g11: zero4(), gstPurch: zero4(),
    fees: zero4(), expenses: zero4() };
  const feeByType: Record<string, number[]> = Object.fromEntries(FEE_TYPES.map((t) => [t, zero4()]));
  const byLine: Record<string, number[]> = {};

  for (const pm of d.incomeEntries) {
    const i = quarterOf(pm.start_date);
    const r = platformMonth(pm.platform, pm.lines, pm.fees, reg);
    q.sales[i] += r.sales; q.gstSales[i] += r.gst; q.netIncome[i] += r.net;
    q.g11[i] += r.feeTotal; q.gstPurch[i] += r.feeGst; q.fees[i] += r.feeNet;
    for (const f of r.feeRows) feeByType[f.type][i] += f.amount - f.gst;
  }
  for (const o of d.otherIncome) {
    const i = quarterOf(o.date);
    const g = gstOf(num(o.amount), reg, o.gst_free);
    q.sales[i] += num(o.amount); q.gstSales[i] += g; q.netIncome[i] += num(o.amount) - g;
  }
  // Extra cars: each one's business % comes from its own logbook trips.
  const avgCarPct = y.pct.car.reduce((s, v) => s + num(v), 0) / 4;
  const extra = (d.vehicles ?? []).map((v) => {
    const lbV = logbook(d.trips.filter((t) => t.vehicle_id === v.id));
    return { v, lb: lbV, pct: lbV.total > 0 ? lbV.businessPct : avgCarPct };
  });
  const pctFor = (vid?: string | null) => {
    const x = vid ? extra.find((c) => c.v.id === vid) : null;
    return x ? { ...y.pct, car: [x.pct, x.pct, x.pct, x.pct] as Pct["car"] } : y.pct;
  };
  for (const e of d.expenses) {
    const i = quarterOf(e.date);
    const c = expenseCalc(num(e.amount), e.category, pctFor(e.vehicle_id), i, reg);
    q.g11[i] += num(e.amount); q.gstPurch[i] += c.gst; q.expenses[i] += c.deductible;
    (byLine[c.line] ??= zero4())[i] += c.deductible;
  }
  let carGstClaimed = 0;
  for (const t of d.carTx) {
    const i = quarterOf(t.date);
    if (t.kind === "purchase") {
      const g = carPurchaseGst(t.seller, num(t.gst), num(y.car_limit), num(t.business_pct));
      q.g10[i] += num(t.amount); q.gstPurch[i] += g; carGstClaimed += g;
    } else {
      // ponytail: sale counted at business portion (same convention as the spreadsheet); accountant handles balancing adjustments.
      const biz = round2(num(t.amount) * num(t.business_pct));
      q.sales[i] += biz; q.gstSales[i] += gstOf(biz, reg);
    }
  }
  for (const k of Object.keys(q) as (keyof typeof q)[]) q[k] = q[k].map(round2);
  const bas = [0, 1, 2, 3].map((i) => ({
    G1: q.sales[i], "1A": q.gstSales[i], G10: q.g10[i], G11: q.g11[i], "1B": q.gstPurch[i],
    net: round2(q.gstSales[i] - q.gstPurch[i]),
  }));

  // Tax return
  const lb = logbook(d.trips.filter((t) => !t.vehicle_id), y.odo_year_start, y.odo_year_end);
  const annualCarPct = lb.total > 0 ? lb.businessPct : avgCarPct;
  const costBase = Math.max(0, Math.min(num(y.car_cost), num(y.car_limit)) - carGstClaimed);
  // Instant asset write-off: a car costing under $20,000 (ex GST credits) first used this year is deducted in full.
  const { start: fyStart, end: fyEnd } = fyRange(y.fy);
  const writeOff = costBase > 0 && costBase < IAWO_LIMIT && !!y.car_start_date && y.car_start_date >= fyStart && y.car_start_date <= fyEnd;
  const depFull = writeOff ? round2(costBase) : round2((num(y.opening_value) * num(y.days_owned)) / 365 * (2 / num(y.effective_life || 8)));
  const mainDep = round2(depFull * annualCarPct);
  const cars = extra.map(({ v, lb: lbV, pct: p }) => {
    const base = Math.min(num(v.cost), num(y.car_limit));
    const wo = base > 0 && base < IAWO_LIMIT && v.start_date >= fyStart && v.start_date <= fyEnd;
    const full = wo ? base : (openingValue(base, v.start_date, v.end_date, num(v.effective_life) || 8, y.fy) * daysOwned(y.fy, v.start_date, v.end_date)) / 365 * (2 / (num(v.effective_life) || 8));
    return { id: v.id, name: v.name, pct: p, writeOff: wo, depreciation: round2(full * p), cpkKm: Math.min(5000, lbV.businessKm) };
  });
  // ponytail: one method (logbook or cents/km) for every car; the ATO lets you choose per car.
  const depreciation = round2(mainDep + cars.reduce((t, c) => t + c.depreciation, 0));
  const interest = round2(num(y.loan_interest) * annualCarPct);
  const sum = (a: number[]) => round2(a.reduce((s, v) => s + v, 0));
  const carLines = CAR_LINES.map((l) => ({ label: l.replace("Car - ", ""), q: (byLine[l] ?? zero4()).map(round2) }));
  const logbookTotal = round2(carLines.reduce((s, l) => s + sum(l.q), 0) + depreciation + interest);
  const cpkKm = Math.min(5000, lb.annualBusinessKm) + cars.reduce((t, c) => t + c.cpkKm, 0);
  const cpkTotal = round2(cpkKm * num(y.cpk_rate));
  const carClaim = y.car_method === "cpk" ? cpkTotal : logbookTotal;
  const feeLines = FEE_TYPES.map((t) => ({ label: t, q: feeByType[t].map(round2) }));
  const otherLines = OTHER_LINES.map((l) => ({ label: l, q: (byLine[l] ?? zero4()).map(round2) }));
  const feesTotal = sum(q.fees);
  const otherTotal = round2(otherLines.reduce((s, l) => s + sum(l.q), 0));
  const income = round2(sum(q.netIncome) + num(y.gov_payments) + num(y.other_business_income));
  const totalExpenses = round2(carClaim + feesTotal + otherTotal);

  // ATO Business and professional items schedule 2026, P8 (non-primary production column). All amounts ex GST.
  // Source: ato.gov.au BPI instructions 2026 – Income P8 / Expenses P8; supplementary return Q15.
  const cpk = y.car_method === "cpk";
  const carLease = cpk ? 0 : sum(byLine["Car - Lease & hire"] ?? zero4());
  const p8 = {
    incomeH: round2(num(y.gov_payments)), // Assessable government industry payments (non-primary)
    incomeJ: round2(sum(q.netIncome) + num(y.other_business_income)), // Other business income – incl. ride-sourcing
    F: feesTotal, // Contractor, sub-contractor and commission expenses (platform service fees)
    J: carLease, // Lease expenses
    M: cpk ? 0 : depreciation, // Depreciation expenses
    N: cpk ? cpkTotal : round2(logbookTotal - depreciation - interest - carLease), // Motor vehicle expenses
    nType: cpk ? "S" : "B", // Type code: S = cents per km, B = logbook
    P: otherTotal, // All other expenses
    Q: cpk ? 0 : interest, // Interest expenses within Australia
    T: totalExpenses, // Total expenses (non-primary production)
    Z: round2(income - totalExpenses), // Net income or loss (non-primary) -> Q15 label C
  };

  return {
    q, bas,
    basYear: { G1: sum(q.sales), "1A": sum(q.gstSales), G10: sum(q.g10), G11: sum(q.g11), "1B": sum(q.gstPurch),
      net: round2(sum(q.gstSales) - sum(q.gstPurch)) },
    profitByQuarter: [0, 1, 2, 3].map((i) => round2(q.netIncome[i] - q.fees[i] - q.expenses[i])),
    logbook: lb, annualCarPct, p8, cars,
    estimate: estimateTax(y.fy, round2(income - totalExpenses), {
      wages: num(y.wages), taxWithheld: num(y.tax_withheld), paygInstalments: num(y.payg_instalments),
      otherIncome: num(y.other_income), otherDeductions: num(y.other_deductions),
    }),
    tax: {
      businessIncome: sum(q.netIncome), income, carLines, depreciation, interest, logbookTotal, cpkKm, cpkTotal,
      carClaim, feeLines, feesTotal, otherLines, otherTotal, totalExpenses, profit: round2(income - totalExpenses),
      dep: { carGstClaimed, costBase, depFull, depreciation: mainDep, writeOff, closing: writeOff ? 0 : round2(num(y.opening_value) - depFull) },
    },
  };
}

// ---------- income tax estimate (Australian residents) ----------
// Sources: ATO "Tax rates – Australian residents" (2025-26: 16%; 2026-27: 15%; 2027-28: 14%),
// Medicare levy 2% with low-income reduction, Low income tax offset, Small business income tax offset.
const RATES: Record<string, [number, number][]> = {
  // [upper limit of bracket, marginal rate]
  "2025-26": [[18200, 0], [45000, 0.16], [135000, 0.3], [190000, 0.37], [Infinity, 0.45]],
  "2026-27": [[18200, 0], [45000, 0.15], [135000, 0.3], [190000, 0.37], [Infinity, 0.45]],
  "2027-28": [[18200, 0], [45000, 0.14], [135000, 0.3], [190000, 0.37], [Infinity, 0.45]],
};
// ponytail: 2026-27+ Medicare thresholds not yet published; 2025-26 singles figures used until the ATO updates them.
const MEDICARE_LOW: Record<string, [number, number]> = { "2025-26": [28011, 35013] };

export function incomeTax(taxable: number, fy: string): number {
  const br = RATES[fy] ?? RATES["2026-27"];
  let tax = 0, lower = 0;
  for (const [upper, rate] of br) {
    if (taxable > lower) tax += (Math.min(taxable, upper) - lower) * rate;
    lower = upper;
  }
  return round2(tax);
}

export function medicareLevy(taxable: number, fy: string): number {
  const [low] = MEDICARE_LOW[fy] ?? MEDICARE_LOW["2025-26"];
  if (taxable <= low) return 0;
  return round2(Math.min(taxable * 0.02, (taxable - low) * 0.1)); // shade-in: 10c per $ over the lower threshold
}

/** Low income tax offset: $700, less 5c/$ from $37,500 to $45,000, then 1.5c/$ (nil at $66,667). */
export function lowIncomeOffset(taxable: number): number {
  if (taxable <= 37500) return 700;
  if (taxable <= 45000) return round2(700 - (taxable - 37500) * 0.05);
  return round2(Math.max(0, 325 - (taxable - 45000) * 0.015));
}

/** Small business income tax offset: 16% of the tax on net small business income, max $1,000. */
export function smallBusinessOffset(netSmallBusinessIncome: number, taxable: number, basicTax: number): number {
  if (netSmallBusinessIncome <= 0 || taxable <= 0) return 0;
  return round2(Math.min(1000, 0.16 * basicTax * Math.min(1, netSmallBusinessIncome / taxable)));
}

export type TaxInputs = { wages: number; taxWithheld: number; paygInstalments: number; otherIncome: number; otherDeductions: number };

/** Estimated income tax result. Positive `result` = refund, negative = amount to pay. */
export function estimateTax(fy: string, businessProfit: number, inp: TaxInputs) {
  // ponytail: a business loss is treated as nil here; under the non-commercial loss rules it usually can't
  // reduce other income and is deferred. Upgrade path: implement the four NCL tests.
  const businessCounted = Math.max(0, businessProfit);
  const taxable = Math.max(0, Math.floor(num(inp.wages) + num(inp.otherIncome) + businessCounted - num(inp.otherDeductions)));
  const basic = incomeTax(taxable, fy);
  const lito = Math.min(basic, lowIncomeOffset(taxable));
  const sbito = Math.min(Math.max(0, basic - lito), smallBusinessOffset(businessCounted, taxable, basic));
  const taxAfterOffsets = round2(Math.max(0, basic - lito - sbito));
  const medicare = medicareLevy(taxable, fy);
  const totalTax = round2(taxAfterOffsets + medicare);
  const credits = round2(num(inp.taxWithheld) + num(inp.paygInstalments));
  return {
    taxable, basic, lito, sbito, medicare, totalTax, credits, result: round2(credits - totalTax),
    lossDeferred: businessProfit < 0 ? round2(-businessProfit) : 0,
  };
}

// ---------- "set aside for tax" ----------
/** Tax on the next dollar earned: income tax bracket + Medicare levy (10% in the low-income shade-in band). */
export function marginalRate(taxable: number, fy: string): number {
  const br = RATES[fy] ?? RATES["2026-27"];
  const income = br.find(([upper]) => taxable <= upper)?.[1] ?? 0.45;
  const [low, high] = MEDICARE_LOW[fy] ?? MEDICARE_LOW["2025-26"];
  const medicare = taxable <= low ? 0 : taxable <= high ? 0.1 : 0.02;
  return round2(income + medicare);
}

/**
 * How much to put aside from a period's earnings: the GST you'll owe on them (GST on sales less GST credits
 * on platform fees and expenses) plus income tax at your projected marginal rate on the period's profit.
 * ponytail: marginal-rate estimate ignores offsets (LITO, small business offset), so it errs on setting aside a little more.
 */
export function setAside(p: { gstOnSales: number; gstCredits: number; profitExGst: number; projectedTaxable: number; fy: string }) {
  const gst = round2(Math.max(0, p.gstOnSales - p.gstCredits));
  const rate = marginalRate(p.projectedTaxable, p.fy);
  const tax = round2(Math.max(0, p.profitExGst) * rate);
  return { gst, tax, rate, total: round2(gst + tax) };
}
