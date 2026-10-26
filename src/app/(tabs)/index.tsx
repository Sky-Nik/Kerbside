import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { VehiclePicker } from '@/components/VehiclePicker';
import { Button, Choice, Field, Screen, Toggle, colors, styles } from '@/components/ui';
import { list, save, softDelete } from '@/db/repo';
import { PURPOSE_LABEL, activeVehicles, lastOdometer, toTrip, vehicleTrips } from '@/db/trips';
import type { ShiftPlan, TripRow, Vehicle } from '@/db/types';
import { parseKm, todayISO } from '@/lib/input';
import { remindersAllowed, requestReminderPermission, rescheduleReminders } from '@/lib/reminders';
import { upcomingShifts, type Shift } from '@/lib/shifts';
import { checkTrip, odometerGaps } from '@/tax/logbook';

type Purpose = TripRow['purpose'];

const km = (n: number) => `${n.toLocaleString('en-AU')} km`;
const time = (iso: string | Date) => new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });

function shiftLabel(s: Shift): string {
  const day = s.date === todayISO() ? 'Today' : s.start.toLocaleDateString('en-AU', { weekday: 'long' });
  return `${day} ${time(s.start)} – ${time(s.end)}`;
}

export default function Home() {
  const db = useSQLiteContext();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [nextShift, setNextShift] = useState<Shift | null>(null);
  const [offRoadId, setOffRoadId] = useState<string | null>(null);
  const [remindersOn, setRemindersOn] = useState(true);

  const [purpose, setPurpose] = useState<Purpose>('uber_eats');
  const [odometer, setOdometer] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [warning, setWarning] = useState<string | null>(null);

  const load = useCallback(async () => {
    const vs = await activeVehicles(db);
    setVehicles(vs);
    const vehicle = vs.find((v) => v.id === vehicleId) ?? vs[0];
    if (!vehicle) return;
    setVehicleId(vehicle.id);
    const ts = await vehicleTrips(db, vehicle.id);
    setTrips(ts);
    setOdometer(ts.some((t) => t.end_odometer === null) ? '' : String(lastOdometer(vehicle, ts)));

    const today = todayISO();
    const off = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM day_status WHERE deleted_at IS NULL AND date = ? AND status = 'off_road'`,
      [today],
    );
    setOffRoadId(off?.id ?? null);
    setRemindersOn(await remindersAllowed());
    const plan = await list<ShiftPlan>(db, 'shift_plan');
    setNextShift(upcomingShifts(plan, new Date(), 8, new Set(off ? [today] : []))[0] ?? null);
  }, [db, vehicleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const active = trips.find((t) => t.end_odometer === null);
  const others = trips.filter((t) => t.id !== active?.id).map(toTrip);
  const gaps = odometerGaps(trips.map(toTrip)).slice(-3);

  function edit(v: string) {
    setOdometer(v);
    setProblems([]);
    setWarning(null);
  }

  // Second press after a warning saves anyway.
  function validate(start: number, end: number | null): boolean {
    const check = checkTrip(start, end, others);
    setProblems(check.errors);
    if (check.errors.length) return false;
    if (check.warnings.length && warning === null) {
      setWarning(check.warnings.join(' '));
      return false;
    }
    return true;
  }

  async function turnOnReminders() {
    if (await requestReminderPermission()) await rescheduleReminders(db);
    await load();
  }

  async function startTrip() {
    const start = parseKm(odometer);
    if (start === null) return setProblems(['Enter the odometer in whole km.']);
    if (!validate(start, null)) return;
    const now = new Date().toISOString();
    await save(db, 'trip', { vehicle_id: vehicleId, purpose, date: todayISO(), start_at: now, start_odometer: start });
    setWarning(null);
    await load();
  }

  async function endTrip() {
    if (!active) return;
    const end = parseKm(odometer);
    if (end === null) return setProblems(['Enter the odometer in whole km.']);
    if (!validate(active.start_odometer, end)) return;
    await save(db, 'trip', { id: active.id, end_at: new Date().toISOString(), end_odometer: end });
    setWarning(null);
    await load();
  }

  async function cancelTrip() {
    if (!active) return;
    await softDelete(db, 'trip', active.id);
    await load();
  }

  async function logGapAsPersonal(afterTripId: string, fromKm: number, toKm: number) {
    const prev = trips.find((t) => t.id === afterTripId)!;
    const next = trips.find((t) => t.start_odometer === toKm && t.start_at > prev.start_at);
    await save(db, 'trip', {
      vehicle_id: vehicleId,
      purpose: 'personal',
      date: prev.date,
      start_at: prev.end_at ?? prev.start_at,
      start_odometer: fromKm,
      end_at: next?.start_at ?? prev.end_at,
      end_odometer: toKm,
      note: 'Unlogged km filled in from the odometer gap',
    });
    await load();
  }

  async function toggleOffRoad(off: boolean) {
    if (off) await save(db, 'day_status', { date: todayISO(), status: 'off_road' });
    else if (offRoadId) await softDelete(db, 'day_status', offRoadId);
    await rescheduleReminders(db);
    await load();
  }

  if (!vehicles.length) {
    return (
      <Screen>
        <Text style={styles.muted}>Add a car in Settings to start logging trips.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      {remindersOn ? null : (
        <View style={[styles.card, { gap: 8, borderColor: '#f59e0b' }]}>
          <Text style={styles.label}>Shift reminders are off</Text>
          <Text style={styles.muted}>
            Notifications are blocked, so you won’t be reminded to log your odometer. If nothing happens below, allow notifications for
            Driver Logbook in your phone settings.
          </Text>
          <Button title="Turn on reminders" variant="secondary" onPress={turnOnReminders} />
        </View>
      )}
      <View style={[styles.card, { gap: 10 }]}>
        <Text style={styles.muted}>{nextShift ? 'Next shift' : 'No shifts planned this week'}</Text>
        {nextShift ? <Text style={styles.heading}>{shiftLabel(nextShift)}</Text> : null}
        <Toggle label="Not on road today" value={offRoadId !== null} onChange={toggleOffRoad} />
      </View>

      <View style={[styles.card, { gap: 12 }]}>
        <VehiclePicker vehicles={vehicles} value={vehicleId} onChange={setVehicleId} />
        {active ? (
          <>
            <Text style={styles.heading}>{PURPOSE_LABEL[active.purpose]} trip in progress</Text>
            <Text style={styles.muted}>
              Started {time(active.start_at)} at {km(active.start_odometer)}
            </Text>
            <Field label="Odometer now (km)" value={odometer} onChangeText={edit} keyboardType="number-pad" />
            <Problems problems={problems} warning={warning} />
            <Button title={warning ? 'End trip anyway' : 'End trip'} onPress={endTrip} />
            <Button title="Cancel this trip" variant="secondary" onPress={cancelTrip} />
          </>
        ) : (
          <>
            <Text style={styles.heading}>Start a trip</Text>
            <Choice
              label="What's this trip for?"
              value={purpose}
              onChange={setPurpose}
              options={(Object.keys(PURPOSE_LABEL) as Purpose[]).map((p) => ({ value: p, label: PURPOSE_LABEL[p] }))}
            />
            <Field
              label="Odometer now (km)"
              value={odometer}
              onChangeText={edit}
              keyboardType="number-pad"
              hint="Pre-filled with where your last trip ended. Change it if the car has moved since."
            />
            <Problems problems={problems} warning={warning} />
            <Button title={warning ? 'Start trip anyway' : 'Start trip'} onPress={startTrip} />
          </>
        )}
      </View>

      {gaps.map((g) => (
        <View key={g.afterTripId} style={[styles.card, { gap: 8, borderColor: '#f59e0b' }]}>
          <Text style={styles.label}>{km(g.toKm - g.fromKm)} not logged</Text>
          <Text style={styles.muted}>
            Between {km(g.fromKm)} and {km(g.toKm)}. The ATO logbook needs every km accounted for.
          </Text>
          <Button title="Log as personal" variant="secondary" onPress={() => logGapAsPersonal(g.afterTripId, g.fromKm, g.toKm)} />
        </View>
      ))}
    </Screen>
  );
}

function Problems({ problems, warning }: { problems: string[]; warning: string | null }) {
  return (
    <>
      {problems.map((p) => (
        <Text key={p} style={styles.error}>
          {p}
        </Text>
      ))}
      {warning ? <Text style={{ color: colors.text }}>{warning} Tap again to confirm.</Text> : null}
    </>
  );
}
