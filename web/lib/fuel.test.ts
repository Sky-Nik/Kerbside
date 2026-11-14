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
