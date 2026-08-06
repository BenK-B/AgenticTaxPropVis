import type { MetricsSnapshot } from '@/types';
import { useSimStore } from './useSimStore';
import { trailingAnnualSeries, TRAILING_ANNUAL_TICKS, type TrailingAnnualPoint } from './annualize';

export function useLatestMetrics() {
  return useSimStore((state) => state.metricsHistory[state.metricsHistory.length - 1] ?? null);
}

// useSyncExternalStore (which useSimStore's hook is built on) requires a selector to return the
// *same* reference across calls when the underlying state hasn't changed — otherwise React can't
// tell a real update from selector noise and trips its "Maximum update depth exceeded" infinite-
// loop guard. Recomputing a fresh object every call (as trailingAnnualSeries does) violates that,
// so cache the result per metricsHistory array identity, which only changes on an actual tick.
const trailingAnnualCache = new WeakMap<MetricsSnapshot[], TrailingAnnualPoint | null>();

/** Trailing 12-tick sum of the annually-settled flow metrics (tax revenue, UBI) as of the latest
 * tick — smooths out the once-a-year settlement spike (see annualize.ts) for KPI tiles that would
 * otherwise flash a misleading number on the settlement month. */
export function useTrailingAnnualMetrics(): TrailingAnnualPoint | null {
  return useSimStore((state) => {
    const { metricsHistory } = state;
    const cached = trailingAnnualCache.get(metricsHistory);
    if (cached !== undefined) return cached;
    const result =
      metricsHistory.length === 0
        ? null
        : trailingAnnualSeries(metricsHistory.slice(-TRAILING_ANNUAL_TICKS)).at(-1)!;
    trailingAnnualCache.set(metricsHistory, result);
    return result;
  });
}

export function usePlayback() {
  return useSimStore((state) => state.playback);
}
