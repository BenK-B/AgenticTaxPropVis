import type { MetricsSnapshot } from '@/types';

/**
 * Capital gains, equity-capture, and equity-fund-liquidation revenue settle once a sim-year
 * (see tick.ts) rather than smoothly every tick, so a raw single-tick read of these flow metrics
 * spikes ~4-10x on the settlement tick and reads as ~0 the other 11 months. Rolling this over a
 * trailing 12-tick window turns that sawtooth into the smooth annual run-rate it actually
 * represents, without changing anything about how/when the underlying tax is actually collected.
 */
export const TRAILING_ANNUAL_TICKS = 12;

const FLOW_METRIC_KEYS = [
  'taxRevenueCollected',
  'taxRevenueEvaded',
  'taxRevenueAvoided',
  'aiTaxRevenueCollected',
  'ubiPaidOut',
] as const;

type FlowMetricKey = (typeof FLOW_METRIC_KEYS)[number];

export type TrailingAnnualPoint = Record<FlowMetricKey, number> & {
  tick: number;
  activeAgentCount: number;
};

/** Trailing 12-tick sum of each flow metric, computed at every point in `history` (windows near
 * the start of the array are shorter than 12 ticks — an early partial-year sum, not zero-padded). */
export function trailingAnnualSeries(history: MetricsSnapshot[]): TrailingAnnualPoint[] {
  return history.map((point, i) => {
    const windowStart = Math.max(0, i - (TRAILING_ANNUAL_TICKS - 1));
    const sums = { tick: point.tick, activeAgentCount: point.activeAgentCount } as TrailingAnnualPoint;
    for (const key of FLOW_METRIC_KEYS) sums[key] = 0;
    for (let j = windowStart; j <= i; j++) {
      const m = history[j];
      for (const key of FLOW_METRIC_KEYS) sums[key] += m[key];
    }
    return sums;
  });
}
