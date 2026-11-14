// Reminders shown on the dashboard and exported to the phone's calendar.
import { addDays, fyOf, mondayOf } from "./tax.ts";
import { nextDue, type Frequency } from "./recurring.ts";

export type Reminder = { key: string; title: string; detail: string; due?: string; href: string; tone: "warn" | "info" };

const BAS_DUE: [number, number, string][] = [[10, 28, "Q1 (Jul–Sep)"], [2, 28, "Q2 (Oct–Dec)"], [4, 28, "Q3 (Jan–Mar)"], [7, 28, "Q4 (Apr–Jun)"]];
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/** Every self-lodged BAS due date in a financial year: 28 Oct, 28 Feb, 28 Apr, 28 Jul. */
export function basDueDates(fy: string): { date: string; quarter: string }[] {
  const y = Number(fy.slice(0, 4));
  return BAS_DUE.map(([m, d, quarter]) => ({ date: `${m >= 10 ? y : y + 1}-${String(m).padStart(2, "0")}-${d}`, quarter }));
}

export function buildReminders(p: {
  today: string; platforms: string[];
  entries: { platform: string; start_date: string; end_date: string }[];
  trips: { date: string; end_date: string | null }[];
  recurring: { description: string; category: string; frequency: Frequency; start_date: string; end_date: string | null }[];
}): Reminder[] {
  const out: Reminder[] = [];
  const { today } = p;

  // Next BAS
  const due = [...basDueDates(fyOf(today)), ...basDueDates(fyOf(addDays(today, 200)))].find((b) => b.date >= today);
  if (due) {
    const n = days(today, due.date);
    out.push({ key: "bas", title: `${due.quarter} BAS due ${n === 0 ? "today" : `in ${n} day${n === 1 ? "" : "s"}`}`,
      detail: "Open the BAS report, copy G1, 1A and 1B into myGov, and lodge.", due: due.date, href: "/bas", tone: n <= 14 ? "warn" : "info" });
  }

  // Last full week (Mon–Sun) without earnings for a platform
  const lastMon = addDays(mondayOf(today), -7), lastSun = addDays(lastMon, 6);
  const missing = p.platforms.filter((pl) => !p.entries.some((e) => e.platform === pl && e.start_date <= lastSun && e.end_date >= lastMon));
  if (missing.length && missing.length === p.platforms.length) {
    out.push({ key: "earnings", title: "Log last week’s earnings", detail: `Nothing entered for ${lastMon.slice(8)}/${lastMon.slice(5, 7)} – ${lastSun.slice(8)}/${lastSun.slice(5, 7)} yet.`, href: "/income", tone: "warn" });
  }

  // Logbook: 12 continuous weeks
  const sorted = [...p.trips].sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) {
    out.push({ key: "logbook", title: "Start your 12-week logbook", detail: "Record odometer readings at the start and end of each shift.", href: "/logbook", tone: "info" });
  } else {
    const first = sorted[0].date, last = sorted.reduce((m, t) => ((t.end_date ?? t.date) > m ? (t.end_date ?? t.date) : m), first);
    const weeks = Math.floor((days(first, last) + 1) / 7);
    if (weeks < 12 && days(last, today) >= 7) {
      out.push({ key: "logbook", title: `Logbook: week ${Math.min(12, weeks + 1)} of 12`, detail: `Last odometer entry ${days(last, today)} days ago – keep it continuous.`, href: "/logbook", tone: "warn" });
    }
  }

  // Renewals in the next 30 days (yearly recurring rego / insurance and anything else yearly)
  for (const r of p.recurring.filter((x) => x.frequency === "yearly")) {
    const n = nextDue(r.start_date, r.frequency, today, r.end_date);
    if (n && days(today, n) <= 30) {
      out.push({ key: `renew-${r.description}`, title: `${r.description} renews ${n === today ? "today" : `in ${days(today, n)} days`}`,
        detail: "It’ll be added to your expenses on the day. Attach the receipt when it arrives.", due: n, href: "/expenses", tone: "info" });
    }
  }
  return out;
}

// ---------- .ics calendar ----------
const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
const ymd = (iso: string) => iso.replace(/-/g, "");

/** A calendar file with BAS due dates (two years), a weekly Monday prompt, and yearly renewals. */
export function calendarIcs(p: { today: string; recurring: { description: string; frequency: Frequency; start_date: string; end_date: string | null }[] }) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const ev: string[] = [];
  const allDay = (uid: string, date: string, title: string, desc: string, rrule?: string) => ev.push([
    "BEGIN:VEVENT", `UID:${uid}@kerbside`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${ymd(date)}`, `DTEND;VALUE=DATE:${ymd(addDays(date, 1))}`,
    `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(desc)}`, ...(rrule ? [rrule] : []),
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(title)}`, "TRIGGER:-P7D", "END:VALARM", "END:VEVENT",
  ].join("\r\n"));

  for (const fy of [fyOf(p.today), fyOf(addDays(p.today, 365))]) {
    for (const b of basDueDates(fy)) if (b.date >= p.today) allDay(`bas-${b.date}`, b.date, `BAS due – ${b.quarter}`, "Kerbside: open the BAS report and lodge in myGov.");
  }
  for (const r of p.recurring.filter((x) => x.frequency === "yearly" && (!x.end_date || x.end_date >= p.today))) {
    const n = nextDue(r.start_date, r.frequency, p.today, r.end_date);
    if (n) allDay(`renew-${r.description}-${n}`, n, `${r.description} renews`, "Kerbside recurring expense.", "RRULE:FREQ=YEARLY");
  }
  // Weekly prompt, Mondays 9am local time
  const mon = addDays(mondayOf(p.today), 7);
  ev.push([
    "BEGIN:VEVENT", "UID:weekly-earnings@kerbside", `DTSTAMP:${stamp}`, `DTSTART:${ymd(mon)}T090000`, `DTEND:${ymd(mon)}T091500`,
    "RRULE:FREQ=WEEKLY;BYDAY=MO", "SUMMARY:Log last week’s earnings in Kerbside",
    "DESCRIPTION:Copy last week’s totals from the Uber / DiDi / delivery apps.", "END:VEVENT",
  ].join("\r\n"));
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kerbside//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Kerbside", ...ev, "END:VCALENDAR", ""].join("\r\n");
}
