import type { Agent, Archetype, BehaviorWeights, EngineState, MetricsSnapshot, Policy, SimDate, SpeedMultiplier } from '@/types';
import {
  DEFAULT_ARCHETYPE_RATIOS,
  DEFAULT_AGENT_COUNT,
  DEFAULT_BEHAVIOR_WEIGHTS,
  DEFAULT_POLICY,
  MAX_TICKS_PER_FRAME,
  TICK_INTERVAL_MS_BASE,
  mulberry32,
  seedAgents,
  tick as runTick,
  updatePositionForFrame,
} from '@/engine';

const BASE_SEED = 20260101;
const HIDDEN_FRAME_CLAMP_MS = 250;

export interface EngineCallbacks {
  /**
   * Called with every metrics snapshot produced since the last call — batched so that a React/
   * Zustand commit happens at most once per rendered frame, not once per tick. At high speed
   * multipliers the tick loop can run up to MAX_TICKS_PER_FRAME ticks in a single animation
   * frame; without batching, each would trigger its own store update and a full Recharts
   * re-render, which is expensive enough to starve the render loop itself.
   */
  onTicks: (metricsBatch: MetricsSnapshot[]) => void;
  onSelectedAgentUpdate: (agent: Agent | null) => void;
}

function performanceNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function cloneAgent(agent: Agent): Agent {
  return {
    ...agent,
    position: { ...agent.position },
    velocity: { ...agent.velocity },
    targetPosition: { ...agent.targetPosition },
    history: [...agent.history],
    behaviorLog: [...agent.behaviorLog],
  };
}

function zeroMetrics(state: EngineState): MetricsSnapshot {
  return {
    tick: state.tick,
    simDate: state.simDate,
    taxRevenueCollected: 0,
    taxRevenueEvaded: 0,
    taxRevenueAvoided: 0,
    aiTaxRevenueCollected: 0,
    gini: 0,
    capitalFlightRate: 0,
    activeAgentCount: state.agents.length,
    totalWealth: state.agents.reduce((sum, agent) => sum + agent.wealth, 0),
  };
}

/**
 * Owns the full mutable Agent[] array and drives the tick/render loop, entirely outside React.
 * The Zustand store only holds aggregate/reactive state; components that need live per-agent
 * data (the canvas, the inspector) read this singleton imperatively so 2,500-5,000 agents never
 * trigger a React re-render per tick or per frame.
 */
class EngineRunner {
  private engineState: EngineState;
  private rng = mulberry32(BASE_SEED);

  private policy: Policy = DEFAULT_POLICY;
  private archetypeRatios: Record<Archetype, number> = DEFAULT_ARCHETYPE_RATIOS;
  private behaviorWeights: BehaviorWeights = DEFAULT_BEHAVIOR_WEIGHTS;
  private agentCount = DEFAULT_AGENT_COUNT;
  private isPlaying = false;
  private speedMultiplier: SpeedMultiplier = 1;
  private selectedAgentId: string | null = null;

  private tickAccumulatorMs = 0;
  private lastFrameMs = 0;
  private rafId: number | null = null;
  private renderCallback: ((nowMs: number) => void) | null = null;
  private callbacks: EngineCallbacks | null = null;

  constructor() {
    this.engineState = {
      tick: 0,
      simDate: { year: 1, month: 1 },
      agents: seedAgents(this.agentCount, this.archetypeRatios, this.rng),
    };
  }

  init(callbacks: EngineCallbacks): void {
    this.callbacks = callbacks;
  }

  getAgentsRef(): Agent[] {
    return this.engineState.agents;
  }

  getAgentById(id: string): Agent | undefined {
    return this.engineState.agents.find((agent) => agent.id === id);
  }

  getTick(): number {
    return this.engineState.tick;
  }

  getSimDate(): SimDate {
    return this.engineState.simDate;
  }

  setPolicy(policy: Policy): void {
    this.policy = policy;
  }

  setArchetypeRatios(ratios: Record<Archetype, number>): void {
    this.archetypeRatios = ratios;
  }

  setBehaviorWeights(weights: BehaviorWeights): void {
    this.behaviorWeights = weights;
  }

  setSpeed(multiplier: SpeedMultiplier): void {
    this.speedMultiplier = multiplier;
  }

  setPlaying(playing: boolean): void {
    this.isPlaying = playing;
  }

  setSelectedAgentId(id: string | null): void {
    this.selectedAgentId = id;
  }

  setAgentCount(count: number): void {
    this.agentCount = count;
  }

  setRenderCallback(callback: ((nowMs: number) => void) | null): void {
    this.renderCallback = callback;
  }

  reset(agentCount?: number, archetypeRatios?: Record<Archetype, number>): void {
    if (agentCount !== undefined) this.agentCount = agentCount;
    if (archetypeRatios !== undefined) this.archetypeRatios = archetypeRatios;
    this.rng = mulberry32(BASE_SEED);
    this.tickAccumulatorMs = 0;
    this.engineState = {
      tick: 0,
      simDate: { year: 1, month: 1 },
      agents: seedAgents(this.agentCount, this.archetypeRatios, this.rng),
    };
    this.callbacks?.onTicks([zeroMetrics(this.engineState)]);
    this.emitSelectedAgentIfNeeded();
  }

  /** Runs exactly one tick immediately, regardless of play/pause state. */
  step(): void {
    const now = performanceNow();
    const result = runTick(this.engineState, this.policy, this.behaviorWeights, this.rng, now);
    this.engineState = result.state;
    this.callbacks?.onTicks([result.metrics]);
    this.emitSelectedAgentIfNeeded();
  }

  private emitSelectedAgentIfNeeded(): void {
    if (!this.selectedAgentId || !this.callbacks) return;
    const agent = this.getAgentById(this.selectedAgentId);
    this.callbacks.onSelectedAgentUpdate(agent ? cloneAgent(agent) : null);
  }

  start(): void {
    if (this.rafId !== null) return;
    this.lastFrameMs = performanceNow();

    const frame = (nowMs: number) => {
      const dt = Math.min(nowMs - this.lastFrameMs, HIDDEN_FRAME_CLAMP_MS);
      this.lastFrameMs = nowMs;

      if (typeof document === 'undefined' || !document.hidden) {
        for (const agent of this.engineState.agents) updatePositionForFrame(agent, dt);

        if (this.isPlaying) {
          this.tickAccumulatorMs += dt * this.speedMultiplier;
          const metricsBatch: MetricsSnapshot[] = [];
          let ticksThisFrame = 0;
          while (this.tickAccumulatorMs >= TICK_INTERVAL_MS_BASE && ticksThisFrame < MAX_TICKS_PER_FRAME) {
            this.tickAccumulatorMs -= TICK_INTERVAL_MS_BASE;
            const result = runTick(this.engineState, this.policy, this.behaviorWeights, this.rng, nowMs);
            this.engineState = result.state;
            metricsBatch.push(result.metrics);
            ticksThisFrame += 1;
          }
          if (ticksThisFrame === MAX_TICKS_PER_FRAME) this.tickAccumulatorMs = 0;
          if (metricsBatch.length > 0) {
            this.callbacks?.onTicks(metricsBatch);
            this.emitSelectedAgentIfNeeded();
          }
        }

        this.renderCallback?.(nowMs);
      }

      this.rafId = requestAnimationFrame(frame);
    };

    this.rafId = requestAnimationFrame(frame);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

export const engineRunner = new EngineRunner();
