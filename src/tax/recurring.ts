import { daysInMonth, toISODate, type ISODate } from './dates';

export type Frequency = 'weekly' | 'monthly' | 'yearly';

export type Recurring = { startDate: ISODate; endDate: ISODate | null; frequency: Frequency };

// Nth occurrence. Monthly/yearly keep the start day, clamped to short months
// (31 Jan -> 28 Feb -> 31 Mar), so the schedule never drifts.
function occurrence(start: ISODate, frequency: Frequency, n: number): ISODate {
  const [y, m, d] = start.split('-').map(Number);
  if (frequency === 'weekly') {
    const t = new Date(Date.UTC(y, m - 1, d + 7 * n));
    return toISODate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }
  const months = (m - 1) + n * (frequency === 'monthly' ? 1 : 12);
  const year = y + Math.floor(months / 12);
  const month = (months % 12) + 1;
  return toISODate(year, month, Math.min(d, daysInMonth(year, month)));
}

// Due dates from the start up to and including upTo (and endDate, if set).
export function dueDates(r: Recurring, upTo: ISODate): ISODate[] {
  const last = r.endDate && r.endDate < upTo ? r.endDate : upTo;
  const dates: ISODate[] = [];
  for (let n = 0; ; n++) {
    const date = occurrence(r.startDate, r.frequency, n);
    if (date > last) return dates;
    dates.push(date);
  }
}
