// Fixtures mimic the layout of real documents with made-up people and numbers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { entryGross, parseLodgedReturn, parseUberSummary } from "./parse.ts";

const RETURN = `CUSTOMER COPY ONLY
2025-26 tax return
ATO receipt number 11111 2222 3333
Tax file number 123 456 789
Name JANE CITIZEN
Date of birth 1 JANUARY 1990
Taxable income $20,100.00
Interest Gross amounts Your share
Gross interest $100.50
Payer – SOME EMPLOYER
ABN or WPN – 11111111111
Tax withheld – $500.00
Gross payments $6,000.00
Payments and grants reported in TPAR
Payer's name – PORTIER PACIFIC PTY LTD
Payer's ABN – 28622365459
Gross amount paid (including GST plus any tax withheld) – $15,000.00
Tax withheld – $0.00
Non-primary production total business income $15,060.00
Motor vehicle expenses -$1,000.00
Motor vehicle expense type – S: Cents per kilometre method
All other expenses – manually calculated -$60.00
Non-primary production total expenses $1,060.00
Total non-primary production net income or loss from business $14,000.00`;

test("lodged return: tax figures only, no personal identifiers", () => {
  const r = parseLodgedReturn(RETURN)!;
  assert.equal(r.fy, "2025-26");
  assert.equal(r.taxable, 20100);
  assert.equal(r.wages, 6000);
  assert.equal(r.taxWithheld, 500);
  assert.equal(r.interest, 100.5);
  assert.equal(r.businessIncome, 15060);
  assert.equal(r.businessExpenses, 1060);
  assert.equal(r.netBusiness, 14000);
  assert.equal(r.motorVehicle, 1000);
  assert.equal(r.motorVehicleMethod, "Cents per kilometre");
  assert.deepEqual(r.payers.map((p) => p.name), ["SOME EMPLOYER", "PORTIER PACIFIC PTY LTD"]);
  const json = JSON.stringify(r);
  assert.ok(!json.includes("123 456 789") && !json.includes("1990") && !json.includes("JANE"), "no TFN / DOB / name");
});

const SUMMARY = (period: string) => `Uber JANE CITIZEN Australian Business Number (ABN): 11111111111
${period} Tax summary
Transportation Income A$1,100.00 Delivery Income A$500.00 Other Payments A$60.00 Total Payments A$1,660.00
How your earnings were calculated
Transportation Income
Gross transportation fare* A$1,000.00
Tolls Reimbursement A$40.00
Airport fee A$60.00
Total Transportation Income A$1,100.00
Delivery Income
Delivery Fee A$400.00
Delivery Incentives A$95.00
Tolls Reimbursement A$5.00
Total Delivery Income A$500.00
Other Payments
Miscellaneous A$10.00
Referral / Incentives A$20.00
Tips A$30.00
Total Other Payments A$60.00
Potential Tax Deductions
Deductions
Uber service fee (transportation leads)* A$250.00
Other charges from Uber A$12.00
Charges from 3rd parties (tolls/airports/government) A$105.00
Total Potential Tax Deductions A$367.00
Portier Pacific Pty Ltd Tax summary - ${period}`;

test("uber monthly summary splits rides and Eats; gross matches total payments", () => {
  const s = parseUberSummary(SUMMARY("October 2026"))!;
  assert.deepEqual(s.period, { label: "October 2026", start: "2026-10-01", end: "2026-10-31", annual: false });
  const [rides, eats] = s.entries;
  assert.equal(rides.platform, "Uber");
  assert.equal(rides.fees["Service fees"], 367); // 250 service fee + 12 + 105 other charges
  assert.equal(rides.lines["Net fare"], 1100 - 367);
  assert.equal(rides.lines.Promotions, 30);
  assert.equal(rides.lines.Tips, 30);
  assert.equal(eats.platform, "Uber Eats");
  assert.equal(eats.lines["Net fare"], 405);
  assert.equal(eats.lines.Promotions, 95);
  assert.equal(entryGross(rides) + entryGross(eats), s.totalPayments);
});

test("uber annual summary is recognised as a financial year", () => {
  const s = parseUberSummary(SUMMARY("FY 2025/2026"))!;
  assert.equal(s.period.annual, true);
  assert.equal(s.period.start, "2025-07-01");
});

test("non-matching text is rejected", () => {
  assert.equal(parseLodgedReturn("hello"), null);
  assert.equal(parseUberSummary("hello"), null);
});
