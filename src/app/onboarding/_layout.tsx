import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Your details (1 of 3)' }} />
      <Stack.Screen name="vehicle" options={{ title: 'Your car (2 of 3)' }} />
      <Stack.Screen name="shifts" options={{ title: 'Your shifts (3 of 3)' }} />
    </Stack>
  );
}
