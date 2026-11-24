// Which push notifications a driver gets today. Runs once a day from /api/cron/reminders (about 9am in Australia).
import type { Reminder } from "./reminders.ts";

export type PushMessage = { title: string; body: string; url: string; tag: string };

/** Driving activity for one driver (null = never). */
export type Signals = {
  openShiftHours: number | null; // hours since a shift was started and not ended
  daysSinceTrip: number | null; // days since the last logbook trip ended
  logbookWeeks: number | null; // weeks the 12-week logbook has run so far
  daysSinceFuel: number | null; // days since the last fuel expense
};
const NONE: Signals = { openShiftHours: null, daysSinceTrip: null, logbookWeeks: null, daysSinceFuel: null };

export function pushMessages(today: string, reminders: Reminder[], missingReceipts: number, sig: Signals = NONE): PushMessage[] {
  const out: PushMessage[] = [];
  if (sig.openShiftHours != null && sig.openShiftHours >= 8) {
    out.push({ title: "Your shift is still open", body: "Enter the end odometer so the trip counts in your logbook.", url: "/logbook", tag: "shift" });
  } else if (sig.logbookWeeks != null && sig.logbookWeeks < 12 && [2, 4, 7].includes(sig.daysSinceTrip ?? -1)) {
    out.push({ title: "Driving today?", body: `Log your start odometer before you head off. Your logbook is on week ${sig.logbookWeeks + 1} of 12 and has to stay continuous.`, url: "/logbook", tag: "trip" });
  }
  // ponytail: assumes about a fill-up a week; nudges on day 8 and 15 only, so it never nags daily.
  if (sig.daysSinceFuel === 8 || sig.daysSinceFuel === 15) {
    out.push({ title: "Filled up your tank lately?", body: "Snap the fuel receipt and add the odometer. It fills your logbook too.", url: "/expenses", tag: "fuel" });
  }
  const bas = reminders.find((r) => r.key === "bas");
  const daysToBas = bas?.due ? Math.round((Date.parse(bas.due) - Date.parse(today)) / 86400000) : -1;
  if (bas && (daysToBas === 7 || daysToBas === 0)) out.push({ title: bas.title, body: bas.detail, url: "/bas", tag: "bas" });

  if (new Date(`${today}T00:00:00Z`).getUTCDay() === 1) {
    const parts: string[] = [];
    const earnings = reminders.find((r) => r.key === "earnings");
    if (earnings) parts.push(earnings.detail);
    if (missingReceipts) parts.push(`${missingReceipts} expense${missingReceipts === 1 ? "" : "s"} over $82.50 still need${missingReceipts === 1 ? "s" : ""} a receipt.`);
    if (parts.length) out.push({ title: earnings ? earnings.title : "Receipts to snap", body: parts.join(" "), url: earnings ? "/income" : "/expenses", tag: "weekly" });
  }
  return out;
}
