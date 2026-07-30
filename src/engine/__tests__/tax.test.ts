import { describe, expect, it } from 'vitest';
import { calculateBracketTax, calculateBusinessAiTax, calculateEquityCaptureTax, marginalRateFor } from '../tax';
import type { TaxBracket } from '@/types';

const BRACKETS: [TaxBracket, TaxBracket, TaxBracket] = [
  { threshold: 0, rate: 0.1 },
  { threshold: 12000, rate: 0.2 },
  { threshold: 60000, rate: 0.3 },
];

describe('calculateBracketTax', () => {
  it('taxes income within the base bracket at the base rate', () => {
    expect(calculateBracketTax(500, BRACKETS)).toBeCloseTo(50, 6);
  });

  it('taxes income spanning two brackets progressively, not flatly', () => {
    // monthly thresholds: 0, 1000, 5000
    expect(calculateBracketTax(2000, BRACKETS)).toBeCloseTo(1000 * 0.1 + 1000 * 0.2, 6);
  });

  it('does not apply the next bracket when income lands exactly on its threshold', () => {
    expect(calculateBracketTax(1000, BRACKETS)).toBeCloseTo(1000 * 0.1, 6);
  });

  it('returns 0 for zero or negative income', () => {
    expect(calculateBracketTax(0, BRACKETS)).toBe(0);
    expect(calculateBracketTax(-500, BRACKETS)).toBe(0);
  });
});

describe('marginalRateFor', () => {
  it('returns the base rate below all thresholds', () => {
    expect(marginalRateFor(200, BRACKETS)).toBe(0.1);
  });

  it('returns the base rate exactly at the next threshold (strictly-greater semantics)', () => {
    expect(marginalRateFor(1000, BRACKETS)).toBe(0.1);
  });

  it('returns the top bracket rate once income exceeds the top threshold', () => {
    expect(marginalRateFor(10000, BRACKETS)).toBe(0.3);
  });
});

const MECHANISMS_TWO_ENABLED = {
  tokenTax: { enabled: true, rate: 0.1 },
  energyTax: { enabled: true, rate: 0.05 },
  revenueContribution: { enabled: false, rate: 0.05 },
  automationTax: { enabled: false, rate: 0.06 },
  equityCapture: { enabled: true, rate: 0.2 },
};

describe('calculateBusinessAiTax', () => {
  it('sums only enabled mechanism rates and applies them to AI-attributed revenue', () => {
    const result = calculateBusinessAiTax(1000, 0.5, 0, MECHANISMS_TWO_ENABLED);
    expect(result.combinedRate).toBeCloseTo(0.15, 6); // tokenTax + energyTax, not equityCapture
    expect(result.owed).toBeCloseTo(1000 * 0.5 * 0.15, 6);
    expect(result.shieldedOwed).toBe(0);
  });

  it('shifts owed tax to shieldedOwed as aiShieldFraction grows', () => {
    const result = calculateBusinessAiTax(1000, 0.5, 0.4, MECHANISMS_TWO_ENABLED);
    const totalAiRevenue = 1000 * 0.5;
    expect(result.owed).toBeCloseTo(totalAiRevenue * 0.6 * 0.15, 6);
    expect(result.shieldedOwed).toBeCloseTo(totalAiRevenue * 0.4 * 0.15, 6);
  });

  it('is zero when the agent has no AI exposure', () => {
    const result = calculateBusinessAiTax(1000, 0, 0, MECHANISMS_TWO_ENABLED);
    expect(result.owed).toBe(0);
  });
});

describe('calculateEquityCaptureTax', () => {
  it('only applies when equityCapture is enabled', () => {
    const result = calculateEquityCaptureTax(2000, 0.6, 0, MECHANISMS_TWO_ENABLED);
    expect(result.combinedRate).toBeCloseTo(0.2, 6);
    expect(result.owed).toBeCloseTo(2000 * 0.6 * 0.2, 6);
  });

  it('ignores negative capital returns rather than paying out a negative tax', () => {
    const result = calculateEquityCaptureTax(-500, 0.6, 0, MECHANISMS_TWO_ENABLED);
    expect(result.owed).toBe(0);
  });
});
