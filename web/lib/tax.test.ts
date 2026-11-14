// Run: npm test   (node's built-in test runner; same scenario was verified in the Excel workbook)
import { test } from "node:test";
import assert from "node:assert/strict";
import { carPurchaseGst, fyOf, logbook, mondayOf, monthsOf, quarterOf, summarise, type YearSettings } from "./tax.ts";

const year: YearSettings = {
  fy: "2026-27", gst_registered: true, car_method: "logbook",
  pct: { car: [0.8, 0.8, 0.8, 0.8], phone: [0.5, 0.5, 0.5, 0.5], internet: [0, 0, 0, 0], music: [0, 0, 0, 0], computer: [0, 0, 0, 0] },
  car_limit: 69674, cpk_rate: 0.88, gov_payments: 0, other_business_income: 0, car_cost: 0, opening_value: 0,
  days_owned: 365, effective_life: 8, loan_interest: 0,
};

test("dates: FY, quarter and months", () => {
  assert.equal(fyOf("2026-07-01"), "2026-27");
  assert.equal(fyOf("2027-06-30"), "2026-27");
  assert.equal(quarterOf("2026-09-30"), 0);
  assert.equal(quarterOf("2026-10-01"), 1);
  assert.equal(quarterOf("2027-01-15"), 2);
  assert.equal(quarterOf("2027-06-30"), 3);
  assert.deepEqual(monthsOf("2026-27", 2), ["2027-01-01", "2027-02-01", "2027-03-01"]);
});

test("BAS + profit match the spreadsheet scenario", () => {
  const s = summarise(year, {
    incomeEntries: [{ start_date: "2026-07-01", platform: "Uber", lines: { "Gross fares": 1100, "Split fare fee": 11 },
      fees: { "Service fees": 275 } }],
    otherIncome: [],
    expenses: [
      { date: "2026-07-05", amount: 110, category: "Car - Fuel" },
      { date: "2026-07-06", amount: 50, category: "Mobile phone - mixed use" },
      { date: "2026-07-07", amount: 100, category: "Car - Registration" },
    ],
    trips: [],
    carTx: [{ date: "2026-08-01", kind: "purchase", seller: "dealer", amount: 80000, gst: 7272.73, business_pct: 0.8 }],
  });
  const q1 = s.bas[0];
  assert.equal(q1.G1, 1111);
  assert.equal(q1["1A"], 101);
  assert.equal(q1.G10, 80000);
  assert.equal(q1.G11, 535); // service fee 275 + receipts 260 (no pass-through fees any more)
  assert.equal(q1["1B"], 25 + 8 + 2.27 + 5067.2); // fee + fuel + phone + car (capped at 6334 × 80%)
  assert.equal(s.tax.feesTotal, 250);
  assert.equal(s.tax.otherTotal, 22.73);
  assert.equal(s.tax.carClaim, 160); // fuel 80 + rego 80
  assert.equal(s.tax.profit, 1010 - 250 - 22.73 - 160);
});

test("pass-through fee override replaces derived amount", () => {
  const s = summarise(year, {
    incomeEntries: [{ start_date: "2026-07-01", platform: "Uber", lines: { "Toll reimbursement": 22 }, fees: { Tolls: 11 } }],
    otherIncome: [], expenses: [], trips: [], carTx: [],
  });
  assert.equal(s.bas[0].G11, 11);
});

test("weekly entries: net fare + promotions + tips, week counted by its Monday", () => {
  assert.equal(mondayOf("2026-10-01"), "2026-09-28"); // Thu -> Mon in previous quarter
  assert.equal(mondayOf("2026-11-16"), "2026-11-16");
  const s = summarise(year, {
    incomeEntries: [
      { start_date: "2026-09-28", platform: "Uber", lines: { "Net fare": 880, Promotions: 110, Tips: 11 }, fees: {} },
      { start_date: "2026-10-05", platform: "DiDi", lines: { "Net fare": 220 }, fees: {} },
    ],
    otherIncome: [], expenses: [], trips: [], carTx: [],
  });
  assert.equal(s.bas[0].G1, 1001);
  assert.equal(s.bas[0]["1A"], 91);
  assert.equal(s.bas[1].G1, 220);
  assert.equal(s.tax.feesTotal, 0);
});

test("car purchase GST rules", () => {
  assert.equal(carPurchaseGst("private_no_gst", 5000, 69674, 1), 0);
  assert.equal(carPurchaseGst("dealer", 2000, 69674, 0.5), 1000);
});

test("logbook: gaps count as private", () => {
  const lb = logbook([
    { odo_start: 1000, odo_end: 1100, purpose: "rideshare" },
    { odo_start: 1150, odo_end: 1200, purpose: "private" },
  ]);
  assert.equal(lb.total, 200);
  assert.equal(lb.businessPct, 0.5);
});

test("cents per km is capped at 5,000 km", () => {
  const s = summarise({ ...year, car_method: "cpk", odo_year_start: 10000, odo_year_end: 30000 }, {
    incomeEntries: [], otherIncome: [], expenses: [], carTx: [],
    trips: [{ odo_start: 10000, odo_end: 10100, purpose: "rideshare" }],
  });
  assert.equal(s.tax.cpkKm, 5000);
  assert.equal(s.tax.carClaim, 4400);
});
