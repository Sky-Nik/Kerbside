import { router } from 'expo-router';
import { ShiftPlanForm } from '@/components/forms/ShiftPlanForm';
import { Screen } from '@/components/ui';

export default function EditShifts() {
  return (
    <Screen>
      <ShiftPlanForm submitLabel="Save" onSaved={() => router.back()} />
    </Screen>
  );
}
