import { expect, test } from '@jest/globals';
import { taxYear } from './taxYear';

test('tax year boundary at 1 July', () => {
  expect(taxYear(new Date(2026, 5, 30))).toBe('2025-26');
  expect(taxYear(new Date(2026, 6, 1))).toBe('2026-27');
  expect(taxYear(new Date(2026, 9, 26))).toBe('2026-27');
});
