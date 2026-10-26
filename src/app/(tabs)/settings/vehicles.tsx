import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Button, ListItem, Screen } from '@/components/ui';
import { list } from '@/db/repo';
import type { Vehicle } from '@/db/types';
import { formatAuDate } from '@/lib/input';

const OWNERSHIP_LABEL = { owned: 'Owned', financed: 'Car loan', leased: 'Lease', rented: 'Rental' };

export default function Vehicles() {
  const db = useSQLiteContext();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Refresh when coming back from the edit screen.
  useFocusEffect(
    useCallback(() => {
      list<Vehicle>(db, 'vehicle', 'active_from DESC').then(setVehicles);
    }, [db]),
  );

  return (
    <Screen>
      {vehicles.map((v) => (
        <ListItem
          key={v.id}
          title={v.rego ? `${v.name} · ${v.rego}` : v.name}
          subtitle={`${OWNERSHIP_LABEL[v.ownership_type]} · since ${formatAuDate(v.active_from)}${v.active_to ? ` · until ${formatAuDate(v.active_to)}` : ''}`}
          onPress={() => router.push({ pathname: '/settings/vehicle/[id]', params: { id: v.id } })}
        />
      ))}
      <Button title="Add a car" variant="secondary" onPress={() => router.push({ pathname: '/settings/vehicle/[id]', params: { id: 'new' } })} />
    </Screen>
  );
}
