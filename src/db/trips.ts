import type { SQLiteDatabase } from 'expo-sqlite';
import { todayISO } from '@/lib/input';
import type { Trip } from '@/tax/logbook';
import type { TripRow, Vehicle } from './types';

export const PURPOSE_LABEL = { uber_x: 'Uber X', uber_eats: 'Uber Eats', personal: 'Personal' } as const;

export function toTrip(r: TripRow): Trip {
  return {
    id: r.id,
    purpose: r.purpose,
    date: r.date,
    startAt: r.start_at,
    startOdometer: r.start_odometer,
    endOdometer: r.end_odometer,
  };
}

// Cars in use today, newest first.
export function activeVehicles(db: SQLiteDatabase): Promise<Vehicle[]> {
  return db.getAllAsync<Vehicle>(
    `SELECT * FROM vehicle WHERE deleted_at IS NULL AND (active_to IS NULL OR active_to >= ?) ORDER BY active_from DESC`,
    [todayISO()],
  );
}

export function vehicleTrips(db: SQLiteDatabase, vehicleId: string): Promise<TripRow[]> {
  return db.getAllAsync<TripRow>(
    `SELECT * FROM trip WHERE deleted_at IS NULL AND vehicle_id = ? ORDER BY start_at`,
    [vehicleId],
  );
}

// Where the next trip should start: the last logged end, or the car's starting reading.
export function lastOdometer(vehicle: Vehicle, trips: TripRow[]): number {
  const done = trips.filter((t) => t.end_odometer !== null);
  return done.length ? done[done.length - 1].end_odometer! : vehicle.start_odometer;
}
