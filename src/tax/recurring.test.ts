import { expect, test } from '@jest/globals';
import { dueDates } from './recurring';

test('monthly clamps to short months without drifting', () => {
  expect(dueDates({ startDate: '2027-01-31', endDate: null, frequency: 'monthly' }, '2027-04-30')).toEqual([
    '2027-01-31',
    '2027-02-28',
    '2027-03-31',
    '2027-04-30',
  ]);
});

test('monthly crosses the year', () => {
  expect(dueDates({ startDate: '2026-11-05', endDate: null, frequency: 'monthly' }, '2027-01-05')).toEqual([
    '2026-11-05',
    '2026-12-05',
    '2027-01-05',
  ]);
});

test('weekly crosses month ends', () => {
  expect(dueDates({ startDate: '2026-12-24', endDate: null, frequency: 'weekly' }, '2027-01-07')).toEqual([
    '2026-12-24',
    '2026-12-31',
    '2027-01-07',
  ]);
});

test('yearly on 29 Feb falls back to 28 Feb', () => {
  expect(dueDates({ startDate: '2028-02-29', endDate: null, frequency: 'yearly' }, '2030-12-31')).toEqual([
    '2028-02-29',
    '2029-02-28',
    '2030-02-28',
  ]);
});

test('stops at endDate', () => {
  expect(dueDates({ startDate: '2027-01-05', endDate: '2027-02-10', frequency: 'monthly' }, '2027-12-31')).toEqual([
    '2027-01-05',
    '2027-02-05',
  ]);
});

test('nothing due before the start', () => {
  expect(dueDates({ startDate: '2027-01-05', endDate: null, frequency: 'monthly' }, '2027-01-04')).toEqual([]);
});
