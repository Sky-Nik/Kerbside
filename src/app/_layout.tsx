import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { ProfileProvider, useProfile } from '@/db/ProfileContext';
import { migrate } from '@/db/schema';

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
  const { profile, loaded } = useProfile();
  if (!loaded) return null;
  const onboarded = profile?.onboarded === 1;

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
