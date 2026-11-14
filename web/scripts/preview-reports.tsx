// Dev tool: render both PDF reports from sample data (no login needed).
// Run: npm run preview-reports  -> writes .report-preview/*.pdf
import { mkdirSync, writeFileSync } from "node:fs";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement as h } from "react";
import { expenseCalc, platformMonth, quarterOf, summarise, type YearSettings } from "../lib/tax";
import { BasReport } from "../lib/report/bas";
import { TaxReport } from "../lib/report/tax";
import type { ReportData } from "../lib/report/data";

const fy = "2026-27";
const z = [0, 0, 0, 0];
const base: YearSettings = { fy, gst_registered: true, car_method: "logbook", pct: { car: z, phone: z, internet: z, music: z, computer: z },
  car_limit: 69674, cpk_rate: 0.91, gov_payments: 0, other_business_income: 0, car_cost: 0, opening_value: 0, days_owned: 365,
  effective_life: 8, loan_interest: 0 };
const year = { ...base, car_limit: 69674, car_start_date: "2026-10-23", odo_year_start: 423, vehicle: "Chery Tiggo 4 Ultimate",
  pct: { ...base.pct, car: [0, 0.8, 0.8, 0.8], phone: [0, 0.5, 0.5, 0.5] }, car_cost: 28000, opening_value: 25963.64,
  days_owned: 250, loan_interest: 1200, wages: 42000, tax_withheld: 4200 };
const incomeRows = [
  { id: "1", start_date: "2026-11-02", end_date: "2026-11-08", platform: "Uber", lines: { "Net fare": 97.12, Tips: 3 }, fees: {} },
  { id: "2", start_date: "2026-11-02", end_date: "2026-11-08", platform: "DiDi", lines: { "Net fare": 153.6, Promotions: 51 }, fees: { "Service fees": 30.5 } },
  { id: "3", start_date: "2026-11-09", end_date: "2026-11-15", platform: "DiDi", lines: { "Net fare": 14.64 }, fees: {} },
  { id: "4", start_date: "2026-11-09", end_date: "2026-11-15", platform: "Uber", lines: { "Net fare": 855.56, Promotions: 78, Tips: 8 }, fees: { "Service fees": 210.4 } },
];
const expenseRows = [
  { id: "a", date: "2026-11-08", description: "BP", amount: 34.61, category: "Car - Fuel", receipt_path: null, receipt_name: null },
  { id: "b", date: "2026-11-11", description: "BP Glen Waverley", amount: 69.42, category: "Car - Fuel", receipt_path: "x", receipt_name: "r.jpg" },
  { id: "c", date: "2026-11-12", description: "Optus", amount: 55, category: "Mobile phone - mixed use", receipt_path: "x", receipt_name: "r.pdf" },
];
const trips = [
  { date: "2026-10-27", end_date: "2026-11-02", odo_start: 423, odo_end: 1487, purpose: "rideshare", description: null },
  { date: "2026-11-03", end_date: null, odo_start: 1487, odo_end: 1530, purpose: "private", description: "Groceries" },
];
const s = summarise(year, {
  incomeEntries: incomeRows, otherIncome: [], trips,
  expenses: expenseRows.map((e) => ({ date: e.date, amount: e.amount, category: e.category })),
  carTx: [{ date: "2026-10-23", kind: "purchase", seller: "dealer", amount: 28000, gst: 2545.45, business_pct: 0.8 }],
});
const r: ReportData = {
  fy, year, email: "driver@example.com", name: "Sample Driver", abn: "60450083021",
  income: incomeRows.map((e) => ({ ...e, q: quarterOf(e.start_date), calc: platformMonth(e.platform, e.lines, e.fees, true) })),
  expenses: expenseRows.map((e) => ({ ...e, q: quarterOf(e.date), calc: expenseCalc(e.amount, e.category, year.pct, quarterOf(e.date), true) })),
  trips, carTx: [], s, generated: "2026-11-14",
};
async function main() {
  mkdirSync(".report-preview", { recursive: true });
writeFileSync(".report-preview/bas-q2.pdf", await renderToBuffer(h(BasReport, { r, q: 1 }) as never));
writeFileSync(".report-preview/tax.pdf", await renderToBuffer(h(TaxReport, { r }) as never));
  console.log("wrote .report-preview/bas-q2.pdf and tax.pdf");
}
main();
