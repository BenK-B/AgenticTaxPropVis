import type { Archetype, ArchetypeConfig } from '@/types';

export const ARCHETYPE_CONFIGS: Record<Archetype, ArchetypeConfig> = {
  W2_Worker: {
    archetype: 'W2_Worker',
    color: 'var(--archetype-w2)',
    incomeLogNormal: { mu: Math.log(55000), sigma: 0.4 },
    // Wide enough to include agents with little to no savings buffer (net worth well under a
    // year of income), not just multiples of it — real wealth/income correlation is loose,
    // especially near the bottom of the distribution.
    wealthMultiplierRange: [0.08, 2.2],
    savingsRate: 0.06,
    riskToleranceRange: [0.1, 0.5],
    taxSensitivityRange: [0.2, 0.6],
    aiExposureRange: [0, 0.08],
    flightEligible: false,
  },
  Freelancer: {
    archetype: 'Freelancer',
    color: 'var(--archetype-freelancer)',
    incomeLogNormal: { mu: Math.log(48000), sigma: 0.55 },
    wealthMultiplierRange: [0.06, 1.8],
    savingsRate: 0.05,
    riskToleranceRange: [0.3, 0.7],
    taxSensitivityRange: [0.3, 0.7],
    aiExposureRange: [0, 0.3],
    flightEligible: false,
  },
  Business_Owner: {
    archetype: 'Business_Owner',
    color: 'var(--archetype-business)',
    incomeLogNormal: { mu: Math.log(90000), sigma: 0.6 },
    wealthMultiplierRange: [3, 10],
    savingsRate: 0.3,
    riskToleranceRange: [0.4, 0.8],
    taxSensitivityRange: [0.4, 0.8],
    aiExposureRange: [0.1, 0.6],
    writeOffBase: 0.12,
    flightEligible: false,
  },
  HNW_Investor: {
    archetype: 'HNW_Investor',
    color: 'var(--archetype-hnw)',
    incomeLogNormal: { mu: Math.log(350000), sigma: 0.8 },
    wealthMultiplierRange: [8, 25],
    savingsRate: 0.5,
    riskToleranceRange: [0.3, 0.9],
    taxSensitivityRange: [0.5, 0.95],
    aiExposureRange: [0.1, 0.7],
    capitalReturnMonthly: { mean: 0.006, stdev: 0.02 },
    flightEligible: true,
  },
};

export const DEFAULT_ARCHETYPE_RATIOS: Record<Archetype, number> = {
  W2_Worker: 0.55,
  Freelancer: 0.2,
  Business_Owner: 0.15,
  HNW_Investor: 0.1,
};
