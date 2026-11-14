// Run: npm test   (node's built-in test runner; same scenario was verified in the Excel workbook)
import { test } from "node:test";
import assert from "node:assert/strict";
import { carPurchaseGst, daysOwned, estimateTax, marginalRate, setAside, incomeTax, lowIncomeOffset, medicareLevy, overlappingIds, round2, fyOf, logbook, mondayOf, monthsOf, quarterOf, summarise, type YearSettings } from "./tax.ts";

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

test("days owned: bought mid-year, sold mid-year, full year", () => {
  assert.equal(daysOwned("2026-27", "2026-10-15"), 259); // 15 Oct 2026 – 30 Jun 2027
  assert.equal(daysOwned("2026-27"), 365);
  assert.equal(daysOwned("2026-27", null, "2026-07-31"), 31);
  assert.equal(daysOwned("2026-27", "2026-10-15", "2026-10-14"), 0);
});

test("overlapping income ranges are flagged per platform", () => {
  const ids = overlappingIds([
    { id: "a", platform: "Uber", start_date: "2026-11-02", end_date: "2026-11-08" },
    { id: "b", platform: "Uber", start_date: "2026-11-08", end_date: "2026-11-14" }, // shares the 8th
    { id: "c", platform: "Uber", start_date: "2026-11-15", end_date: "2026-11-21" },
    { id: "d", platform: "DiDi", start_date: "2026-11-02", end_date: "2026-11-08" },
  ]);
  assert.deepEqual([...ids].sort(), ["a", "b"]);
});

test("ATO P8 labels add up to totals; service fee lifts G1 and 1B but not net GST", () => {
  const data = {
    incomeEntries: [{ start_date: "2026-11-02", platform: "Uber", lines: { "Net fare": 880 }, fees: { "Service fees": 220 } }],
    otherIncome: [], trips: [], carTx: [],
    expenses: [
      { date: "2026-11-03", amount: 110, category: "Car - Fuel" },
      { date: "2026-11-04", amount: 220, category: "Car - Rent, hire & lease payments" },
      { date: "2026-11-05", amount: 55, category: "Parking" },
    ],
  };
  const s = summarise({ ...year, loan_interest: 1000, opening_value: 20000 }, data);
  const p = s.p8;
  assert.equal(s.bas[1].G1, 1100); // full fare = net 880 + fee 220 (ATO: GST on the full fare)
  assert.equal(s.bas[1]["1A"], 100);
  assert.equal(p.F, 200); // service fee ex GST
  assert.equal(p.J, 160); // car lease 220 × 80% ex GST
  assert.equal(p.N, 80); // fuel only; lease/depreciation/interest have their own labels
  assert.equal(p.nType, "B");
  assert.equal(round2(p.F + p.J + p.M + p.N + p.P + p.Q), p.T);
  assert.equal(p.T, s.tax.totalExpenses);
  assert.equal(p.Z, s.tax.profit);
  const net = summarise(year, { ...data, incomeEntries: [{ ...data.incomeEntries[0], fees: {} }] });
  assert.equal(net.bas[1].G1, 880); // net fare only understates G1 ...
  assert.equal(net.bas[1].net, s.bas[1].net); // ... but GST payable is the same
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

test("income tax estimate uses ATO 2026-27 rates, offsets and Medicare levy", () => {
  assert.equal(incomeTax(18200, "2026-27"), 0);
  assert.equal(incomeTax(60000, "2026-27"), 8520); // 26,800 × 15% + 15,000 × 30%
  assert.equal(incomeTax(60000, "2025-26"), 8788); // 16% bracket
  assert.equal(lowIncomeOffset(37500), 700);
  assert.equal(lowIncomeOffset(45000), 325);
  assert.equal(lowIncomeOffset(60000), 100);
  assert.equal(lowIncomeOffset(70000), 0);
  assert.equal(medicareLevy(28000, "2026-27"), 0);
  assert.equal(medicareLevy(30000, "2026-27"), 198.9); // shading-in: 10% over $28,011
  assert.equal(medicareLevy(60000, "2026-27"), 1200);
  // wages 50k with 6k withheld, business profit 10k
  const e = estimateTax("2026-27", 10000, { wages: 50000, taxWithheld: 6000, paygInstalments: 0, otherIncome: 0, otherDeductions: 0 });
  assert.equal(e.taxable, 60000);
  assert.equal(e.lito, 100);
  assert.equal(e.sbito, round2(0.16 * 8520 * (10000 / 60000))); // 227.2
  assert.equal(e.totalTax, round2(8520 - 100 - 227.2 + 1200));
  assert.equal(e.result, round2(6000 - e.totalTax)); // negative = to pay
  // a business loss doesn't reduce wages (deferred)
  const l = estimateTax("2026-27", -3000, { wages: 40000, taxWithheld: 0, paygInstalments: 0, otherIncome: 0, otherDeductions: 0 });
  assert.equal(l.taxable, 40000);
  assert.equal(l.lossDeferred, 3000);
});

test("set aside: GST owed plus tax at the projected marginal rate", () => {
  assert.equal(marginalRate(20000, "2026-27"), 0.15); // below the Medicare levy threshold
  assert.equal(marginalRate(30000, "2026-27"), 0.25); // 15% + 10% Medicare shade-in
  assert.equal(marginalRate(60000, "2026-27"), 0.32); // 30% + 2%
  assert.equal(marginalRate(10000, "2026-27"), 0);
  const s = setAside({ gstOnSales: 100, gstCredits: 20, profitExGst: 800, projectedTaxable: 60000, fy: "2026-27" });
  assert.deepEqual(s, { gst: 80, tax: 256, rate: 0.32, total: 336 });
});

test("instant asset write-off: car under $20,000 first used this year", () => {
  const empty = { incomeEntries: [], otherIncome: [], expenses: [], trips: [], carTx: [] } as unknown as Parameters<typeof summarise>[1];
  const cheap = summarise({ ...year, gst_registered: false, car_cost: 18000, opening_value: 18000, car_start_date: "2026-10-01", days_owned: 273 }, empty);
  assert.equal(cheap.tax.dep.writeOff, true);
  assert.equal(cheap.tax.dep.depFull, 18000);
  const dear = summarise({ ...year, gst_registered: false, car_cost: 28000, opening_value: 28000, car_start_date: "2026-10-01", days_owned: 273 }, empty);
  assert.equal(dear.tax.dep.writeOff, false);
  const oldCar = summarise({ ...year, gst_registered: false, car_cost: 18000, opening_value: 12000, car_start_date: "2025-10-01" }, empty);
  assert.equal(oldCar.tax.dep.writeOff, false);
});
