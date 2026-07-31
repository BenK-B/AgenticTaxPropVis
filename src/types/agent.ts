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
  | 'capital_return'
  | 'audit_caught'
  | 'audit_clear'
  | 'write_off'
  | 'ai_shield'
  | 'ubi'
  | 'job_loss'
  | 'income_boost'
  | 'expense_shock'
  | 'windfall'
  | 'financial_distress'
  | 'business_failure';

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
  /** Running net capital return not yet tax-settled this sim-year — settled once a year (see
   * tick.ts) so gains and losses net against each other like a real annual filing, rather than
   * taxing every up month with no credit for down months. Negative balances carry forward. */
  pendingCapitalGain: number;
  /** Months of "financial distress" (income/cost-of-living penalty) remaining — triggered by
   * hitting $0 net worth and refreshed every month spent there, then ticks down for a while even
   * after recovering above $0, mirroring how credit damage/instability outlasts the shortfall
   * itself. 0 = not currently in distress. */
  distressMonthsRemaining: number;
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
