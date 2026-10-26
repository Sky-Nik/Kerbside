import { expect, test } from '@jest/globals';
import {
  formatAbn,
  formatAuDate,
  formatDollars,
  isTime,
  isValidAbn,
  parseAuDate,
  parseDollars,
  parseKm,
  todayISO,
} from './input';

test('ABN checksum', () => {
  expect(isValidAbn('51 824 753 556')).toBe(true); // ATO's published example
  expect(isValidAbn('51824753557')).toBe(false);
  expect(isValidAbn('5182475355')).toBe(false);
  expect(isValidAbn('abc')).toBe(false);
  expect(formatAbn('51824753556')).toBe('51 824 753 556');
});

test('Australian dates', () => {
  expect(parseAuDate('26/10/2026')).toBe('2026-10-26');
  expect(parseAuDate('1/7/2026')).toBe('2026-07-01');
  expect(parseAuDate('29/02/2027')).toBeNull();
  expect(parseAuDate('29/02/2028')).toBe('2028-02-29');
  expect(parseAuDate('2026-10-26')).toBeNull();
  expect(parseAuDate('31/04/2026')).toBeNull();
  expect(formatAuDate('2026-07-01')).toBe('01/07/2026');
  expect(todayISO(new Date(2026, 9, 26, 23, 59))).toBe('2026-10-26');
});

test('dollars to cents without float error', () => {
  expect(parseDollars('$1,234.5')).toBe(123450);
  expect(parseDollars('0.10')).toBe(10);
  expect(parseDollars('19.99')).toBe(1999);
  expect(parseDollars('12')).toBe(1200);
  expect(parseDollars('1.234')).toBeNull();
  expect(parseDollars('-5')).toBeNull();
  expect(parseDollars('')).toBeNull();
  expect(formatDollars(123450)).toBe('$1,234.50');
});

test('times and km', () => {
  expect(isTime('09:30')).toBe(true);
  expect(isTime('23:59')).toBe(true);
  expect(isTime('24:00')).toBe(false);
  expect(isTime('9:30')).toBe(false);
  expect(parseKm('123,456')).toBe(123456);
  expect(parseKm('12.5')).toBeNull();
});
