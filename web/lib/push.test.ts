import { test } from "node:test";
import assert from "node:assert/strict";
import { pushMessages } from "./push.ts";
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
