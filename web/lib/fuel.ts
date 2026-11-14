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
