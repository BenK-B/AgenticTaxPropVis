import type { Archetype } from './archetype';

export interface AgentHistoryEntry {
  tick: number;
  income: number;
  taxPaid: number;
  wealth: number;
}

export type BehaviorLogKind =
  | 'evasion'
  | 'flight'
  | 'audit_caught'
  | 'audit_clear'
  | 'write_off'
  | 'ai_shield'
  | 'ubi'
  | 'job_loss'
  | 'income_boost'
  | 'expense_shock'
  | 'windfall';

export interface BehaviorLogEntry {
  tick: number;
  message: string;
  kind: BehaviorLogKind;
}

export type ComplianceStatus = 'compliant' | 'evading' | 'audited';

export interface Agent {
  id: string;
  archetype: Archetype;
  /** Annualized base income; drifts upward slowly each tick. */
  income: number;
  wealth: number;
  riskTolerance: number;
  taxSensitivity: number;
  complianceStatus: ComplianceStatus;
  evasionFraction: number;
  isActiveInEconomy: boolean;
  flightProgress: number;
  auditCooldownUntil: number;
  aiExposure: number;
  aiShieldFraction: number;
  /** Current annual cost-of-living, re-rolled once per sim-year within the archetype's range. */
  costOfLivingAnnual: number;
  /** 1 = normal; temporarily <1 during a job loss/slump or >1 during a bonus/boom. */
  incomeShockMultiplier: number;
  /** Months left before incomeShockMultiplier reverts to 1. */
  incomeShockMonthsRemaining: number;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  targetPosition: { x: number; y: number };
  flashUntil: number;
  flashColor: string;
  history: AgentHistoryEntry[];
  behaviorLog: BehaviorLogEntry[];
}
