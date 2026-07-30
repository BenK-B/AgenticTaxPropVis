import type { Agent, Archetype } from '@/types';
import type { RNG } from './random';
import { logNormal, uniform, weightedChoice } from './random';
import { ARCHETYPE_CONFIGS } from './archetypes';

/**
 * Archetype mix + income/wealth distributions per archetype; initial canvas position is a
 * light random scatter (not pre-clustered) so wealth-zone clustering visibly emerges over the
 * first several ticks. Deterministic given the same rng seed, count, and ratios.
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
    const startPosition = { x: rng(), y: rng() };

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
      aiShieldFraction: 0,
      position: startPosition,
      velocity: { x: 0, y: 0 },
      targetPosition: startPosition,
      flashUntil: 0,
      flashColor: '',
      history: [],
      behaviorLog: [],
    });
  }
  return agents;
}
