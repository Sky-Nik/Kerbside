import { useSQLiteContext } from 'expo-sqlite';
import { ShiftPlanForm } from '@/components/forms/ShiftPlanForm';
import { Heading, Screen } from '@/components/ui';
import { useProfile } from '@/db/ProfileContext';
import { save } from '@/db/repo';

export default function OnboardingShifts() {
  const db = useSQLiteContext();
  const { profile, reload } = useProfile();

  async function finish() {
    if (!profile) return;
    await save(db, 'profile', { id: profile.id, onboarded: 1 });
    await reload(); // flips the route guard to the main tabs
  }

  return (
    <Screen>
      <Heading hint="For example 11:00 to 14:00 and 17:00 to 21:00. You can change this any time.">
        When do you usually drive?
      </Heading>
      <ShiftPlanForm submitLabel="Finish setup" onSaved={finish} />
    </Screen>
  );
}
