import type { Agent, ComplianceStatus } from '@/types';
import { ARCHETYPE_LABEL } from '../Canvas/colorMap';
import { formatPercent, formatUSD } from '@/utils/format';

const COMPLIANCE_LABEL: Record<ComplianceStatus, string> = {
  compliant: 'Compliant',
  evading: 'Evading',
  audited: 'Audited this tick',
};

const COMPLIANCE_COLOR: Record<ComplianceStatus, string> = {
  compliant: 'var(--status-good)',
  evading: 'var(--status-warning)',
  audited: 'var(--status-critical)',
};

export function AgentStatsBlock({ agent }: { agent: Agent }) {
  const complianceColor = COMPLIANCE_COLOR[agent.complianceStatus];

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{agent.id}</span>
        <span
          className="text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0"
          style={{ background: `color-mix(in srgb, ${complianceColor} 16%, transparent)`, color: complianceColor }}
        >
          {COMPLIANCE_LABEL[agent.complianceStatus]}
        </span>
      </div>
      <div className="text-xs text-text-secondary mt-0.5">{ARCHETYPE_LABEL[agent.archetype]}</div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="stat-tile !p-2">
          <div className="text-[10px] text-text-muted uppercase tracking-wide">Wealth</div>
          <div className="text-sm font-semibold tabular-nums">{formatUSD(agent.wealth)}</div>
        </div>
        <div className="stat-tile !p-2">
          <div className="text-[10px] text-text-muted uppercase tracking-wide">Annual income</div>
          <div className="text-sm font-semibold tabular-nums">{formatUSD(agent.income)}</div>
        </div>
        <div className="stat-tile !p-2">
          <div className="text-[10px] text-text-muted uppercase tracking-wide">Risk tolerance</div>
          <div className="text-sm font-semibold tabular-nums">{formatPercent(agent.riskTolerance)}</div>
        </div>
        <div className="stat-tile !p-2">
          <div className="text-[10px] text-text-muted uppercase tracking-wide">Tax sensitivity</div>
          <div className="text-sm font-semibold tabular-nums">{formatPercent(agent.taxSensitivity)}</div>
        </div>
        {agent.aiExposure > 0 && (
          <>
            <div className="stat-tile !p-2">
              <div className="text-[10px] text-text-muted uppercase tracking-wide">AI exposure</div>
              <div className="text-sm font-semibold tabular-nums">{formatPercent(agent.aiExposure)}</div>
            </div>
            <div className="stat-tile !p-2">
              <div className="text-[10px] text-text-muted uppercase tracking-wide">AI tax shield</div>
              <div className="text-sm font-semibold tabular-nums">{formatPercent(agent.aiShieldFraction)}</div>
            </div>
          </>
        )}
        {!agent.isActiveInEconomy && (
          <div className="stat-tile !p-2 col-span-2" style={{ borderLeft: '3px solid var(--series-flight)' }}>
            <div className="text-[10px] text-text-muted uppercase tracking-wide">Status</div>
            <div className="text-sm font-semibold">Fled the active economy</div>
          </div>
        )}
      </div>
    </div>
  );
}
