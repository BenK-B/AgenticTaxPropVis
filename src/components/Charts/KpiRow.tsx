import { useLatestMetrics, useTrailingAnnualMetrics } from '@/state/selectors';
import { useSimStore } from '@/state/useSimStore';
import { StatTile } from '../common/StatTile';
import { formatCompactNumber, formatCompactUSD, formatPercent, formatUSD } from '@/utils/format';

export function KpiRow() {
  const metrics = useLatestMetrics();
  const trailingAnnual = useTrailingAnnualMetrics();
  const agentCount = useSimStore((s) => s.agentCountConfig);
  const perAgent = metrics && metrics.activeAgentCount > 0 ? metrics.activeAgentCount : 1;

  return (
    <div className="grid grid-cols-7 gap-2 shrink-0">
      <StatTile
        label="Revenue collected /mo"
        value={trailingAnnual ? `${formatUSD(trailingAnnual.taxRevenueCollected / 12 / perAgent)}/agent` : '—'}
        sub={trailingAnnual ? `${formatCompactUSD(trailingAnnual.taxRevenueCollected)} last 12mo` : undefined}
        accentColor="var(--series-collected)"
      />
      <StatTile
        label="UBI disbursed /mo"
        value={trailingAnnual ? `${formatUSD(trailingAnnual.ubiPaidOut / 12 / perAgent)}/agent` : '—'}
        sub={trailingAnnual ? `${formatCompactUSD(trailingAnnual.ubiPaidOut)} last 12mo` : 'redistribution outflow'}
        accentColor="var(--status-good)"
      />
      <StatTile
        label="AI / automation tax /mo"
        value={trailingAnnual ? `${formatUSD(trailingAnnual.aiTaxRevenueCollected / 12 / perAgent)}/agent` : '—'}
        sub={trailingAnnual ? `${formatCompactUSD(trailingAnnual.aiTaxRevenueCollected)} last 12mo` : undefined}
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
