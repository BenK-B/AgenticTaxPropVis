import { describe, expect, it } from 'vitest';
import { calculateBracketTax, calculateBusinessAiTax, calculateEquityCaptureTax, marginalRateFor } from '../tax';
import {
  AI_USAGE_ELASTICITY,
  ENERGY_MARKET_PRICE_PER_KWH,
  ENERGY_UNITS_PER_DOLLAR_AI_REVENUE,
  TOKEN_MARKET_PRICE_PER_1K,
  TOKEN_UNITS_PER_DOLLAR_AI_REVENUE,
} from '../constants';
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
  equityCapture: { enabled: true, rate: 0.2, annualLiquidationPct: 0.08 },
};

// Independent reference calc for the usage-based (token/energy) mechanics, so the tests aren't
// just re-deriving the implementation's own formula.
function expectedQuantity(aiRevenue: number, rate: number, marketPrice: number, unitsPerDollar: number): number {
  const baseline = aiRevenue * unitsPerDollar;
  const priceRatio = marketPrice / (marketPrice + rate);
  return baseline * Math.pow(priceRatio, AI_USAGE_ELASTICITY);
}

describe('calculateBusinessAiTax', () => {
  it('taxes token/energy usage as a $/unit excise, not a % of revenue', () => {
    const aiRevenue = 1000 * 0.5; // monthlyIncome * aiExposure
    const result = calculateBusinessAiTax(1000, 0.5, 0, MECHANISMS_TWO_ENABLED);

    const expectedTokens = expectedQuantity(aiRevenue, 0.1, TOKEN_MARKET_PRICE_PER_1K, TOKEN_UNITS_PER_DOLLAR_AI_REVENUE);
    const expectedKwh = expectedQuantity(aiRevenue, 0.05, ENERGY_MARKET_PRICE_PER_KWH, ENERGY_UNITS_PER_DOLLAR_AI_REVENUE);

    expect(result.tokensUsed).toBeCloseTo(expectedTokens, 6);
    expect(result.kwhUsed).toBeCloseTo(expectedKwh, 6);
    expect(result.owed).toBeCloseTo(expectedTokens * 0.1 + expectedKwh * 0.05, 6);
    expect(result.shieldedOwed).toBe(0);
  });

  it('usage falls as the per-unit rate rises — the whole point of taxing a real resource', () => {
    const lowRateMechanisms = {
      ...MECHANISMS_TWO_ENABLED,
      tokenTax: { enabled: true, rate: 0.001 },
      energyTax: { enabled: false, rate: 0.05 },
    };
    const highRateMechanisms = {
      ...MECHANISMS_TWO_ENABLED,
      tokenTax: { enabled: true, rate: 0.05 },
      energyTax: { enabled: false, rate: 0.05 },
    };
    const low = calculateBusinessAiTax(1000, 0.5, 0, lowRateMechanisms);
    const high = calculateBusinessAiTax(1000, 0.5, 0, highRateMechanisms);
    expect(high.tokensUsed).toBeLessThan(low.tokensUsed);
  });

  it('a low rate on unchanged high usage can still out-collect a high rate that crushes usage', () => {
    // The whole premise: revenue = price * quantity, and quantity falls with price, so revenue
    // isn't simply proportional to the rate — a very high rate can collect less than a modest one.
    const veryHighRate = { ...MECHANISMS_TWO_ENABLED, tokenTax: { enabled: true, rate: 2 }, energyTax: { enabled: false, rate: 0.05 } };
    const modestRate = { ...MECHANISMS_TWO_ENABLED, tokenTax: { enabled: true, rate: 0.01 }, energyTax: { enabled: false, rate: 0.05 } };
    const veryHigh = calculateBusinessAiTax(1000, 0.5, 0, veryHighRate);
    const modest = calculateBusinessAiTax(1000, 0.5, 0, modestRate);
    expect(veryHigh.owed).toBeLessThan(modest.owed * 10); // nowhere near the naive 200x rate multiple
  });

  it('shifts owed tax to shieldedOwed (by quantity share) as aiShieldFraction grows, without changing real usage', () => {
    const unshielded = calculateBusinessAiTax(1000, 0.5, 0, MECHANISMS_TWO_ENABLED);
    const shielded = calculateBusinessAiTax(1000, 0.5, 0.4, MECHANISMS_TWO_ENABLED);
    // Shielding is a legal reclassification of liability, not a change in physical consumption.
    expect(shielded.tokensUsed).toBeCloseTo(unshielded.tokensUsed, 6);
    expect(shielded.kwhUsed).toBeCloseTo(unshielded.kwhUsed, 6);
    expect(shielded.owed).toBeCloseTo(unshielded.owed * 0.6, 6);
    expect(shielded.shieldedOwed).toBeCloseTo(unshielded.owed * 0.4, 6);
  });

  it('is zero when the agent has no AI exposure', () => {
    const result = calculateBusinessAiTax(1000, 0, 0, MECHANISMS_TWO_ENABLED);
    expect(result.owed).toBe(0);
    expect(result.tokensUsed).toBe(0);
    expect(result.kwhUsed).toBe(0);
  });

  it('disabled mechanisms still reflect full baseline usage (businesses use AI regardless of tax) but owe nothing', () => {
    const disabled = {
      ...MECHANISMS_TWO_ENABLED,
      tokenTax: { enabled: false, rate: 0.1 },
      energyTax: { enabled: false, rate: 0.05 },
    };
    const result = calculateBusinessAiTax(1000, 0.5, 0, disabled);
    const aiRevenue = 1000 * 0.5;
    expect(result.tokensUsed).toBeCloseTo(aiRevenue * TOKEN_UNITS_PER_DOLLAR_AI_REVENUE, 6);
    expect(result.kwhUsed).toBeCloseTo(aiRevenue * ENERGY_UNITS_PER_DOLLAR_AI_REVENUE, 6);
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
