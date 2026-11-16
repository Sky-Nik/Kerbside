// Week / month / financial-year buckets for the dashboard earnings view. Dates are ISO yyyy-mm-dd.
import { addDays, fyOf, fyRange, mondayOf } from "./tax.ts";

export type View = "week" | "month" | "year";
export type Bucket = { key: string; label: string; short: string; start: string; end: string };

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const d = (iso: string) => `${Number(iso.slice(8, 10))} ${MON[Number(iso.slice(5, 7)) - 1]}`;
const monthEnd = (iso: string) => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7), 0)).toISOString().slice(0, 10);
const addMonths = (iso: string, n: number) => {
  const dt = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1 + n, 1));
  return dt.toISOString().slice(0, 10);
};

/** The bucket containing `at`. */
export function bucketOf(view: View, at: string): Bucket {
  if (view === "week") {
    const start = mondayOf(at), end = addDays(start, 6);
    return { key: start, label: `${d(start)} – ${d(end)} ${end.slice(0, 4)}`, short: d(start), start, end };
  }
  if (view === "month") {
    const start = `${at.slice(0, 7)}-01`;
    return { key: start, label: `${MON[+at.slice(5, 7) - 1]} ${at.slice(0, 4)}`, short: MON[+at.slice(5, 7) - 1], start, end: monthEnd(start) };
  }
  const fy = fyOf(at), { start, end } = fyRange(fy);
  return { key: fy, label: `FY ${fy}`, short: fy, start, end };
}

/** Step to the previous (-1) or next (+1) bucket. */
export function shift(view: View, b: Bucket, n: number): Bucket {
  if (view === "week") return bucketOf(view, addDays(b.start, 7 * n));
  if (view === "month") return bucketOf(view, addMonths(b.start, n));
  return bucketOf(view, `${Number(b.start.slice(0, 4)) + n}-07-01`);
}

/** `count` consecutive buckets ending at `last`. */
export function series(view: View, last: Bucket, count: number): Bucket[] {
  return Array.from({ length: count }, (_, i) => shift(view, last, i - count + 1));
}

export const inBucket = (b: Bucket, iso: string) => iso >= b.start && iso <= b.end;

/** Week to open the dashboard on: this week once it has entries, otherwise last week (so Monday isn't a blank $0). */
export function defaultWeekAt(today: string, entryStarts: string[]): string {
  const { start, end } = bucketOf("week", today);
  return entryStarts.some((d) => d >= start && d <= end) ? today : addDays(today, -7);
}
