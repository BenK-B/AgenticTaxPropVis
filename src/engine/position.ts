import type { Agent, Archetype } from '@/types';
import { clamp, lerp } from './mathUtils';

const ARCHETYPE_X_CENTER: Record<Archetype, number> = {
  W2_Worker: 0.18,
  Freelancer: 0.4,
  Business_Owner: 0.62,
  HNW_Investor: 0.84,
};

/** Deterministic pseudo-random value in [0,1) derived from a string key. */
function hashToUnit(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

interface AgentJitter {
  x: number;
  y: number;
  edgeX: number;
  edgeY: number;
}

// The jitter/edge values are meant to be *stable* per agent, not re-rolled each tick — so
// compute them once per agent and cache by object reference (agent objects are mutated in
// place and never recreated) rather than re-hashing 2-4 freshly-concatenated template strings
// per active agent every single tick, which was a measurable source of per-tick GC pressure
// at 2,500+ agents.
const jitterCache = new WeakMap<Agent, AgentJitter>();

function jitterFor(agent: Agent): AgentJitter {
  let jitter = jitterCache.get(agent);
  if (!jitter) {
    jitter = {
      x: (hashToUnit(`${agent.id}:x`) - 0.5) * 0.2,
      y: (hashToUnit(`${agent.id}:y`) - 0.5) * 0.05,
      edgeX: hashToUnit(`${agent.id}:edge`) < 0.5 ? 0.03 : 0.97,
      edgeY: 0.08 + hashToUnit(`${agent.id}:edgeY`) * 0.84,
    };
    jitterCache.set(agent, jitter);
  }
  return jitter;
}

/**
 * Wealth-zone clustering target: y is driven by wealth percentile (wealthy near the top),
 * x by a per-archetype cluster center with stable per-agent jitter. Agents mid-flight target
 * the nearest canvas edge instead. Mutates `agent.targetPosition` in place rather than
 * returning a fresh object — called once per active agent per tick (thousands of times), and
 * an allocation there is a meaningful chunk of the per-tick GC pressure at 2,500+ agents.
 */
export function computeTargetPosition(agent: Agent, wealthPercentile: number): void {
  const target = agent.targetPosition;
  const jitter = jitterFor(agent);
  if (agent.flightProgress > 0) {
    target.x = jitter.edgeX;
    target.y = jitter.edgeY;
    return;
  }
  const centerX = ARCHETYPE_X_CENTER[agent.archetype];
  target.y = clamp(0.92 - wealthPercentile * 0.82 + jitter.y, 0.06, 0.96);
  target.x = clamp(centerX + jitter.x, 0.04, 0.96);
}

/** Spring-lag toward targetPosition; called every render frame, decoupled from tick rate. */
export function updatePositionForFrame(agent: Agent, dtMs: number): void {
  const springFactor = 1 - Math.pow(0.001, dtMs / 1000);
  agent.position.x = lerp(agent.position.x, agent.targetPosition.x, springFactor);
  agent.position.y = lerp(agent.position.y, agent.targetPosition.y, springFactor);
}
