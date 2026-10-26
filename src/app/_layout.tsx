import { Stack } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { ProfileProvider, useProfile } from '@/db/ProfileContext';
import { migrate } from '@/db/schema';
import { rescheduleReminders } from '@/lib/reminders';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="logbook.db" onInit={migrate}>
      <ProfileProvider>
        <Routes />
      </ProfileProvider>
    </SQLiteProvider>
  );
}

function Routes() {
  const db = useSQLiteContext();
  const { profile, loaded } = useProfile();
  const onboarded = profile?.onboarded === 1;

  useEffect(() => {
    if (onboarded) rescheduleReminders(db);
  }, [db, onboarded]);

  if (!loaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}
