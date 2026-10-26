import { router } from 'expo-router';
import { ProfileForm } from '@/components/forms/ProfileForm';
import { Heading, Screen } from '@/components/ui';

export default function OnboardingProfile() {
  return (
    <Screen>
      <Heading hint="These appear on your BAS and tax reports.">Welcome to Driver Logbook</Heading>
      <ProfileForm submitLabel="Next" onSaved={() => router.push('/onboarding/vehicle')} />
    </Screen>
  );
}
