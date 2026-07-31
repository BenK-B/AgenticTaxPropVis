import { useSimStore } from '@/state/useSimStore';
import { formatPercent, formatUSD } from '@/utils/format';
import { cssVar } from '../Canvas/colorMap';
import { FieldRow } from './FieldRow';
import { BracketSliders } from './BracketSliders';

export function PolicyControls() {
  const policy = useSimStore((s) => s.policy);
  const setPolicy = useSimStore((s) => s.setPolicy);

  return (
    <div className="card">
      <div className="section-title mb-2">Tax &amp; enforcement policy</div>
      <BracketSliders />
      <FieldRow
        label="Standard deduction"
        value={policy.standardDeductionAnnual}
        onChange={(v) => setPolicy({ standardDeductionAnnual: v })}
        min={0}
        max={40000}
        step={500}
        accentColor={cssVar('--archetype-w2')}
        formatValue={formatUSD}
      />
      <FieldRow
        label="Capital gains rate"
        value={policy.capitalGainsRate}
        onChange={(v) => setPolicy({ capitalGainsRate: v })}
        min={0}
        max={0.5}
        step={0.01}
        accentColor={cssVar('--archetype-hnw')}
        formatValue={(v) => formatPercent(v)}
      />
      <FieldRow
        label="Audit budget"
        value={policy.auditBudgetPct}
        onChange={(v) => setPolicy({ auditBudgetPct: v })}
        min={0}
        max={0.2}
        step={0.005}
        accentColor={cssVar('--status-critical')}
        formatValue={(v) => formatPercent(v, 1)}
      />
    </div>
  );
}
