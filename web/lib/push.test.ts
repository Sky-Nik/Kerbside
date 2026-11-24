import { test } from "node:test";
import assert from "node:assert/strict";
import { pushMessages, type Signals } from "./push.ts";
import type { Reminder } from "./reminders.ts";

const bas = (due: string): Reminder => ({ key: "bas", title: "Q2 BAS due", detail: "Lodge it.", due, href: "/bas", tone: "warn" });
const earnings: Reminder = { key: "earnings", title: "Log last week’s earnings", detail: "Nothing entered yet.", href: "/income", tone: "warn" };

test("BAS: a week before and on the day only", () => {
  assert.equal(pushMessages("2027-02-21", [bas("2027-02-28")], 0)[0].tag, "bas");
  assert.equal(pushMessages("2027-02-28", [bas("2027-02-28")], 0)[0].tag, "bas");
  assert.equal(pushMessages("2027-02-20", [bas("2027-02-28")], 0).length, 0);
});

test("Monday nudge combines earnings and receipts; nothing on other days", () => {
  const [m] = pushMessages("2026-11-23", [earnings], 2); // a Monday
  assert.equal(m.url, "/income");
  assert.match(m.body, /2 expenses over \$82\.50 still need a receipt/);
  assert.equal(pushMessages("2026-11-23", [], 1)[0].title, "Receipts to snap");
  assert.equal(pushMessages("2026-11-23", [], 0).length, 0);
  assert.equal(pushMessages("2026-11-24", [earnings], 3).length, 0);
});

test("driving nudges: open shift, logbook gaps, fuel receipts", () => {
  const sig: Signals = { openShiftHours: null, daysSinceTrip: null, logbookWeeks: null, daysSinceFuel: null };
  const tags = (s: Partial<Signals>) => pushMessages("2026-11-24", [], 0, { ...sig, ...s }).map((m) => m.tag);
  assert.deepEqual(tags({ openShiftHours: 14 }), ["shift"]);
  assert.deepEqual(tags({ openShiftHours: 3 }), []);
  assert.deepEqual(tags({ logbookWeeks: 5, daysSinceTrip: 2 }), ["trip"]);
  assert.deepEqual(tags({ logbookWeeks: 5, daysSinceTrip: 3 }), []);
  assert.deepEqual(tags({ logbookWeeks: 12, daysSinceTrip: 2 }), []); // logbook done
  assert.deepEqual(tags({ openShiftHours: 20, logbookWeeks: 5, daysSinceTrip: 2 }), ["shift"]); // one driving nudge at a time
  assert.deepEqual(tags({ daysSinceFuel: 8 }), ["fuel"]);
  assert.deepEqual(tags({ daysSinceFuel: 9 }), []);
});
