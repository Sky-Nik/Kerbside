import { describe, expect, test } from '@jest/globals';
import { basPeriod, basQuarter, daysInMonth, inPeriod, taxYear } from './dates';

describe('taxYear', () => {
  test('boundary at 1 July', () => {
    expect(taxYear('2026-06-30').label).toBe('2025-26');
    expect(taxYear('2026-07-01').label).toBe('2026-27');
    expect(taxYear('2026-10-26')).toEqual({ start: '2026-07-01', end: '2027-06-30', label: '2026-27' });
  });

  test('century-safe label', () => {
    expect(taxYear('2100-01-01').label).toBe('2099-00');
  });
});

describe('basQuarter', () => {
  test.each([
    ['2026-07-01', '2026-07-01', '2026-09-30', 'Jul–Sep 2026'],
    ['2026-09-30', '2026-07-01', '2026-09-30', 'Jul–Sep 2026'],
    ['2026-10-01', '2026-10-01', '2026-12-31', 'Oct–Dec 2026'],
    ['2027-02-15', '2027-01-01', '2027-03-31', 'Jan–Mar 2027'],
    ['2027-06-30', '2027-04-01', '2027-06-30', 'Apr–Jun 2027'],
  ])('%s', (date, start, end, label) => {
    expect(basQuarter(date)).toEqual({ start, end, label });
  });
});

test('basPeriod annual is the tax year', () => {
  expect(basPeriod('2027-03-01', 'annual')).toEqual(taxYear('2027-03-01'));
});

test('daysInMonth handles leap years', () => {
  expect(daysInMonth(2028, 2)).toBe(29);
  expect(daysInMonth(2027, 2)).toBe(28);
});

test('inPeriod is inclusive', () => {
  const q = basQuarter('2026-08-01');
  expect(inPeriod('2026-07-01', q)).toBe(true);
  expect(inPeriod('2026-09-30', q)).toBe(true);
  expect(inPeriod('2026-10-01', q)).toBe(false);
});
