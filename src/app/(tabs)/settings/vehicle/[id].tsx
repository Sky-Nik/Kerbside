import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { VehicleForm } from '@/components/forms/VehicleForm';
import { Screen } from '@/components/ui';
import { get } from '@/db/repo';
import type { Vehicle } from '@/db/types';

export default function EditVehicle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(id === 'new' ? null : undefined);

  useEffect(() => {
    if (id !== 'new') get<Vehicle>(db, 'vehicle', id).then(setVehicle);
  }, [db, id]);

  if (vehicle === undefined) return null;
  return (
    <Screen>
      <VehicleForm vehicle={vehicle} submitLabel={vehicle ? 'Save' : 'Add car'} onSaved={() => router.back()} />
    </Screen>
  );
}
