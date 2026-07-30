import type { Agent, Archetype } from '@/types';
import { ARCHETYPE_CSS_VAR, FLASH_COLOR_CSS_VAR, resolveColorVar } from './colorMap';

const ARCHETYPES: Archetype[] = ['W2_Worker', 'Freelancer', 'Business_Owner', 'HNW_Investor'];

function radiusFor(count: number): number {
  if (count > 4000) return 1.5;
  if (count > 2500) return 1.9;
  return 2.3;
}

/**
 * Two-pass draw: pass 1 batches ordinary agents by archetype (one fillStyle set per group,
 * minimizing state changes across thousands of draw calls); pass 2 redraws the small subset
 * that's flashing or mid-flight individually, since only they need per-agent alpha/color.
 * No React, no store — pure canvas drawing driven by whatever agents/state the caller passes.
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  agents: Agent[],
  widthCss: number,
  heightCss: number,
  selectedAgentId: string | null,
  nowMs: number,
): void {
  ctx.fillStyle = resolveColorVar('--surface-0');
  ctx.fillRect(0, 0, widthCss, heightCss);

  const radius = radiusFor(agents.length);
  const specialAgents: Agent[] = [];

  for (const archetype of ARCHETYPES) {
    ctx.fillStyle = resolveColorVar(ARCHETYPE_CSS_VAR[archetype]);
    ctx.beginPath();
    for (const agent of agents) {
      if (agent.archetype !== archetype) continue;
      const isFlashing = nowMs < agent.flashUntil;
      const isFleeing = agent.flightProgress > 0;
      if (isFlashing || isFleeing) {
        specialAgents.push(agent);
        continue;
      }
      const x = agent.position.x * widthCss;
      const y = agent.position.y * heightCss;
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  for (const agent of specialAgents) {
    const x = agent.position.x * widthCss;
    const y = agent.position.y * heightCss;
    const isFlashing = nowMs < agent.flashUntil;

    let alpha = 1;
    if (agent.flightProgress > 0) {
      alpha = Math.max(0.15, 1 - agent.flightProgress * 0.85);
    }

    let color = resolveColorVar(ARCHETYPE_CSS_VAR[agent.archetype]);
    if (isFlashing) {
      const flashVar = FLASH_COLOR_CSS_VAR[agent.flashColor];
      if (flashVar) color = resolveColorVar(flashVar);
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, isFlashing ? radius * 1.6 : radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (selectedAgentId) {
    const selected = agents.find((agent) => agent.id === selectedAgentId);
    if (selected) {
      const x = selected.position.x * widthCss;
      const y = selected.position.y * heightCss;
      ctx.strokeStyle = resolveColorVar('--text-primary');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, radius * 2.8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
