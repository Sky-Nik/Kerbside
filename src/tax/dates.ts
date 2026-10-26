// Dates are local calendar dates as 'YYYY-MM-DD' strings. They compare correctly
// as strings and avoid timezone shifts from Date parsing.
export type ISODate = string;

export type Period = { start: ISODate; end: ISODate; label: string };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parts(date: ISODate): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number);
  return [y, m, d];
}

export function toISODate(y: number, m: number, d: number): ISODate {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function inPeriod(date: ISODate, p: Period): boolean {
  return date >= p.start && date <= p.end;
}

// Australian tax year runs 1 July to 30 June, e.g. 2026-10-26 -> "2026-27".
export function taxYear(date: ISODate): Period {
  const [y, m] = parts(date);
  const start = m >= 7 ? y : y - 1;
  return {
    start: toISODate(start, 7, 1),
    end: toISODate(start + 1, 6, 30),
    label: `${start}-${String(start + 1).slice(2)}`,
  };
}

// BAS quarters: Jul–Sep, Oct–Dec, Jan–Mar, Apr–Jun.
export function basQuarter(date: ISODate): Period {
  const [y, m] = parts(date);
  const first = Math.floor((m - 1) / 3) * 3 + 1;
  const last = first + 2;
  return {
    start: toISODate(y, first, 1),
    end: toISODate(y, last, daysInMonth(y, last)),
    label: `${MONTHS[first - 1]}–${MONTHS[last - 1]} ${y}`,
  };
}

export function basPeriod(date: ISODate, frequency: 'quarterly' | 'annual'): Period {
  return frequency === 'quarterly' ? basQuarter(date) : taxYear(date);
}
