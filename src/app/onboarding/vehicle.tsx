import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { VehicleForm } from '@/components/forms/VehicleForm';
import { Heading, Screen } from '@/components/ui';
import { list } from '@/db/repo';
import type { Vehicle } from '@/db/types';

export default function OnboardingVehicle() {
  const db = useSQLiteContext();
  // Coming back to this step edits the car added earlier instead of adding a second one.
  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);

  useEffect(() => {
    list<Vehicle>(db, 'vehicle').then((v) => setVehicle(v[0] ?? null));
  }, [db]);

  if (vehicle === undefined) return null;
  return (
    <Screen>
      <Heading hint="You can add more cars later in Settings.">Which car do you drive?</Heading>
      <VehicleForm vehicle={vehicle} submitLabel="Next" onSaved={() => router.push('/onboarding/shifts')} />
    </Screen>
  );
}
