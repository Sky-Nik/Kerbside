import { inPeriod, type ISODate, type Period } from './dates';

// All money is integer cents. Percentages are fractions 0..1.

export type GstProfile = { gstRegisteredFrom: ISODate | null };

export function isGstActive(date: ISODate, profile: GstProfile): boolean {
  return profile.gstRegisteredFrom !== null && date >= profile.gstRegisteredFrom;
}

// GST included in a GST-inclusive price is 1/11 of it.
export function gstFromInclusive(cents: number): number {
  return Math.round(cents / 11);
}

export type Earning = {
  weekStart: ISODate;
  grossFaresCents: number; // GST-inclusive fares / delivery fees
  tipsCents: number;
  incentivesCents: number;
  tollsReimbursedCents: number;
  serviceFeeCents: number; // Uber's fee, a business expense with GST credit
  gstCents: number; // GST collected on sales, editable by the user
};

export type BusinessRule = 'vehicle_pct' | 'full' | 'custom';

export type Expense = {
  date: ISODate;
  vehicleId: string | null;
  amountCents: number; // GST-inclusive
  gstCents: number;
  businessRule: BusinessRule;
  customPct: number | null;
};

// vehiclePcts: business-use fraction per vehicle id, from its logbook period.
export type VehiclePcts = Record<string, number>;

export function businessFraction(e: Expense, vehiclePcts: VehiclePcts): number {
  if (e.businessRule === 'full') return 1;
  if (e.businessRule === 'custom') return e.customPct ?? 0;
  return e.vehicleId ? (vehiclePcts[e.vehicleId] ?? 0) : 0;
}

// Deductible for income tax. Once GST-registered the GST is claimed back on the BAS,
// so it is excluded here; before registration the full price is the cost.
export function deductible(e: Expense, vehiclePcts: VehiclePcts, profile: GstProfile): number {
  const net = isGstActive(e.date, profile) ? e.amountCents - e.gstCents : e.amountCents;
  return Math.round(net * businessFraction(e, vehiclePcts));
}

export function gstCredit(e: Expense, vehiclePcts: VehiclePcts, profile: GstProfile): number {
  if (!isGstActive(e.date, profile)) return 0;
  return Math.round(e.gstCents * businessFraction(e, vehiclePcts));
}

export type Bas = { G1: number; '1A': number; '1B': number };

// BAS figures in cents for one period; only activity on or after GST registration counts.
// ponytail: tips excluded from G1 (treated as gifts, not sales). Confirm with the ATO and
// add them here if they turn out to be part of total sales.
export function basSummary(
  period: Period,
  earnings: Earning[],
  expenses: Expense[],
  vehiclePcts: VehiclePcts,
  profile: GstProfile,
): Bas {
  const sales = earnings.filter((e) => inPeriod(e.weekStart, period) && isGstActive(e.weekStart, profile));
  const buys = expenses.filter((e) => inPeriod(e.date, period));

  const G1 = sales.reduce((s, e) => s + e.grossFaresCents + e.incentivesCents + e.tollsReimbursedCents, 0);
  const A1 = sales.reduce((s, e) => s + e.gstCents, 0);
  const serviceFeeCredits = sales.reduce((s, e) => s + gstFromInclusive(e.serviceFeeCents), 0);
  const B1 = buys.reduce((s, e) => s + gstCredit(e, vehiclePcts, profile), serviceFeeCredits);

  return { G1, '1A': A1, '1B': B1 };
}
