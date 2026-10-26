import { router } from 'expo-router';
import { ProfileForm } from '@/components/forms/ProfileForm';
import { Screen } from '@/components/ui';

export default function EditProfile() {
  return (
    <Screen>
      <ProfileForm submitLabel="Save" onSaved={() => router.back()} />
    </Screen>
  );
}
