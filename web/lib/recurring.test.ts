import { test } from "node:test";
import assert from "node:assert/strict";
import { dueDates, nextDue, occurrence } from "./recurring.ts";

test("monthly keeps the day of month and clamps short months", () => {
  assert.equal(occurrence("2026-01-31", "monthly", 1), "2026-02-28");
  assert.equal(occurrence("2026-01-31", "monthly", 2), "2026-03-31"); // no drift after February
  assert.equal(occurrence("2026-07-15", "quarterly", 1), "2026-10-15");
  assert.equal(occurrence("2026-07-15", "yearly", 1), "2027-07-15");
  assert.equal(occurrence("2026-11-02", "fortnightly", 2), "2026-11-30");
});

test("due dates since last generated, up to today, respecting the end date", () => {
  assert.deepEqual(dueDates("2026-08-10", "monthly", null, "2026-11-15"), ["2026-08-10", "2026-09-10", "2026-10-10", "2026-11-10"]);
  assert.deepEqual(dueDates("2026-08-10", "monthly", "2026-10-10", "2026-11-15"), ["2026-11-10"]);
  assert.deepEqual(dueDates("2026-08-10", "monthly", null, "2026-11-15", "2026-09-30"), ["2026-08-10", "2026-09-10"]);
  assert.equal(nextDue("2026-08-10", "monthly", "2026-11-15"), "2026-12-10");
});
