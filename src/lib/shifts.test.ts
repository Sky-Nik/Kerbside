import { expect, test } from '@jest/globals';
import { upcomingShifts } from './shifts';

// Monday 26 Oct 2026, 12:30 local
const now = new Date(2026, 9, 26, 12, 30);
const plan = [
  { weekday: 1, start_time: '17:00', end_time: '21:00' },
  { weekday: 1, start_time: '11:00', end_time: '14:00' },
  { weekday: 2, start_time: '11:00', end_time: '14:00' },
];

const fmt = (s: { start: Date }) => `${s.start.getDate()} ${s.start.getHours()}:${String(s.start.getMinutes()).padStart(2, '0')}`;

test('includes the shift in progress, sorted, across days', () => {
  expect(upcomingShifts(plan, now, 2, new Set()).map(fmt)).toEqual(['26 11:00', '26 17:00', '27 11:00']);
});

test('drops shifts that have ended', () => {
  expect(upcomingShifts(plan, new Date(2026, 9, 26, 14, 0), 1, new Set()).map(fmt)).toEqual(['26 17:00']);
});

test('skips off-road days', () => {
  expect(upcomingShifts(plan, now, 2, new Set(['2026-10-26'])).map(fmt)).toEqual(['27 11:00']);
});

test('Sunday is weekday 7 and weeks repeat', () => {
  const sunday = [{ weekday: 7, start_time: '09:00', end_time: '10:00' }];
  expect(upcomingShifts(sunday, now, 14, new Set()).map((s) => s.date)).toEqual(['2026-11-01', '2026-11-08']);
});
