import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Button, Choice, Field, Toggle } from '@/components/ui';
import { useProfile } from '@/db/ProfileContext';
import { save } from '@/db/repo';
import { formatAbn, formatAuDate, isValidAbn, parseAuDate } from '@/lib/input';

export function ProfileForm({ submitLabel, onSaved }: { submitLabel: string; onSaved: () => void }) {
  const db = useSQLiteContext();
  const { profile, reload } = useProfile();

  const [legalName, setLegalName] = useState(profile?.legal_name ?? '');
  const [tradingName, setTradingName] = useState(profile?.trading_name ?? '');
  const [abn, setAbn] = useState(profile?.abn ? formatAbn(profile.abn) : '');
  const [gst, setGst] = useState(profile ? profile.gst_registered_from !== null : false);
  const [gstFrom, setGstFrom] = useState(profile?.gst_registered_from ? formatAuDate(profile.gst_registered_from) : '');
  const [basFrequency, setBasFrequency] = useState(profile?.bas_frequency ?? 'quarterly');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit() {
    const e: Record<string, string> = {};
    if (!legalName.trim()) e.legalName = 'Enter your name as it appears on your ABN';
    if (abn.trim() && !isValidAbn(abn)) e.abn = 'That ABN is not valid. Check the 11 digits.';
    const gstDate = gst ? parseAuDate(gstFrom) : null;
    if (gst && !gstDate) e.gstFrom = 'Enter the date as DD/MM/YYYY';
    setErrors(e);
    if (Object.keys(e).length) return;

    await save(db, 'profile', {
      id: profile?.id,
      legal_name: legalName.trim(),
      trading_name: tradingName.trim() || null,
      abn: abn.replace(/\s/g, '') || null,
      gst_registered_from: gstDate,
      bas_frequency: basFrequency,
    });
    await reload();
    onSaved();
  }

  return (
    <>
      <Field label="Legal name" value={legalName} onChangeText={setLegalName} error={errors.legalName} autoComplete="name" />
      <Field label="Trading name (optional)" value={tradingName} onChangeText={setTradingName} />
      <Field
        label="ABN"
        value={abn}
        onChangeText={setAbn}
        onBlur={() => isValidAbn(abn) && setAbn(formatAbn(abn))}
        keyboardType="number-pad"
        placeholder="12 345 678 901"
        error={errors.abn}
        hint="Your ABN is also your GST identifier."
      />
      <Toggle label="Registered for GST" value={gst} onChange={setGst} />
      {gst ? (
        <>
          <Field
            label="GST registered from"
            value={gstFrom}
            onChangeText={setGstFrom}
            placeholder="DD/MM/YYYY"
            keyboardType="numbers-and-punctuation"
            error={errors.gstFrom}
            hint="Rideshare drivers must be registered before their first Uber X trip."
          />
          <Choice
            label="BAS lodgement"
            value={basFrequency}
            onChange={setBasFrequency}
            options={[
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'annual', label: 'Annually' },
            ]}
          />
        </>
      ) : null}
      <Button title={submitLabel} onPress={submit} />
    </>
  );
}
