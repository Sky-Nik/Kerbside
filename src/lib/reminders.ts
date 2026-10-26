import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { list } from '@/db/repo';
import type { ShiftPlan } from '@/db/types';
import { todayISO } from './input';
import { upcomingShifts } from './shifts';

const CHANNEL = 'shift-reminders';
const DAYS_AHEAD = 14;
const supported = Platform.OS !== 'web';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function remindersAllowed(): Promise<boolean> {
  if (!supported) return true;
  return (await Notifications.getPermissionsAsync()).granted;
}

// Asks once; Android 13+ only shows the prompt after a channel exists.
export async function requestReminderPermission(): Promise<boolean> {
  if (!supported) return true;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Shift reminders',
    // eslint-disable-next-line import/namespace -- re-exported via export *, which the resolver misses
    importance: Notifications.AndroidImportance.HIGH,
  });
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

// Rebuilds all reminders from the shift plan for the next two weeks. Call on app start and
// whenever the plan or an off-road day changes (Android can also drop alarms on reboot).
// ponytail: best-effort timing (may fire a few minutes late); add SCHEDULE_EXACT_ALARM if that bites.
export async function rescheduleReminders(db: SQLiteDatabase): Promise<void> {
  if (!supported || !(await requestReminderPermission())) return;

  const plan = await list<ShiftPlan>(db, 'shift_plan');
  const offRoad = await db.getAllAsync<{ date: string }>(
    `SELECT date FROM day_status WHERE deleted_at IS NULL AND status = 'off_road' AND date >= ?`,
    [todayISO()],
  );
  const now = new Date();
  const shifts = upcomingShifts(plan, now, DAYS_AHEAD, new Set(offRoad.map((d) => d.date)));

  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const s of shifts) {
    if (s.start > now) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Shift starting', body: 'Log your odometer before you head off.' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: s.start, channelId: CHANNEL },
      });
    }
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Shift over', body: 'End your trip and log the odometer.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: s.end, channelId: CHANNEL },
    });
  }
}
