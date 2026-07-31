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
    savingsRate: 0.3,
    costOfLivingAnnualRange: [18000, 32000],
    riskToleranceRange: [0.1, 0.5],
    taxSensitivityRange: [0.2, 0.6],
    aiExposureRange: [0, 0.08],
    flightEligible: false,
    lifeShocks: {
      // Layoff/reduced hours: ~4-5%/year chance of entering, benefits/part-time pay for a
      // few months to over a year, matching real unemployment-spell durations.
      negativeIncomeShock: { pMonthly: 0.004, multiplierRange: [0.15, 0.4], durationMonthsRange: [2, 8] },
      // Raise, promotion, overtime run.
      positiveIncomeShock: { pMonthly: 0.006, multiplierRange: [1.15, 1.6], durationMonthsRange: [3, 12] },
      // Medical bill, car repair, other emergency expense.
      negativeWealthShock: { pMonthly: 0.01, monthsOfIncomeRange: [0.5, 3] },
      // Tax refund, gift, small inheritance.
      positiveWealthShock: { pMonthly: 0.006, monthsOfIncomeRange: [1, 6] },
    },
  },
  Freelancer: {
    archetype: 'Freelancer',
    color: 'var(--archetype-freelancer)',
    incomeLogNormal: { mu: Math.log(48000), sigma: 0.55 },
    wealthMultiplierRange: [0.06, 1.8],
    savingsRate: 0.25,
    costOfLivingAnnualRange: [17000, 30000],
    riskToleranceRange: [0.3, 0.7],
    taxSensitivityRange: [0.3, 0.7],
    aiExposureRange: [0, 0.3],
    flightEligible: false,
    lifeShocks: {
      // Dry spell / lost client — more frequent and sharper than W2 layoffs, but shorter.
      negativeIncomeShock: { pMonthly: 0.008, multiplierRange: [0.2, 0.5], durationMonthsRange: [1, 4] },
      // Landed a great contract / busy season.
      positiveIncomeShock: { pMonthly: 0.008, multiplierRange: [1.2, 1.8], durationMonthsRange: [1, 4] },
      negativeWealthShock: { pMonthly: 0.012, monthsOfIncomeRange: [0.5, 2.5] },
      positiveWealthShock: { pMonthly: 0.006, monthsOfIncomeRange: [1, 4] },
    },
  },
  Business_Owner: {
    archetype: 'Business_Owner',
    color: 'var(--archetype-business)',
    incomeLogNormal: { mu: Math.log(90000), sigma: 0.6 },
    wealthMultiplierRange: [3, 10],
    savingsRate: 0.5,
    costOfLivingAnnualRange: [26000, 46000],
    riskToleranceRange: [0.4, 0.8],
    taxSensitivityRange: [0.4, 0.8],
    aiExposureRange: [0.1, 0.6],
    writeOffBase: 0.12,
    flightEligible: false,
    lifeShocks: {
      // Rarer than a W2 layoff, but a real slump/near-failure and longer to recover from.
      negativeIncomeShock: { pMonthly: 0.003, multiplierRange: [0.1, 0.35], durationMonthsRange: [3, 12] },
      // Big contract win / expansion.
      positiveIncomeShock: { pMonthly: 0.004, multiplierRange: [1.2, 2], durationMonthsRange: [3, 9] },
      // Lawsuit, lost lease, equipment failure, needing a capital injection.
      negativeWealthShock: { pMonthly: 0.005, monthsOfIncomeRange: [1, 6] },
      // Acquisition offer, grant, major new client upfront payment.
      positiveWealthShock: { pMonthly: 0.004, monthsOfIncomeRange: [1, 8] },
    },
  },
  HNW_Investor: {
    archetype: 'HNW_Investor',
    color: 'var(--archetype-hnw)',
    incomeLogNormal: { mu: Math.log(350000), sigma: 0.8 },
    wealthMultiplierRange: [8, 25],
    savingsRate: 0.6,
    costOfLivingAnnualRange: [50000, 110000],
    riskToleranceRange: [0.3, 0.9],
    taxSensitivityRange: [0.5, 0.95],
    aiExposureRange: [0.1, 0.7],
    capitalReturnMonthly: { mean: 0.006, stdev: 0.02 },
    flightEligible: true,
    lifeShocks: {
      // Passive income is steadier, but a venture or board seat can still go sideways/upside.
      negativeIncomeShock: { pMonthly: 0.002, multiplierRange: [0.3, 0.6], durationMonthsRange: [2, 6] },
      positiveIncomeShock: { pMonthly: 0.003, multiplierRange: [1.2, 1.6], durationMonthsRange: [2, 6] },
      // Divorce settlement, lawsuit, failed venture write-down — sized off income (which for
      // this archetype is already large) so the hit scales with their means.
      negativeWealthShock: { pMonthly: 0.006, monthsOfIncomeRange: [2, 10] },
      positiveWealthShock: { pMonthly: 0.004, monthsOfIncomeRange: [2, 12] },
    },
  },
};

export const DEFAULT_ARCHETYPE_RATIOS: Record<Archetype, number> = {
  W2_Worker: 0.55,
  Freelancer: 0.2,
  Business_Owner: 0.15,
  HNW_Investor: 0.1,
};
