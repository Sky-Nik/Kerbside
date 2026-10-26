import { router } from 'expo-router';
import { ListItem, Screen } from '@/components/ui';
import { useProfile } from '@/db/ProfileContext';
import { formatAbn, formatAuDate } from '@/lib/input';

export default function Settings() {
  const { profile } = useProfile();
  const gst = profile?.gst_registered_from ? `GST from ${formatAuDate(profile.gst_registered_from)}` : 'Not GST registered';
  const abn = profile?.abn ? `ABN ${formatAbn(profile.abn)}` : 'No ABN';

  return (
    <Screen>
      <ListItem title={profile?.legal_name ?? 'Your details'} subtitle={`${abn} · ${gst}`} onPress={() => router.push('/settings/profile')} />
      <ListItem title="Cars" subtitle="Add or edit your cars" onPress={() => router.push('/settings/vehicles')} />
      <ListItem title="Shift plan" subtitle="When reminders go off" onPress={() => router.push('/settings/shifts')} />
    </Screen>
  );
}
