import type { Agent, Policy } from '@/types';
import type { RNG } from './random';
import { shuffle } from './random';
import { ARCHETYPE_CONFIGS } from './archetypes';

export interface AuditOutcome {
  agentId: string;
  /** Direct reference, so callers don't need to rebuild an id->agent lookup structure. */
  agent: Agent;
  wasEvading: boolean;
  caught: boolean;
  fine: number;
}

const FINE_MULTIPLIER = 1.75;
const AUDIT_COOLDOWN_TICKS = 6;
const PRIORITY_SHARE = 0.7;
/**
 * Real audit selection relies on imperfect observable risk signals (DIF-style scoring), not
 * omniscient knowledge of who's actually cheating — this is the chance a true evader looks
 * suspicious enough pre-audit to land in the priority pool at all. The rest blend in with
 * everyone else and are only reachable via general (effectively random) selection.
 */
const EVADER_FLAG_DETECTION_CHANCE = 0.55;

/**
 * Population-level audit pass, once per tick. `evadedTaxThisTick` maps agentId -> the tax
 * amount they actually withheld this tick (computed during the tax step) — an agent who just
 * started evading this tick has no entry yet, so they can't be "caught" for something that
 * hasn't happened. Mutates caught agents' wealth/complianceStatus/auditCooldownUntil in place.
 */
export function runAudits(
  agents: Agent[],
  policy: Policy,
  tick: number,
  evadedTaxThisTick: Map<string, number>,
  rng: RNG,
): AuditOutcome[] {
  const active = agents.filter((agent) => agent.isActiveInEconomy);
  const numAudited = Math.round(active.length * policy.auditBudgetPct);
  if (numAudited <= 0) return [];

  const flaggedPool = shuffle(
    active.filter(
      (agent) =>
        (evadedTaxThisTick.get(agent.id) ?? 0) > 0 &&
        tick >= agent.auditCooldownUntil &&
        rng() < EVADER_FLAG_DETECTION_CHANCE,
    ),
    rng,
  );
  const priority = flaggedPool.slice(0, Math.floor(numAudited * PRIORITY_SHARE));
  const priorityIds = new Set(priority.map((agent) => agent.id));
  const remainderCount = Math.max(0, numAudited - priority.length);
  const general = shuffle(
    active.filter((agent) => !priorityIds.has(agent.id)),
    rng,
  ).slice(0, remainderCount);

  const outcomes: AuditOutcome[] = [];
  for (const agent of [...priority, ...general]) {
    const evaded = evadedTaxThisTick.get(agent.id) ?? 0;
    if (evaded <= 0) {
      outcomes.push({ agentId: agent.id, agent, wasEvading: false, caught: false, fine: 0 });
      continue;
    }
    const detectionRate = ARCHETYPE_CONFIGS[agent.archetype].auditDetectionRate;
    const caught = rng() < detectionRate;
    if (!caught) {
      outcomes.push({ agentId: agent.id, agent, wasEvading: true, caught: false, fine: 0 });
      continue;
    }
    const fine = evaded * FINE_MULTIPLIER;
    agent.wealth = Math.max(0, agent.wealth - fine);
    agent.complianceStatus = 'audited';
    agent.evasionFraction = 0;
    agent.auditCooldownUntil = tick + AUDIT_COOLDOWN_TICKS;
    outcomes.push({ agentId: agent.id, agent, wasEvading: true, caught: true, fine });
  }
  return outcomes;
}
