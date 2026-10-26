import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { VehiclePicker } from '@/components/VehiclePicker';
import { Button, Screen, colors, styles } from '@/components/ui';
import { save } from '@/db/repo';
import { PURPOSE_LABEL, activeVehicles, toTrip, vehicleTrips } from '@/db/trips';
import type { LogbookPeriod, TripRow, Vehicle } from '@/db/types';
import { formatAuDate, todayISO } from '@/lib/input';
import { toISODate } from '@/tax/dates';
import { businessUse } from '@/tax/logbook';

const LOGBOOK_DAYS = 12 * 7;

const PURPOSE_COLOR = { uber_x: '#1d4ed8', uber_eats: '#15803d', personal: '#71717a' };

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return toISODate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export default function Logbook() {
  const db = useSQLiteContext();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [period, setPeriod] = useState<LogbookPeriod | null>(null);

  const load = useCallback(async () => {
    const vs = await activeVehicles(db);
    setVehicles(vs);
    const vehicle = vs.find((v) => v.id === vehicleId) ?? vs[0];
    if (!vehicle) return;
    setVehicleId(vehicle.id);
    setTrips(await vehicleTrips(db, vehicle.id));
    setPeriod(
      await db.getFirstAsync<LogbookPeriod>(
        `SELECT * FROM logbook_period WHERE deleted_at IS NULL AND vehicle_id = ? ORDER BY start_date DESC`,
        [vehicle.id],
      ),
    );
  }, [db, vehicleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function startPeriod() {
    const start = todayISO();
    await save(db, 'logbook_period', { vehicle_id: vehicleId, start_date: start, end_date: addDays(start, LOGBOOK_DAYS - 1) });
    await load();
  }

  async function lockPeriod(pct: number) {
    if (!period) return;
    await save(db, 'logbook_period', { id: period.id, business_pct: pct });
    await load();
  }

  const byDay = new Map<string, TripRow[]>();
  for (const t of [...trips].reverse()) byDay.set(t.date, [...(byDay.get(t.date) ?? []), t]);

  return (
    <Screen>
      <VehiclePicker vehicles={vehicles} value={vehicleId} onChange={setVehicleId} />
      <PeriodCard period={period} trips={trips} onStart={startPeriod} onLock={lockPeriod} />

      {trips.length === 0 ? <Text style={styles.muted}>No trips yet. Start one from the Home tab.</Text> : null}
      {[...byDay].map(([date, dayTrips]) => (
        <View key={date} style={{ gap: 6 }}>
          <Text style={styles.label}>{new Date(`${date}T00:00`).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</Text>
          {dayTrips.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => router.push({ pathname: '/logbook/[id]', params: { id: t.id } })}
              accessibilityRole="button"
              style={({ pressed }) => [styles.card, styles.row, pressed && { opacity: 0.7 }]}
            >
              <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: PURPOSE_COLOR[t.purpose] }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{PURPOSE_LABEL[t.purpose]}</Text>
                <Text style={styles.muted}>
                  {t.start_odometer.toLocaleString('en-AU')} → {t.end_odometer?.toLocaleString('en-AU') ?? 'in progress'}
                </Text>
              </View>
              <Text style={styles.label}>{t.end_odometer !== null ? `${t.end_odometer - t.start_odometer} km` : ''}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </Screen>
  );
}

function PeriodCard({
  period,
  trips,
  onStart,
  onLock,
}: {
  period: LogbookPeriod | null;
  trips: TripRow[];
  onStart: () => void;
  onLock: (pct: number) => void;
}) {
  if (!period) {
    return (
      <View style={[styles.card, { gap: 8 }]}>
        <Text style={styles.label}>12-week logbook</Text>
        <Text style={styles.muted}>
          The ATO lets you claim your car’s business-use % once you have logged every trip for 12 continuous weeks. The result is
          valid for 5 years.
        </Text>
        <Button title="Start 12-week logbook today" onPress={onStart} />
      </View>
    );
  }

  if (period.business_pct !== null) {
    return (
      <View style={[styles.card, { gap: 4 }]}>
        <Text style={styles.label}>Business use {(period.business_pct * 100).toFixed(1)}%</Text>
        <Text style={styles.muted}>
          From your logbook {formatAuDate(period.start_date)} – {formatAuDate(period.end_date)}. Valid until{' '}
          {formatAuDate(`${Number(period.start_date.slice(0, 4)) + 5}${period.start_date.slice(4)}`)} unless your driving changes a lot.
        </Text>
      </View>
    );
  }

  const today = todayISO();
  const done = today > period.end_date;
  const end = done ? period.end_date : today;
  const use = businessUse(trips.map(toTrip), { start: period.start_date, end, label: '' });
  const daysIn = Math.min(Math.floor((Date.parse(today) - Date.parse(period.start_date)) / 86_400_000) + 1, LOGBOOK_DAYS);
  const week = Math.max(1, Math.ceil(daysIn / 7));

  return (
    <View style={[styles.card, { gap: 8 }]}>
      <Text style={styles.label}>{done ? 'Logbook complete' : `Logbook week ${week} of 12`}</Text>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border }}>
        <View style={{ height: 8, borderRadius: 4, width: `${(daysIn / LOGBOOK_DAYS) * 100}%`, backgroundColor: colors.primary }} />
      </View>
      <Text style={styles.muted}>
        Business {(use.pct * 100).toFixed(1)}% so far · {use.businessKm.toLocaleString('en-AU')} of {use.totalKm.toLocaleString('en-AU')} km ·
        ends {formatAuDate(period.end_date)}
      </Text>
      {done ? <Button title={`Lock in ${(use.pct * 100).toFixed(1)}% business use`} onPress={() => onLock(use.pct)} /> : null}
    </View>
  );
}
