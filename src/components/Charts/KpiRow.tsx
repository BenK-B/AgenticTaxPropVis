import { useLatestMetrics } from '@/state/selectors';
import { useSimStore } from '@/state/useSimStore';
import { StatTile } from '../common/StatTile';
import { formatCompactNumber, formatCompactUSD, formatPercent } from '@/utils/format';

export function KpiRow() {
  const metrics = useLatestMetrics();
  const agentCount = useSimStore((s) => s.agentCountConfig);

  return (
    <div className="grid grid-cols-5 gap-2 shrink-0">
      <StatTile
        label="Revenue collected"
        value={metrics ? formatCompactUSD(metrics.taxRevenueCollected) : '—'}
        accentColor="var(--series-collected)"
      />
      <StatTile
        label="AI / automation tax"
        value={metrics ? formatCompactUSD(metrics.aiTaxRevenueCollected) : '—'}
        accentColor="var(--series-avoided)"
      />
      <StatTile
        label="Gini coefficient"
        value={metrics ? metrics.gini.toFixed(3) : '—'}
        accentColor="var(--series-gini)"
      />
      <StatTile
        label="Capital flight"
        value={metrics ? formatPercent(metrics.capitalFlightRate, 1) : '—'}
        accentColor="var(--series-flight)"
      />
      <StatTile
        label="Active agents"
        value={formatCompactNumber(metrics ? metrics.activeAgentCount : agentCount)}
        accentColor="var(--archetype-w2)"
      />
    </div>
  );
}
