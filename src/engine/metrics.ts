import type { Agent } from '@/types';
import { POVERTY_LINE_ANNUAL, POVERTY_LINE_GROWTH_RATE_ANNUAL } from './constants';

/** Poverty line, compounded smoothly from POVERTY_LINE_ANNUAL at POVERTY_LINE_GROWTH_RATE_ANNUAL
 * per (12-tick) sim year — 1 tick = 1 sim month, so growth is applied per-tick as the 12th root
 * of the annual rate to avoid a once-a-year discontinuity in who counts as below the line. */
export function povertyLineAtTick(tick: number): number {
  return POVERTY_LINE_ANNUAL * (1 + POVERTY_LINE_GROWTH_RATE_ANNUAL) ** (tick / 12);
}

/** Standard Gini coefficient over all agents' wealth (active + fled — still real wealth). */
export function computeGini(agents: Agent[]): number {
  const n = agents.length;
  if (n === 0) return 0;
  const wealths = agents.map((agent) => Math.max(0, agent.wealth)).sort((a, b) => a - b);
  const total = wealths.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return 0;
  let weightedSum = 0;
  for (let i = 0; i < n; i++) {
    weightedSum += (2 * (i + 1) - n - 1) * wealths[i];
  }
  return weightedSum / (n * total);
}

/** Cumulative share of total wealth currently held by agents who have fully exited the active economy. */
export function computeCapitalFlightRate(agents: Agent[]): number {
  const totalWealth = agents.reduce((sum, agent) => sum + Math.max(0, agent.wealth), 0);
  if (totalWealth <= 0) return 0;
  const fledWealth = agents
    .filter((agent) => !agent.isActiveInEconomy)
    .reduce((sum, agent) => sum + Math.max(0, agent.wealth), 0);
  return fledWealth / totalWealth;
}
