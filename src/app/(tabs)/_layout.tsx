import { Tabs } from 'expo-router';

// ponytail: text-only tab labels, add icons with the visual design pass
export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="logbook" options={{ title: 'Logbook' }} />
      <Tabs.Screen name="money" options={{ title: 'Money' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
      <Tabs.Screen name="documents" options={{ title: 'Documents' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', headerShown: false }} />
    </Tabs>
  );
}
