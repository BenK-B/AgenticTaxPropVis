import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSimStore } from '@/state/useSimStore';
import { formatUSD } from '@/utils/format';
import { ChartCard } from './ChartCard';
import { ChartTooltip } from './ChartTooltip';

export function RevenueChart() {
  const metricsHistory = useSimStore((s) => s.metricsHistory);
  const data = metricsHistory.map((m) => {
    const perAgent = m.activeAgentCount > 0 ? m.activeAgentCount : 1;
    return {
      tick: m.tick,
      Collected: m.taxRevenueCollected / perAgent,
      Evaded: m.taxRevenueEvaded / perAgent,
      Avoided: m.taxRevenueAvoided / perAgent,
    };
  });

  return (
    <ChartCard title="Tax revenue per agent: collected / evaded / avoided" subtitle="Monthly $ per active agent, averaged across the population">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis dataKey="tick" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} />
          <YAxis
            tickFormatter={(v) => formatUSD(v)}
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<ChartTooltip formatValue={formatUSD} />} />
          <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} iconType="line" iconSize={10} />
          <Line
            type="monotone"
            dataKey="Collected"
            stroke="var(--series-collected)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="Evaded"
            stroke="var(--series-evaded)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="Avoided"
            stroke="var(--series-avoided)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
