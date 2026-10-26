// Row shapes as stored in SQLite (snake_case, cents, ISO dates).

export type Profile = {
  id: string;
  legal_name: string;
  trading_name: string | null;
  abn: string | null;
  gst_registered_from: string | null;
  bas_frequency: 'quarterly' | 'annual';
  onboarded: number;
};

export type OwnershipType = 'owned' | 'financed' | 'leased' | 'rented';

export type Vehicle = {
  id: string;
  name: string;
  rego: string | null;
  ownership_type: OwnershipType;
  start_odometer: number;
  purchase_date: string | null;
  purchase_price_cents: number | null;
  active_from: string;
  active_to: string | null;
};

export type ShiftPlan = {
  id: string;
  weekday: number; // 1 = Monday ... 7 = Sunday
  start_time: string;
  end_time: string;
};
