import { describe, expect, test } from '@jest/globals';
import { taxYear } from './dates';
import { businessUse, checkTrip, odometerGaps, type Trip } from './logbook';

let n = 0;
function trip(purpose: Trip['purpose'], startAt: string, start: number, end: number | null): Trip {
  return { id: `t${++n}`, purpose, date: startAt.slice(0, 10), startAt, startOdometer: start, endOdometer: end };
}

const fy = taxYear('2026-08-01');

test('business % counts unlogged gaps as private', () => {
  const trips = [
    trip('uber_x', '2026-08-01T11:00', 1000, 1080),
    trip('personal', '2026-08-01T15:00', 1080, 1100),
    // 20 km gap here (1100 -> 1120) never logged
    trip('uber_eats', '2026-08-01T17:00', 1120, 1200),
  ];
  expect(businessUse(trips, fy)).toEqual({ businessKm: 160, totalKm: 200, pct: 0.8 });
});

test('order comes from start time, not array order', () => {
  const trips = [trip('uber_x', '2026-08-02T09:00', 1100, 1200), trip('personal', '2026-08-01T09:00', 1000, 1100)];
  expect(businessUse(trips, fy).pct).toBe(0.5);
});

test('ignores trips in progress and outside the period', () => {
  const trips = [
    trip('uber_x', '2026-06-30T10:00', 900, 1000), // previous tax year
    trip('uber_x', '2026-08-01T10:00', 1000, 1050),
    trip('uber_x', '2026-08-01T12:00', 1050, null),
  ];
  expect(businessUse(trips, fy)).toEqual({ businessKm: 50, totalKm: 50, pct: 1 });
});

test('no trips gives zero, not NaN', () => {
  expect(businessUse([], fy)).toEqual({ businessKm: 0, totalKm: 0, pct: 0 });
  expect(businessUse([trip('uber_x', '2026-08-01T10:00', 1000, 1000)], fy).pct).toBe(0);
});

test('odometer gaps', () => {
  const a = trip('uber_x', '2026-08-01T11:00', 1000, 1080);
  const b = trip('uber_x', '2026-08-01T17:00', 1080, 1100);
  const c = trip('personal', '2026-08-02T09:00', 1130, 1140);
  expect(odometerGaps([c, a, b])).toEqual([{ afterTripId: b.id, fromKm: 1100, toKm: 1130 }]);
});

describe('checkTrip', () => {
  const logged = [trip('uber_x', '2026-08-01T11:00', 1000, 1080)];

  test('valid trips after the last one', () => {
    expect(checkTrip(1080, 1100, logged)).toEqual({ errors: [], warnings: [] });
    expect(checkTrip(1090, null, logged)).toEqual({ errors: [], warnings: [] });
  });

  test('end below start', () => {
    expect(checkTrip(1200, 1150, logged).errors).toEqual(['The end odometer is lower than the start.']);
  });

  test('long trip is a warning, not an error', () => {
    const c = checkTrip(2000, 3600, logged);
    expect(c.errors).toEqual([]);
    expect(c.warnings).toHaveLength(1);
  });

  test('overlapping odometer ranges', () => {
    expect(checkTrip(1050, 1100, logged).errors[0]).toMatch(/Overlaps/);
    expect(checkTrip(950, 1001, logged).errors[0]).toMatch(/Overlaps/);
    expect(checkTrip(1000, null, logged).errors[0]).toMatch(/Overlaps/);
    expect(checkTrip(990, 1000, logged).errors).toEqual([]); // touching is fine
  });

  test('ignores in-progress trips', () => {
    expect(checkTrip(1500, 1600, [trip('uber_x', '2026-08-01T11:00', 1550, null)]).errors).toEqual([]);
  });
});
