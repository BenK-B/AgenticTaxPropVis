import type { BehaviorWeights, Policy } from '@/types';

export const TICK_INTERVAL_MS_BASE = 400; // at 1x speed
export const MAX_TICKS_PER_FRAME = 10;
export const HISTORY_LENGTH = 12;
export const BEHAVIOR_LOG_LENGTH = 50;
export const METRICS_HISTORY_LENGTH = 600;
export const DEFAULT_AGENT_COUNT = 2500;

export const FLASH_GREEN_MS = 250;
export const FLASH_RED_MS = 400;
export const FLASH_NEUTRAL_MS = 300;
export const FLIGHT_TICKS = 6;

/**
 * Semantic flash-color keys (not real CSS colors) — the engine has no UI dependency, so it
 * only labels *why* an agent is flashing. The renderer maps these to actual theme colors.
 */
export const FLASH_COLOR_GOOD = 'good';
export const FLASH_COLOR_CRITICAL = 'critical';
export const FLASH_COLOR_NEUTRAL = 'neutral';

export const DEFAULT_POLICY: Policy = {
  brackets: [
    { threshold: 0, rate: 0.12 },
    { threshold: 45000, rate: 0.24 },
    { threshold: 180000, rate: 0.37 },
  ],
  capitalGainsRate: 0.15,
  auditBudgetPct: 0.02,
  ubiPayout: 0,
  aiTaxMechanisms: {
    tokenTax: { enabled: false, rate: 0.1 },
    energyTax: { enabled: false, rate: 0.08 },
    revenueContribution: { enabled: false, rate: 0.05 },
    automationTax: { enabled: false, rate: 0.06 },
    equityCapture: { enabled: false, rate: 0.1 },
  },
};

export const DEFAULT_BEHAVIOR_WEIGHTS: BehaviorWeights = {
  avgTaxSensitivity: 0.5,
  riskAversion: 0.5,
};
