import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Button, Choice, Field, Screen, styles, useFormErrors } from '@/components/ui';
import { get, save, softDelete } from '@/db/repo';
import { PURPOSE_LABEL, toTrip, vehicleTrips } from '@/db/trips';
import type { TripRow } from '@/db/types';
import { parseKm } from '@/lib/input';
import { checkTrip } from '@/tax/logbook';

type Purpose = TripRow['purpose'];

export default function EditTrip() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const [trip, setTrip] = useState<TripRow | null>(null);
  const [purpose, setPurpose] = useState<Purpose>('uber_x');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [note, setNote] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const { errors, setErrors, bind } = useFormErrors();

  useEffect(() => {
    get<TripRow>(db, 'trip', id).then((t) => {
      if (!t) return;
      setTrip(t);
      setPurpose(t.purpose);
      setStart(String(t.start_odometer));
      setEnd(t.end_odometer === null ? '' : String(t.end_odometer));
      setNote(t.note ?? '');
    });
  }, [db, id]);

  if (!trip) return null;

  async function submit() {
    if (!trip) return;
    const s = parseKm(start);
    const e = end.trim() ? parseKm(end) : null;
    const errs: Record<string, string> = {};
    if (s === null) errs.start = 'Enter whole km';
    if (end.trim() && e === null) errs.end = 'Enter whole km';
    if (Object.keys(errs).length) return setErrors(errs);

    const others = (await vehicleTrips(db, trip.vehicle_id)).filter((t) => t.id !== trip.id).map(toTrip);
    const check = checkTrip(s!, e, others);
    if (check.errors.length) return setErrors({ end: check.errors.join(' ') });
    if (check.warnings.length && warning === null) return setWarning(check.warnings.join(' '));

    await save(db, 'trip', {
      id: trip.id,
      purpose,
      start_odometer: s,
      end_odometer: e,
      end_at: e === null ? null : (trip.end_at ?? new Date().toISOString()),
      note: note.trim() || null,
    });
    router.back();
  }

  async function remove() {
    if (!trip) return;
    await softDelete(db, 'trip', trip.id);
    router.back();
  }

  return (
    <Screen>
      <Text style={styles.muted}>
        {new Date(trip.start_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
      </Text>
      <Choice
        label="Purpose"
        value={purpose}
        onChange={setPurpose}
        options={(Object.keys(PURPOSE_LABEL) as Purpose[]).map((p) => ({ value: p, label: PURPOSE_LABEL[p] }))}
      />
      <Field label="Start odometer (km)" value={start} onChangeText={bind('start', setStart)} keyboardType="number-pad" error={errors.start} />
      <Field
        label="End odometer (km)"
        value={end}
        onChangeText={bind('end', (v: string) => {
          setEnd(v);
          setWarning(null);
        })}
        keyboardType="number-pad"
        error={errors.end}
        hint="Leave empty if the trip is still going."
      />
      <Field label="Note (optional)" value={note} onChangeText={setNote} />
      {warning ? <Text style={styles.label}>{warning} Tap Save again to confirm.</Text> : null}
      <Button title={warning ? 'Save anyway' : 'Save'} onPress={submit} />
      <Button title="Delete trip" variant="danger" onPress={remove} />
    </Screen>
  );
}
