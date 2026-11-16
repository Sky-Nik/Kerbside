// Insights from weekly income entries: what each platform really pays, best weeks and months, and pay after costs.
// ponytail: entries are weekly totals, so "best day / hour of day" isn't knowable here; that needs per-trip data.
import { mondayOf } from "./tax.ts";

export type Entry = { start_date: string; platform: string; lines: Record<string, unknown>; fees: Record<string, unknown>; hours: number | null; km: number | null };
const n = (v: unknown) => Number(v) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;
const sum = (o: Record<string, unknown>) => Object.values(o ?? {}).reduce<number>((t, v) => t + n(v), 0);

export function insights(entries: Entry[], costs: { deductible: number }) {
  const byPlatform = new Map<string, { earned: number; fees: number; hours: number; earnedWithHours: number; km: number; earnedWithKm: number; weeks: number }>();
  const weeks = new Map<string, number>(), months = new Map<string, number>();
  let hoursAll = 0;
  for (const e of entries) {
    const earned = sum(e.lines), fees = Math.abs(sum(e.fees));
    const p = byPlatform.get(e.platform) ?? { earned: 0, fees: 0, hours: 0, earnedWithHours: 0, km: 0, earnedWithKm: 0, weeks: 0 };
    p.earned += earned; p.fees += fees; p.weeks += 1;
    if (n(e.hours) > 0) { p.hours += n(e.hours); p.earnedWithHours += earned; hoursAll += n(e.hours); }
    if (n(e.km) > 0) { p.km += n(e.km); p.earnedWithKm += earned; }
    byPlatform.set(e.platform, p);
    const wk = mondayOf(e.start_date); weeks.set(wk, (weeks.get(wk) ?? 0) + earned);
    const mo = e.start_date.slice(0, 7); months.set(mo, (months.get(mo) ?? 0) + earned);
  }
  const costPerHour = hoursAll > 0 ? costs.deductible / hoursAll : null;
  const platforms = [...byPlatform.entries()].map(([platform, p]) => {
    const perHour = p.hours > 0 ? p.earnedWithHours / p.hours : null;
    return {
      platform, earned: r2(p.earned), weeks: p.weeks, hours: r2(p.hours),
      perHour: perHour != null ? r2(perHour) : null,
      perHourAfterCosts: perHour != null && costPerHour != null ? r2(perHour - costPerHour) : null,
      perKm: p.km > 0 ? r2(p.earnedWithKm / p.km) : null,
      feeShare: p.earned + p.fees > 0 ? p.fees / (p.earned + p.fees) : 0,
    };
  }).sort((a, b) => (b.perHourAfterCosts ?? b.perHour ?? -1) - (a.perHourAfterCosts ?? a.perHour ?? -1) || b.earned - a.earned);
  const weekList = [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([start, total]) => ({ start, total: r2(total) }));
  const best = weekList.reduce<{ start: string; total: number } | null>((m, w) => (!m || w.total > m.total ? w : m), null);
  const avg = weekList.length ? r2(weekList.reduce((t, w) => t + w.total, 0) / weekList.length) : 0;
  const last4 = weekList.slice(-4), prev4 = weekList.slice(-8, -4);
  const trend = last4.length === 4 && prev4.length === 4 ? (last4.reduce((t, w) => t + w.total, 0) - prev4.reduce((t, w) => t + w.total, 0)) / (prev4.reduce((t, w) => t + w.total, 0) || 1) : null;
  return {
    platforms, weeks: weekList, bestWeek: best, avgWeek: avg, trend,
    months: [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, total]) => ({ month, total: r2(total) })),
    costPerHour: costPerHour != null ? r2(costPerHour) : null, hours: r2(hoursAll),
  };
}
