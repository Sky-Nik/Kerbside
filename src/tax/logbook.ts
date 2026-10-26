import { inPeriod, type ISODate, type Period } from './dates';

export type TripPurpose = 'uber_x' | 'uber_eats' | 'personal';

export type Trip = {
  id: string;
  purpose: TripPurpose;
  date: ISODate; // start date
  startAt: string; // ISO timestamp, orders trips within a day
  startOdometer: number;
  endOdometer: number | null; // null while the trip is in progress
};

type DoneTrip = Trip & { endOdometer: number };

function completed(trips: Trip[]): DoneTrip[] {
  return trips
    .filter((t): t is DoneTrip => t.endOdometer !== null)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function isBusiness(t: Trip): boolean {
  return t.purpose !== 'personal';
}

export type BusinessUse = { businessKm: number; totalKm: number; pct: number };

// Business use for one vehicle over a logbook period. Total km runs from the first
// odometer reading to the last, so unlogged gaps count as private travel.
export function businessUse(trips: Trip[], period: Period): BusinessUse {
  const inside = completed(trips).filter((t) => inPeriod(t.date, period));
  if (inside.length === 0) return { businessKm: 0, totalKm: 0, pct: 0 };

  const businessKm = inside.filter(isBusiness).reduce((km, t) => km + t.endOdometer - t.startOdometer, 0);
  const totalKm = inside[inside.length - 1].endOdometer - inside[0].startOdometer;
  return { businessKm, totalKm, pct: totalKm > 0 ? businessKm / totalKm : 0 };
}

export type OdometerGap = { afterTripId: string; fromKm: number; toKm: number };

// Km driven between two logged trips that nobody recorded.
export function odometerGaps(trips: Trip[]): OdometerGap[] {
  const done = completed(trips);
  const gaps: OdometerGap[] = [];
  for (let i = 1; i < done.length; i++) {
    const prev = done[i - 1];
    const next = done[i];
    if (next.startOdometer > prev.endOdometer) {
      gaps.push({ afterTripId: prev.id, fromKm: prev.endOdometer, toKm: next.startOdometer });
    }
  }
  return gaps;
}
