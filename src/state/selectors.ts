import { useSimStore } from './useSimStore';

export function useLatestMetrics() {
  return useSimStore((state) => state.metricsHistory[state.metricsHistory.length - 1] ?? null);
}

export function usePlayback() {
  return useSimStore((state) => state.playback);
}
