import type { BehaviorLogEntry } from '@/types';

const pct = (v: number) => Math.round(v * 100);
const usd = (v: number) => `$${Math.round(v).toLocaleString()}`;

export function evasionLog(tick: number, evasionFraction: number, marginalRate: number): BehaviorLogEntry {
  return {
    tick,
    kind: 'evasion',
    message: `Began underreporting ~${pct(evasionFraction)}% of income after facing a ${pct(marginalRate)}% marginal rate.`,
  };
}

export function flightLog(tick: number, marginalRate: number, capGainsRate: number): BehaviorLogEntry {
  return {
    tick,
    kind: 'flight',
    message: `Began moving capital offshore as combined tax pressure (${pct(marginalRate)}% income / ${pct(capGainsRate)}% cap gains) crossed their threshold.`,
  };
}

export function auditCaughtLog(tick: number, fine: number): BehaviorLogEntry {
  return { tick, kind: 'audit_caught', message: `Audited and caught evading — fined ${usd(fine)}.` };
}

export function auditClearLog(tick: number): BehaviorLogEntry {
  return { tick, kind: 'audit_clear', message: 'Audited — records found compliant.' };
}

export function aiShieldLog(tick: number, combinedAiRate: number, shieldFraction: number): BehaviorLogEntry {
  return {
    tick,
    kind: 'ai_shield',
    message: `Restructured operations in response to a ${pct(combinedAiRate)}% AI/automation tax burden — now shielding ${pct(shieldFraction)}% of AI-attributed revenue.`,
  };
}

export function writeOffLog(tick: number, writeOffFactor: number): BehaviorLogEntry {
  return {
    tick,
    kind: 'write_off',
    message: `Increased reinvestment write-offs to shelter ${pct(writeOffFactor)}% of taxable income.`,
  };
}
