import { daysInMonth, toISODate, type ISODate } from '@/tax/dates';

const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

// ATO ABN checksum: subtract 1 from the first digit, weight, sum, divisible by 89.
export function isValidAbn(input: string): boolean {
  const digits = input.replace(/\s/g, '');
  if (!/^\d{11}$/.test(digits)) return false;
  const sum = [...digits].reduce((s, d, i) => s + (Number(d) - (i === 0 ? 1 : 0)) * ABN_WEIGHTS[i], 0);
  return sum % 89 === 0;
}

// '51824753556' -> '51 824 753 556'
export function formatAbn(input: string): string {
  const d = input.replace(/\s/g, '');
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`.trim();
}

// Australian 'DD/MM/YYYY' -> ISO, or null if not a real date.
export function parseAuDate(input: string): ISODate | null {
  const m = input.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
  return toISODate(y, mo, d);
}

export function formatAuDate(date: ISODate): string {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

export function todayISO(now = new Date()): ISODate {
  return toISODate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

// '$1,234.5' -> 123450 cents, or null if not a non-negative amount.
export function parseDollars(input: string): number | null {
  const s = input.replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

export function formatDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// 24-hour 'HH:MM'.
export function isTime(input: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(input);
}

export function parseKm(input: string): number | null {
  const s = input.replace(/[,\s]/g, '');
  return /^\d+$/.test(s) ? Number(s) : null;
}
