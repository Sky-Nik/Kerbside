import { test } from "node:test";
import assert from "node:assert/strict";
import { bucketOf, series, shift } from "./periods.ts";

test("week, month and financial-year buckets", () => {
  const w = bucketOf("week", "2026-11-15"); // a Sunday
  assert.deepEqual([w.start, w.end], ["2026-11-09", "2026-11-15"]);
  assert.equal(shift("week", w, -1).start, "2026-11-02");
  const m = bucketOf("month", "2026-02-14");
  assert.deepEqual([m.start, m.end, m.label], ["2026-02-01", "2026-02-28", "Feb 2026"]);
  assert.equal(shift("month", bucketOf("month", "2027-01-05"), -1).start, "2026-12-01");
  const y = bucketOf("year", "2026-03-01");
  assert.deepEqual([y.key, y.start, y.end], ["2025-26", "2025-07-01", "2026-06-30"]);
  assert.equal(shift("year", y, 1).key, "2026-27");
  assert.deepEqual(series("month", bucketOf("month", "2026-11-01"), 3).map((b) => b.short), ["Sep", "Oct", "Nov"]);
});
