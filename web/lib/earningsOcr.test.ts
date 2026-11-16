import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEarnings } from "./earningsOcr.ts";

test("Uber-style weekly breakdown", () => {
  const g = parseEarnings(`Earnings
Nov 9 - Nov 16
$943.20
Online 23 h 30 min
Fare $684.20
Promotions $42.50
Tips $31.80
Service fee -$184.70
Taxes $0.00`, "2026-11-17");
  assert.equal(g.platform, null); // no app name in the text: the form keeps the selected platform
  assert.equal(g.from, "2026-11-09");
  assert.equal(g.to, "2026-11-15");
  assert.equal(g.netFare, 684.2);
  assert.equal(g.promotions, 42.5);
  assert.equal(g.tips, 31.8);
  assert.equal(g.serviceFee, 184.7);
  assert.equal(g.hours, 23.5);
});

test("DiDi-style with day-month dates and a boost", () => {
  const g = parseEarnings(`DiDi Driver\nWeekly earnings 2 Nov - 8 Nov\nTrip earnings $412.80\nBoost $20.00\nTips $9.50`, "2026-11-17");
  assert.equal(g.platform, "DiDi");
  assert.deepEqual([g.from, g.to], ["2026-11-02", "2026-11-08"]);
  assert.deepEqual([g.netFare, g.promotions, g.tips], [412.8, 20, 9.5]);
});
