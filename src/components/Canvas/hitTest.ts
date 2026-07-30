import type { Agent } from '@/types';

const HIT_RADIUS_CSS_PX = 8;

/**
 * Plain O(n) nearest-distance scan, run only on a discrete click event (not per-mousemove or
 * per-frame) — sub-millisecond even at 5,000 agents, so no spatial index is needed.
 */
export function findAgentAtPoint(
  agents: Agent[],
  xCss: number,
  yCss: number,
  widthCss: number,
  heightCss: number,
): Agent | null {
  let closest: Agent | null = null;
  let closestDistSq = Infinity;
  for (const agent of agents) {
    const ax = agent.position.x * widthCss;
    const ay = agent.position.y * heightCss;
    const dx = ax - xCss;
    const dy = ay - yCss;
    const distSq = dx * dx + dy * dy;
    if (distSq < closestDistSq) {
      closestDistSq = distSq;
      closest = agent;
    }
  }
  if (closest && Math.sqrt(closestDistSq) <= HIT_RADIUS_CSS_PX) return closest;
  return null;
}
