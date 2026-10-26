import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Button, Choice, Field, useFormErrors } from '@/components/ui';
import { save } from '@/db/repo';
import type { OwnershipType, Vehicle } from '@/db/types';
import { formatAuDate, parseAuDate, parseDollars, parseKm, todayISO } from '@/lib/input';

const OWNERSHIP: { value: OwnershipType; label: string }[] = [
  { value: 'owned', label: 'Owned outright' },
  { value: 'financed', label: 'Car loan' },
  { value: 'leased', label: 'Lease' },
  { value: 'rented', label: 'Rental' },
];

export function VehicleForm({
  vehicle,
  submitLabel,
  onSaved,
}: {
  vehicle: Vehicle | null;
  submitLabel: string;
  onSaved: () => void;
}) {
  const db = useSQLiteContext();
  const [name, setName] = useState(vehicle?.name ?? '');
  const [rego, setRego] = useState(vehicle?.rego ?? '');
  const [ownership, setOwnership] = useState<OwnershipType>(vehicle?.ownership_type ?? 'owned');
  const [odometer, setOdometer] = useState(vehicle ? String(vehicle.start_odometer) : '');
  const [activeFrom, setActiveFrom] = useState(formatAuDate(vehicle?.active_from ?? todayISO()));
  const [purchaseDate, setPurchaseDate] = useState(vehicle?.purchase_date ? formatAuDate(vehicle.purchase_date) : '');
  const [price, setPrice] = useState(vehicle?.purchase_price_cents ? (vehicle.purchase_price_cents / 100).toFixed(2) : '');
  const { errors, setErrors, bind } = useFormErrors();

  const bought = ownership === 'owned' || ownership === 'financed';

  async function submit() {
    const e: Record<string, string> = {};
    const km = parseKm(odometer);
    const from = parseAuDate(activeFrom);
    const pDate = bought && purchaseDate.trim() ? parseAuDate(purchaseDate) : null;
    const cents = bought && price.trim() ? parseDollars(price) : null;
    if (!name.trim()) e.name = 'Give the car a name, e.g. "Corolla"';
    if (km === null) e.odometer = 'Enter whole kilometres from the dashboard';
    if (!from) e.activeFrom = 'Enter the date as DD/MM/YYYY';
    if (bought && purchaseDate.trim() && !pDate) e.purchaseDate = 'Enter the date as DD/MM/YYYY';
    if (bought && price.trim() && cents === null) e.price = 'Enter an amount like 24500.00';
    setErrors(e);
    if (Object.keys(e).length) return;

    await save(db, 'vehicle', {
      id: vehicle?.id,
      name: name.trim(),
      rego: rego.trim().toUpperCase() || null,
      ownership_type: ownership,
      start_odometer: km,
      active_from: from,
      purchase_date: pDate,
      purchase_price_cents: cents,
    });
    onSaved();
  }

  return (
    <>
      <Field label="Car name" value={name} onChangeText={bind('name', setName)} placeholder="Corolla" error={errors.name} />
      <Field label="Rego (optional)" value={rego} onChangeText={setRego} autoCapitalize="characters" />
      <Choice label="How do you have this car?" value={ownership} onChange={setOwnership} options={OWNERSHIP} />
      <Field
        label={vehicle ? 'Odometer when added (km)' : 'Current odometer (km)'}
        value={odometer}
        onChangeText={bind('odometer', setOdometer)}
        keyboardType="number-pad"
        error={errors.odometer}
        hint="Your first logbook reading starts from here."
      />
      <Field
        label="Using this car from"
        value={activeFrom}
        onChangeText={bind('activeFrom', setActiveFrom)}
        placeholder="DD/MM/YYYY"
        keyboardType="numbers-and-punctuation"
        error={errors.activeFrom}
      />
      {bought ? (
        <>
          <Field
            label="Purchase date (optional)"
            value={purchaseDate}
            onChangeText={bind('purchaseDate', setPurchaseDate)}
            placeholder="DD/MM/YYYY"
            keyboardType="numbers-and-punctuation"
            error={errors.purchaseDate}
          />
          <Field
            label="Purchase price incl. GST (optional)"
            value={price}
            onChangeText={bind('price', setPrice)}
            keyboardType="decimal-pad"
            placeholder="$"
            error={errors.price}
            hint="Used to work out depreciation."
          />
        </>
      ) : null}
      <Button title={submitLabel} onPress={submit} />
    </>
  );
}
