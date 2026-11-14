import { test } from "node:test";
import assert from "node:assert/strict";
import { basDueDates, buildReminders, calendarIcs } from "./reminders.ts";

test("BAS due dates for a financial year", () => {
  assert.deepEqual(basDueDates("2026-27").map((b) => b.date), ["2026-10-28", "2027-02-28", "2027-04-28", "2027-07-28"]);
});

test("reminders: next BAS, missing week, logbook and renewals", () => {
  const r = buildReminders({
    today: "2026-11-15", platforms: ["Uber"],
    entries: [{ platform: "Uber", start_date: "2026-10-26", end_date: "2026-11-01" }], // not last week (2–8 Nov)
    trips: [{ date: "2026-10-27", end_date: "2026-11-02" }],
    recurring: [{ description: "Rego", category: "Car - Registration", frequency: "yearly", start_date: "2025-12-01", end_date: null }],
  });
  const keys = r.map((x) => x.key);
  assert.ok(r.find((x) => x.key === "bas")!.title.startsWith("Q2 (Oct–Dec) BAS due in 105 days"));
  assert.ok(keys.includes("earnings"));
  assert.ok(r.find((x) => x.key === "logbook")!.title.includes("week 2 of 12"));
  assert.ok(r.find((x) => x.key === "renew-Rego")!.title.includes("in 16 days"));
});

test("calendar file is valid-looking iCalendar", () => {
  const ics = calendarIcs({ today: "2026-11-15", recurring: [] });
  assert.ok(ics.startsWith("BEGIN:VCALENDAR"));
  assert.ok(ics.includes("DTSTART;VALUE=DATE:20270228"));
  assert.ok(ics.includes("RRULE:FREQ=WEEKLY;BYDAY=MO"));
  assert.ok(ics.trimEnd().endsWith("END:VCALENDAR"));
});
