import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Button, colors, styles } from '@/components/ui';
import { list, save, softDelete } from '@/db/repo';
import type { ShiftPlan } from '@/db/types';
import { isTime } from '@/lib/input';
import { rescheduleReminders } from '@/lib/reminders';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type Draft = { key: string; id?: string; weekday: number; start: string; end: string };

let nextKey = 0;
const draft = (weekday: number, start = '', end = '', id?: string): Draft => ({ key: `k${nextKey++}`, id, weekday, start, end });

export function ShiftPlanForm({ submitLabel, onSaved }: { submitLabel: string; onSaved: () => void }) {
  const db = useSQLiteContext();
  const [rows, setRows] = useState<Draft[]>([]);
  const [existing, setExisting] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    list<ShiftPlan>(db, 'shift_plan', 'weekday, start_time').then((plan) => {
      setRows(plan.map((p) => draft(p.weekday, p.start_time, p.end_time, p.id)));
      setExisting(plan.map((p) => p.id));
    });
  }, [db]);

  const update = (key: string, patch: Partial<Draft>) => {
    setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
    setError('');
  };

  async function submit() {
    const bad = rows.find((r) => !isTime(r.start) || !isTime(r.end) || r.start >= r.end);
    if (bad) {
      setError(`${DAYS[bad.weekday - 1]}: use 24-hour times like 11:00 to 14:00, with the end after the start.`);
      return;
    }
    setError('');
    const kept = new Set(rows.map((r) => r.id));
    for (const id of existing) if (!kept.has(id)) await softDelete(db, 'shift_plan', id);
    for (const r of rows) await save(db, 'shift_plan', { id: r.id, weekday: r.weekday, start_time: r.start, end_time: r.end });
    await rescheduleReminders(db);
    onSaved();
  }

  return (
    <>
      <Text style={styles.muted}>Reminders to log your odometer will follow this plan. Days with no shifts get no reminders.</Text>
      {DAYS.map((day, i) => {
        const weekday = i + 1;
        const shifts = rows.filter((r) => r.weekday === weekday);
        return (
          <View key={day} style={[styles.card, { gap: 8 }]}>
            <Text style={styles.label}>{day}</Text>
            {shifts.map((s) => (
              <View key={s.key} style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={s.start}
                  onChangeText={(start) => update(s.key, { start })}
                  placeholder="11:00"
                  placeholderTextColor={colors.muted}
                  keyboardType="numbers-and-punctuation"
                  accessibilityLabel={`${day} shift start`}
                />
                <Text style={styles.muted}>to</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={s.end}
                  onChangeText={(end) => update(s.key, { end })}
                  placeholder="14:00"
                  placeholderTextColor={colors.muted}
                  keyboardType="numbers-and-punctuation"
                  accessibilityLabel={`${day} shift end`}
                />
                <Pressable
                  onPress={() => setRows((r) => r.filter((x) => x.key !== s.key))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${day} shift`}
                  hitSlop={12}
                >
                  <Text style={{ fontSize: 20, color: colors.muted }}>×</Text>
                </Pressable>
              </View>
            ))}
            <Pressable onPress={() => setRows((r) => [...r, draft(weekday)])} accessibilityRole="button">
              <Text style={{ color: colors.primary, fontWeight: '600' }}>+ Add shift</Text>
            </Pressable>
          </View>
        );
      })}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={submitLabel} onPress={submit} />
    </>
  );
}
