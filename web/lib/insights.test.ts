import { test } from "node:test";
import assert from "node:assert/strict";
import { insights } from "./insights.ts";

test("per-platform pay per hour after costs, best week and trend", () => {
  const E = (start_date: string, platform: string, net: number, hours: number, fee = 0) => ({ start_date, platform, lines: { "Net fare": net }, fees: { "Service fees": -fee }, hours, km: null });
  const r = insights([
    E("2026-10-05", "Uber", 600, 20, 160), E("2026-10-05", "DiDi", 300, 12),
    E("2026-10-12", "Uber", 700, 20), E("2026-10-19", "Uber", 500, 20), E("2026-10-26", "Uber", 500, 20),
    E("2026-11-02", "Uber", 800, 20), E("2026-11-09", "Uber", 800, 20), E("2026-11-16", "Uber", 800, 20), E("2026-11-23", "Uber", 800, 20),
  ], { deductible: 1520 });
  const uber = r.platforms.find((p) => p.platform === "Uber")!, didi = r.platforms.find((p) => p.platform === "DiDi")!;
  assert.equal(r.costPerHour, 8.84);             // $1,520 of costs over 172 h online (160 Uber + 12 DiDi)
  assert.equal(uber.perHour, 34.38);             // $5,500 over 160 h
  assert.equal(didi.perHourAfterCosts, 16.16);   // $25/h less $8.84/h of costs
  assert.equal(r.bestWeek!.total, 900);          // week of 5 Oct: 600 + 300
  assert.ok(r.trend! > 0);
});
