import { useLatestMetrics } from '@/state/selectors';
import { useSimStore } from '@/state/useSimStore';
import { StatTile } from '../common/StatTile';
import { formatCompactNumber, formatCompactUSD, formatPercent, formatUSD } from '@/utils/format';

export function KpiRow() {
  const metrics = useLatestMetrics();
  const agentCount = useSimStore((s) => s.agentCountConfig);
  const perAgent = metrics && metrics.activeAgentCount > 0 ? metrics.activeAgentCount : 1;

  return (
    <div className="grid grid-cols-7 gap-2 shrink-0">
      <StatTile
        label="Revenue collected /mo"
        value={metrics ? `${formatUSD(metrics.taxRevenueCollected / perAgent)}/agent` : '—'}
        sub={metrics ? `${formatCompactUSD(metrics.taxRevenueCollected)} total` : undefined}
        accentColor="var(--series-collected)"
      />
      <StatTile
        label="UBI disbursed /mo"
        value={metrics ? `${formatUSD(metrics.ubiPaidOut / perAgent)}/agent` : '—'}
        sub="redistribution outflow"
        accentColor="var(--status-good)"
      />
      <StatTile
        label="AI / automation tax /mo"
        value={metrics ? `${formatUSD(metrics.aiTaxRevenueCollected / perAgent)}/agent` : '—'}
        sub={metrics ? `${formatCompactUSD(metrics.aiTaxRevenueCollected)} total` : undefined}
        accentColor="var(--series-avoided)"
      />
      <StatTile
        label="Equity fund (public stake)"
        value={metrics ? formatCompactUSD(metrics.equityFundBalance) : '—'}
        sub={
          metrics && metrics.equityFundLiquidated > 0
            ? `${formatCompactUSD(metrics.equityFundLiquidated)} sold off this cycle`
            : 'sells a slice annually -> UBI'
        }
        accentColor="var(--series-avoided)"
      />
      <StatTile
        label="Gini coefficient"
        value={metrics ? metrics.gini.toFixed(3) : '—'}
        sub="lower = more equal"
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
