import type { AiTaxMechanisms, TaxBracket } from '@/types';

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
  combinedRate: number;
}

/** Token/energy/revenue-contribution/automation taxes on a Business_Owner's AI-attributed revenue. */
export function calculateBusinessAiTax(
  monthlyIncome: number,
  aiExposure: number,
  aiShieldFraction: number,
  mechanisms: AiTaxMechanisms,
): AiTaxResult {
  const combinedRate =
    (mechanisms.tokenTax.enabled ? mechanisms.tokenTax.rate : 0) +
    (mechanisms.energyTax.enabled ? mechanisms.energyTax.rate : 0) +
    (mechanisms.revenueContribution.enabled ? mechanisms.revenueContribution.rate : 0) +
    (mechanisms.automationTax.enabled ? mechanisms.automationTax.rate : 0);
  const totalAiRevenue = Math.max(0, monthlyIncome) * aiExposure;
  const taxableAiRevenue = totalAiRevenue * (1 - aiShieldFraction);
  const shieldedAiRevenue = totalAiRevenue * aiShieldFraction;
  return {
    owed: taxableAiRevenue * combinedRate,
    shieldedOwed: shieldedAiRevenue * combinedRate,
    combinedRate,
  };
}

/** Sanders-style equity capture on an HNW_Investor's AI-linked capital gains. */
export function calculateEquityCaptureTax(
  capitalReturn: number,
  aiExposure: number,
  aiShieldFraction: number,
  mechanisms: AiTaxMechanisms,
): AiTaxResult {
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
