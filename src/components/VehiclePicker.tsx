import { Choice } from '@/components/ui';
import type { Vehicle } from '@/db/types';

// Only shown when there is more than one car in use.
export function VehiclePicker({ vehicles, value, onChange }: { vehicles: Vehicle[]; value: string; onChange: (id: string) => void }) {
  if (vehicles.length < 2) return null;
  return <Choice label="Car" value={value} onChange={onChange} options={vehicles.map((v) => ({ value: v.id, label: v.name }))} />;
}
