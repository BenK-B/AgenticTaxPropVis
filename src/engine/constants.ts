import type { BehaviorWeights, Policy } from '@/types';

export const TICK_INTERVAL_MS_BASE = 400; // at 1x speed
export const MAX_TICKS_PER_FRAME = 10;
export const HISTORY_LENGTH = 12;
export const BEHAVIOR_LOG_LENGTH = 50;
export const METRICS_HISTORY_LENGTH = 600;
export const DEFAULT_AGENT_COUNT = 2500;

export const FLASH_RED_MS = 400;
export const FLASH_NEUTRAL_MS = 300;
export const FLASH_EVENT_MS = 350;
export const FLIGHT_TICKS = 6;

/** 1 tick = 1 sim month, so the equity fund sells off a slice of its holdings every 12 ticks. */
export const EQUITY_FUND_LIQUIDATION_INTERVAL_TICKS = 12;

/**
 * Token/energy taxes are real per-unit excises (like a carbon tax), not a % of revenue: raising
 * the rate raises the price of a token/kWh, and usage responds to that price. AI_USAGE_ELASTICITY
 * controls how sharply usage falls as price rises: quantityUsed = baselineQuantity *
 * (marketPrice / (marketPrice + taxRate)) ^ AI_USAGE_ELASTICITY — 0 would mean no behavioral
 * response at all (usage fixed regardless of price), higher values mean businesses cut back
 * harder as the tax bites.
 */
export const AI_USAGE_ELASTICITY = 0.8;

/**
 * Baseline compute-intensity/market-price assumptions used to convert a Business_Owner's
 * AI-attributed dollar revenue into physical token/kWh quantities absent any tax. Loosely
 * pinned to plausible 2026 API/electricity pricing — illustrative, not a precise industry figure.
 */
export const TOKEN_MARKET_PRICE_PER_1K = 0.01; // $ per 1,000 tokens, blended input/output
export const TOKEN_UNITS_PER_DOLLAR_AI_REVENUE = 5; // 1,000-token units consumed per $1 of AI-attributed revenue
export const ENERGY_MARKET_PRICE_PER_KWH = 0.15; // $ per kWh
export const ENERGY_UNITS_PER_DOLLAR_AI_REVENUE = 0.3; // kWh consumed per $1 of AI-attributed revenue

/** Approximate annual individual poverty threshold (rounded from real US federal guidelines),
 * used as a wealth/net-worth reference line on the canvas — not a precise legal figure. */
export const POVERTY_LINE_ANNUAL = 15000;

/**
 * Semantic flash-color keys (not real CSS colors) — the engine has no UI dependency, so it
 * only labels *why* an agent is flashing. The renderer maps these to actual theme colors.
 * Reserved for genuinely rare, notable per-agent events (audits, behavioral state changes) —
 * deliberately NOT used for routine per-tick activity like earning income, since something
 * every active agent does every tick isn't a distinguishing signal and just reads as noise.
 */
export const FLASH_COLOR_CRITICAL = 'critical';
export const FLASH_COLOR_NEUTRAL = 'neutral';
export const FLASH_COLOR_WARNING = 'warning';
export const FLASH_COLOR_AI_SHIELD = 'ai_shield';
export const FLASH_COLOR_FLIGHT = 'flight';
export const FLASH_COLOR_GOOD = 'good';

export const DEFAULT_POLICY: Policy = {
  brackets: [
    { threshold: 0, rate: 0.12 },
    { threshold: 45000, rate: 0.24 },
    { threshold: 180000, rate: 0.37 },
  ],
  capitalGainsRate: 0.15,
  auditBudgetPct: 0.02,
  ubi: { enabled: false, taperStrength: 0 },
  aiTaxMechanisms: {
    tokenTax: { enabled: false, rate: 0.005 }, // $/1,000 tokens (~half the baseline market price)
    energyTax: { enabled: false, rate: 0.05 }, // $/kWh (~1/3 the baseline market price)
    revenueContribution: { enabled: false, rate: 0.05 },
    automationTax: { enabled: false, rate: 0.06 },
    equityCapture: { enabled: false, rate: 0.1, annualLiquidationPct: 0.08 },
  },
};

export const DEFAULT_BEHAVIOR_WEIGHTS: BehaviorWeights = {
  avgTaxSensitivity: 0.5,
  riskAversion: 0.5,
};
