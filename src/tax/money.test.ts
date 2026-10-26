import { describe, expect, test } from '@jest/globals';
import { basQuarter } from './dates';
import {
  basSummary,
  businessFraction,
  deductible,
  gstCredit,
  gstFromInclusive,
  isGstActive,
  type Earning,
  type Expense,
} from './money';

const registered = { gstRegisteredFrom: '2026-12-01' };
const pcts = { car: 0.8 };

function expense(over: Partial<Expense>): Expense {
  return {
    date: '2027-01-10',
    vehicleId: 'car',
    amountCents: 11000,
    gstCents: 1000,
    businessRule: 'vehicle_pct',
    customPct: null,
    ...over,
  };
}

function earning(over: Partial<Earning>): Earning {
  return {
    weekStart: '2027-01-04',
    grossFaresCents: 110000,
    tipsCents: 2000,
    incentivesCents: 5500,
    tollsReimbursedCents: 1100,
    serviceFeeCents: 27500,
    gstCents: 10000,
    ...over,
  };
}

test('gstFromInclusive rounds to the cent', () => {
  expect(gstFromInclusive(11000)).toBe(1000);
  expect(gstFromInclusive(1999)).toBe(182); // 181.73
  expect(gstFromInclusive(0)).toBe(0);
});

test('isGstActive starts on the registration date', () => {
  expect(isGstActive('2026-11-30', registered)).toBe(false);
  expect(isGstActive('2026-12-01', registered)).toBe(true);
  expect(isGstActive('2030-01-01', { gstRegisteredFrom: null })).toBe(false);
});

describe('businessFraction', () => {
  test.each([
    [{ businessRule: 'full' }, 1],
    [{ businessRule: 'custom', customPct: 0.6 }, 0.6],
    [{ businessRule: 'vehicle_pct' }, 0.8],
    [{ businessRule: 'vehicle_pct', vehicleId: 'unknown' }, 0],
    [{ businessRule: 'vehicle_pct', vehicleId: null }, 0],
  ] as const)('%j', (over, expected) => {
    expect(businessFraction(expense(over), pcts)).toBe(expected);
  });
});

describe('deductible and GST credit', () => {
  test('after registration: GST excluded from deduction, claimed as credit', () => {
    const e = expense({});
    expect(deductible(e, pcts, registered)).toBe(8000); // (11000 - 1000) * 0.8
    expect(gstCredit(e, pcts, registered)).toBe(800);
  });

  test('before registration: full price deductible, no credit', () => {
    const e = expense({ date: '2026-11-30' });
    expect(deductible(e, pcts, registered)).toBe(8800);
    expect(gstCredit(e, pcts, registered)).toBe(0);
  });

  test('rounds apportioned amounts to the cent', () => {
    const e = expense({ amountCents: 1999, gstCents: 182, businessRule: 'custom', customPct: 1 / 3 });
    expect(deductible(e, pcts, registered)).toBe(606); // 1817 / 3 = 605.67
    expect(gstCredit(e, pcts, registered)).toBe(61); // 60.67
  });
});

describe('basSummary', () => {
  const q = basQuarter('2027-01-01'); // Jan–Mar 2027

  test('G1, 1A and 1B for a quarter', () => {
    const bas = basSummary(q, [earning({})], [expense({}), expense({ businessRule: 'full' })], pcts, registered);
    expect(bas).toEqual({
      G1: 110000 + 5500 + 1100,
      '1A': 10000,
      '1B': 800 + 1000 + 2500, // vehicle % credit + full credit + service fee GST (27500 / 11)
    });
  });

  test('excludes activity outside the quarter and before registration', () => {
    const before = { gstRegisteredFrom: '2027-02-01' };
    const bas = basSummary(
      q,
      [earning({ weekStart: '2027-01-25' }), earning({ weekStart: '2027-04-05' })],
      [expense({ date: '2027-01-31' }), expense({ date: '2026-12-31' })],
      pcts,
      before,
    );
    expect(bas).toEqual({ G1: 0, '1A': 0, '1B': 0 });
  });
});
