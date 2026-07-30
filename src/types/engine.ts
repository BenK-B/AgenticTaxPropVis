import type { Agent } from './agent';

export interface SimDate {
  year: number;
  month: number;
}

export interface EngineState {
  tick: number;
  simDate: SimDate;
  agents: Agent[];
}

export interface BehaviorWeights {
  /** 0-1, midpoint 0.5 -> multiplier 1.0 applied to each agent's own taxSensitivity. */
  avgTaxSensitivity: number;
  /**
   * 0-1, midpoint 0.5 -> multiplier 1.0 applied to each agent's own riskTolerance,
   * but inverted (higher aversion = lower effective risk-taking): multiplier = 1.5 - riskAversion.
   */
  riskAversion: number;
}

export type SpeedMultiplier = 1 | 5 | 10 | 20;
