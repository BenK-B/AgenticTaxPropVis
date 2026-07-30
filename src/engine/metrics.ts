import type { Agent } from '@/types';

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
