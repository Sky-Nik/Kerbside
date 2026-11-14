// Recurring expenses: work out due dates and add any that have come due as normal expenses.
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "./tax.ts";

export type Frequency = "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly";
export const FREQUENCIES: [Frequency, string][] = [["weekly", "Weekly"], ["fortnightly", "Fortnightly"], ["monthly", "Monthly"], ["quarterly", "Quarterly"], ["yearly", "Yearly"]];

/** Same day of the month `n` months later, clamped to the month's last day (31 Jan + 1 month = 28/29 Feb). */
function addMonthsClamped(start: string, n: number): string {
  const y = +start.slice(0, 4), m = +start.slice(5, 7) - 1 + n, d = +start.slice(8, 10);
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d, last))).toISOString().slice(0, 10);
}

/** The k-th occurrence (k = 0 is the start date). Months are counted from the start so day-of-month never drifts. */
export function occurrence(start: string, freq: Frequency, k: number): string {
  if (freq === "weekly") return addDays(start, 7 * k);
  if (freq === "fortnightly") return addDays(start, 14 * k);
  return addMonthsClamped(start, k * (freq === "monthly" ? 1 : freq === "quarterly" ? 3 : 12));
}

/** Due dates after `after` (exclusive) up to and including `until`. */
export function dueDates(start: string, freq: Frequency, after: string | null, until: string, end?: string | null): string[] {
  const out: string[] = [];
  const stop = end && end < until ? end : until;
  for (let k = 0; k < 1000; k++) {
    const d = occurrence(start, freq, k);
    if (d > stop) break;
    if (!after || d > after) out.push(d);
  }
  return out;
}

export const nextDue = (start: string, freq: Frequency, today: string, end?: string | null) => {
  for (let k = 0; k < 1000; k++) {
    const d = occurrence(start, freq, k);
    if (end && d > end) return null;
    if (d >= today) return d;
  }
  return null;
};

/** Add every recurring expense that has come due (idempotent: a unique index stops duplicates). */
export async function generateRecurring(sb: SupabaseClient, today: string) {
  const { data } = await sb.from("recurring_expenses").select("*");
  for (const r of data ?? []) {
    const dates = dueDates(r.start_date, r.frequency, r.last_generated, today, r.end_date);
    if (!dates.length) continue;
    await sb.from("expenses").upsert(
      dates.map((date) => ({ date, description: r.description, amount: r.amount, category: r.category, recurring_id: r.id })),
      { onConflict: "recurring_id,date", ignoreDuplicates: true },
    );
    await sb.from("recurring_expenses").update({ last_generated: dates[dates.length - 1] }).eq("id", r.id);
  }
}
