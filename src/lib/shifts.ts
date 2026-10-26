import { toISODate, type ISODate } from '@/tax/dates';

export type PlannedShift = { weekday: number; start_time: string; end_time: string }; // weekday 1 = Monday

export type Shift = { date: ISODate; start: Date; end: Date };

function at(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
}

// Planned shifts from `from` over the next `days` calendar days, skipping off-road days
// and shifts that have already ended. Sorted by start time.
export function upcomingShifts(plan: PlannedShift[], from: Date, days: number, offRoad: Set<ISODate>): Shift[] {
  const shifts: Shift[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const date = toISODate(day.getFullYear(), day.getMonth() + 1, day.getDate());
    if (offRoad.has(date)) continue;
    const weekday = day.getDay() || 7;
    for (const p of plan) {
      if (p.weekday !== weekday) continue;
      const shift = { date, start: at(day, p.start_time), end: at(day, p.end_time) };
      if (shift.end > from) shifts.push(shift);
    }
  }
  return shifts.sort((a, b) => a.start.getTime() - b.start.getTime());
}
