import { test } from "node:test";
import assert from "node:assert/strict";
import { fuelStats } from "./fuel.ts";

test("fuel economy between fills", () => {
  const r = fuelStats([
    { id: "b", date: "2026-11-08", odometer: 10600, litres: 42, cost: 84 },
    { id: "a", date: "2026-11-01", odometer: 10000, litres: 40, cost: 80 },
  ]);
  assert.equal(r.km, 600);
  assert.equal(r.per100!.toFixed(2), "7.00");
  assert.equal(r.perKm, 0.14);
  assert.equal(r.rows[0].id, "b");
  assert.equal(r.rows[1].per100, null);
});

test("unloggedGaps: only gaps that touch a fill-up", async () => {
  const { unloggedGaps } = await import("./fuel.ts");
  const trips = [
    { date: "2026-11-02", odo_start: 1000, odo_end: 1100 },
    { date: "2026-11-03", odo_start: 1150, odo_end: 1200 }, // 1100→1150 between trips: not reported
  ];
  const fills = [
    { date: "2026-11-05", odometer: 1260 }, // 1200→1260 unlogged
    { date: "2026-11-01", odometer: 1050 }, // inside a trip: covered
    { date: "2026-11-09", odometer: 1400 }, // 1260→1400 unlogged
  ];
  assert.deepEqual(unloggedGaps(trips, fills), [
    { from: 1200, to: 1260, fromDate: "2026-11-03", toDate: "2026-11-05" },
    { from: 1260, to: 1400, fromDate: "2026-11-05", toDate: "2026-11-09" },
  ]);
  assert.deepEqual(unloggedGaps(trips, []), []);
});
