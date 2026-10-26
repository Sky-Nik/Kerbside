import { Stack } from 'expo-router';

export default function LogbookLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Logbook' }} />
      <Stack.Screen name="[id]" options={{ title: 'Edit trip' }} />
    </Stack>
  );
}
