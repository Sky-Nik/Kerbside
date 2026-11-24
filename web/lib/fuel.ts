// Fuel economy between fill-ups (assumes each fill tops the tank up, the usual "fill to full" method).
export type Fill = { id: string; date: string; odometer: number; litres: number; cost: number };

export function fuelStats(fills: Fill[]) {
  const s = [...fills].sort((a, b) => a.odometer - b.odometer);
  const rows = s.map((f, i) => {
    const km = i ? f.odometer - s[i - 1].odometer : 0;
    return { ...f, km, per100: km > 0 ? (f.litres / km) * 100 : null, perKm: km > 0 ? f.cost / km : null, perL: f.cost / f.litres };
  });
  const later = rows.slice(1).filter((r) => r.km > 0);
  const km = later.reduce((t, r) => t + r.km, 0), litres = later.reduce((t, r) => t + r.litres, 0), cost = later.reduce((t, r) => t + r.cost, 0);
  return { rows: rows.reverse(), km, per100: km ? (litres / km) * 100 : null, perKm: km ? cost / km : null };
}

export type Gap = { from: number; to: number; fromDate: string; toDate: string };

/**
 * Driving no trip covers, found from fuel fill-up odometer readings: km between a fill-up and the
 * nearest logged reading either side. The driver marks each one business or personal.
 * Gaps between two trips (no fill-up involved) are left alone: they already count as personal.
 */
export function unloggedGaps(trips: { date: string; end_date?: string | null; odo_start: number; odo_end: number }[], fills: { date: string; odometer: number }[]): Gap[] {
  const pts = [
    ...trips.map((t) => ({ lo: t.odo_start, hi: t.odo_end, start: t.date, end: t.end_date ?? t.date, fuel: false })),
    ...fills.map((f) => ({ lo: f.odometer, hi: f.odometer, start: f.date, end: f.date, fuel: true })),
  ].sort((a, b) => a.lo - b.lo || a.hi - b.hi);
  const out: Gap[] = [];
  let cur = pts[0];
  for (const p of pts.slice(1)) {
    if (p.lo > cur.hi && (p.fuel || cur.fuel)) out.push({ from: cur.hi, to: p.lo, fromDate: cur.end, toDate: p.start });
    if (p.hi >= cur.hi) cur = p;
  }
  return out;
}
