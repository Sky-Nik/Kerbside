import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="profile" options={{ title: 'Your details' }} />
      <Stack.Screen name="vehicles" options={{ title: 'Cars' }} />
      <Stack.Screen name="vehicle/[id]" options={{ title: 'Car' }} />
      <Stack.Screen name="shifts" options={{ title: 'Shift plan' }} />
    </Stack>
  );
}
