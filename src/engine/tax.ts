import type { AiTaxMechanisms, TaxBracket } from '@/types';
import {
  AI_USAGE_ELASTICITY,
  ENERGY_MARKET_PRICE_PER_KWH,
  ENERGY_UNITS_PER_DOLLAR_AI_REVENUE,
  TOKEN_MARKET_PRICE_PER_1K,
  TOKEN_UNITS_PER_DOLLAR_AI_REVENUE,
} from './constants';

/** Progressive tax on monthly income; brackets store annual thresholds, divided by 12 here. */
export function calculateBracketTax(monthlyTaxableIncome: number, brackets: readonly TaxBracket[]): number {
  if (monthlyTaxableIncome <= 0) return 0;
  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const lower = brackets[i].threshold / 12;
    const upper = i + 1 < brackets.length ? brackets[i + 1].threshold / 12 : Infinity;
    if (monthlyTaxableIncome > lower) {
      tax += (Math.min(monthlyTaxableIncome, upper) - lower) * brackets[i].rate;
    }
  }
  return tax;
}

export function marginalRateFor(monthlyTaxableIncome: number, brackets: readonly TaxBracket[]): number {
  let rate = brackets[0].rate;
  for (const bracket of brackets) {
    if (monthlyTaxableIncome > bracket.threshold / 12) rate = bracket.rate;
  }
  return rate;
}

export interface AiTaxResult {
  /** Tax actually owed after the agent's current shield fraction is applied. */
  owed: number;
  /** Tax that would have been owed on the shielded portion — legal avoidance, not evasion. */
  shieldedOwed: number;
  /**
   * Blended effective rate (tax owed as a fraction of AI-attributed revenue) — used only as a
   * dimensionless pressure signal for the shielding/restructuring decision and its log message.
   * tokenTax/energyTax contribute their realized effective rate (which itself falls as usage
   * responds to price), not their nominal $/unit rate.
   */
  combinedRate: number;
  /** 1,000-token units actually consumed this tick (before shielding — shielding is a legal
   * reclassification of tax liability, not a change in real usage). */
  tokensUsed: number;
  /** kWh actually consumed this tick (before shielding). */
  kwhUsed: number;
}

interface UsageBasedTaxResult {
  owed: number;
  shieldedOwed: number;
  effectiveRate: number;
  quantityUsed: number;
}

/**
 * A real per-unit excise (like a carbon tax), not a % of revenue: `rate` is $ per unit
 * (1,000 tokens, or kWh). Usage isn't fixed — it responds to the price the tax creates, so a low
 * rate collects more revenue from unchanged high usage, while a high rate collects less per-unit
 * revenue than a naive linear projection because it also shrinks the quantity consumed.
 */
function calculateUsageBasedAiTax(
  aiAttributedRevenue: number,
  aiShieldFraction: number,
  enabled: boolean,
  ratePerUnit: number,
  marketPricePerUnit: number,
  unitsPerDollarOfRevenue: number,
): UsageBasedTaxResult {
  const baselineQuantity = Math.max(0, aiAttributedRevenue) * unitsPerDollarOfRevenue;
  if (!enabled || baselineQuantity <= 0) {
    return { owed: 0, shieldedOwed: 0, effectiveRate: 0, quantityUsed: baselineQuantity };
  }
  const priceRatio = marketPricePerUnit / (marketPricePerUnit + ratePerUnit);
  const quantityUsed = baselineQuantity * Math.pow(priceRatio, AI_USAGE_ELASTICITY);
  const taxableQuantity = quantityUsed * (1 - aiShieldFraction);
  const shieldedQuantity = quantityUsed * aiShieldFraction;
  const owed = taxableQuantity * ratePerUnit;
  const shieldedOwed = shieldedQuantity * ratePerUnit;
  return {
    owed,
    shieldedOwed,
    effectiveRate: aiAttributedRevenue > 0 ? owed / aiAttributedRevenue : 0,
    quantityUsed,
  };
}

/** Token/energy/revenue-contribution/automation taxes on a Business_Owner's AI-attributed revenue. */
export function calculateBusinessAiTax(
  monthlyIncome: number,
  aiExposure: number,
  aiShieldFraction: number,
  mechanisms: AiTaxMechanisms,
): AiTaxResult {
  const aiAttributedRevenue = Math.max(0, monthlyIncome) * aiExposure;

  const token = calculateUsageBasedAiTax(
    aiAttributedRevenue,
    aiShieldFraction,
    mechanisms.tokenTax.enabled,
    mechanisms.tokenTax.rate,
    TOKEN_MARKET_PRICE_PER_1K,
    TOKEN_UNITS_PER_DOLLAR_AI_REVENUE,
  );
  const energy = calculateUsageBasedAiTax(
    aiAttributedRevenue,
    aiShieldFraction,
    mechanisms.energyTax.enabled,
    mechanisms.energyTax.rate,
    ENERGY_MARKET_PRICE_PER_KWH,
    ENERGY_UNITS_PER_DOLLAR_AI_REVENUE,
  );

  // Revenue contribution and automation tax remain ad valorem (a % of AI-attributed revenue) —
  // unlike token/energy tax, they aren't taxing a physical, substitutable resource.
  const adValoremRate =
    (mechanisms.revenueContribution.enabled ? mechanisms.revenueContribution.rate : 0) +
    (mechanisms.automationTax.enabled ? mechanisms.automationTax.rate : 0);
  const adValoremOwed = aiAttributedRevenue * (1 - aiShieldFraction) * adValoremRate;
  const adValoremShielded = aiAttributedRevenue * aiShieldFraction * adValoremRate;

  return {
    owed: token.owed + energy.owed + adValoremOwed,
    shieldedOwed: token.shieldedOwed + energy.shieldedOwed + adValoremShielded,
    combinedRate: token.effectiveRate + energy.effectiveRate + adValoremRate,
    tokensUsed: token.quantityUsed,
    kwhUsed: energy.quantityUsed,
  };
}

export interface EquityCaptureResult {
  owed: number;
  shieldedOwed: number;
  combinedRate: number;
}

/** Sanders-style equity capture on an HNW_Investor's AI-linked capital gains. */
export function calculateEquityCaptureTax(
  capitalReturn: number,
  aiExposure: number,
  aiShieldFraction: number,
  mechanisms: AiTaxMechanisms,
): EquityCaptureResult {
  const combinedRate = mechanisms.equityCapture.enabled ? mechanisms.equityCapture.rate : 0;
  const totalAiReturn = Math.max(0, capitalReturn) * aiExposure;
  const taxableAiReturn = totalAiReturn * (1 - aiShieldFraction);
  const shieldedAiReturn = totalAiReturn * aiShieldFraction;
  return {
    owed: taxableAiReturn * combinedRate,
    shieldedOwed: shieldedAiReturn * combinedRate,
    combinedRate,
  };
}
