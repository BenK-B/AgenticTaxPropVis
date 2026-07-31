import type { Agent, Archetype } from '@/types';
import type { RNG } from './random';
import { logNormal, uniform, weightedChoice } from './random';
import { ARCHETYPE_CONFIGS } from './archetypes';
import { computeTargetPosition } from './position';

/**
 * Archetype mix + income/wealth distributions per archetype. Canvas position is set to each
 * agent's real wealth-percentile cluster immediately (via the same computeTargetPosition tick()
 * uses), not a random scatter — a scatter start meant the pre-play canvas (and the poverty-line
 * overlay's below-the-line dot count) reflected pure position noise, not actual wealth, which
 * looked like a mass exodus from poverty the instant the sim started as agents animated from
 * their random spot to their true cluster. Deterministic given the same rng seed, count, ratios.
 */
export function seedAgents(count: number, archetypeRatios: Record<Archetype, number>, rng: RNG): Agent[] {
  const agents: Agent[] = [];
  for (let i = 0; i < count; i++) {
    const archetype = weightedChoice(rng, archetypeRatios);
    const config = ARCHETYPE_CONFIGS[archetype];

    const income = logNormal(rng, config.incomeLogNormal.mu, config.incomeLogNormal.sigma);
    const wealthMultiplier = uniform(rng, config.wealthMultiplierRange[0], config.wealthMultiplierRange[1]);
    const wealth = income * wealthMultiplier * uniform(rng, 0.7, 1.3);
    const riskTolerance = uniform(rng, config.riskToleranceRange[0], config.riskToleranceRange[1]);
    const taxSensitivity = uniform(rng, config.taxSensitivityRange[0], config.taxSensitivityRange[1]);
    const aiExposure = uniform(rng, config.aiExposureRange[0], config.aiExposureRange[1]);
    const costOfLivingAnnual = uniform(rng, config.costOfLivingAnnualRange[0], config.costOfLivingAnnualRange[1]);

    agents.push({
      id: `agent-${i}`,
      archetype,
      income,
      wealth,
      riskTolerance,
      taxSensitivity,
      complianceStatus: 'compliant',
      evasionFraction: 0,
      isActiveInEconomy: true,
      flightProgress: 0,
      auditCooldownUntil: 0,
      aiExposure,
      costOfLivingAnnual,
      pendingCapitalGain: 0,
      distressMonthsRemaining: 0,
      aiShieldFraction: 0,
      incomeShockMultiplier: 1,
      incomeShockMonthsRemaining: 0,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      targetPosition: { x: 0, y: 0 },
      flashUntil: 0,
      flashColor: '',
      history: [],
      behaviorLog: [],
    });
  }

  const sortedByWealth = [...agents].sort((a, b) => a.wealth - b.wealth);
  const n = sortedByWealth.length;
  for (let i = 0; i < n; i++) {
    const agent = sortedByWealth[i];
    const wealthPercentile = n > 1 ? i / (n - 1) : 0.5;
    computeTargetPosition(agent, wealthPercentile);
    agent.position = { ...agent.targetPosition };
  }

  return agents;
}
