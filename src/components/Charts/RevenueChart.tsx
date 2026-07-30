import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSimStore } from '@/state/useSimStore';
import { formatCompactUSD } from '@/utils/format';
import { ChartCard } from './ChartCard';
import { ChartTooltip } from './ChartTooltip';

export function RevenueChart() {
  const metricsHistory = useSimStore((s) => s.metricsHistory);
  const data = metricsHistory.map((m) => ({
    tick: m.tick,
    Collected: m.taxRevenueCollected,
    Evaded: m.taxRevenueEvaded,
    Avoided: m.taxRevenueAvoided,
  }));

  return (
    <ChartCard title="Tax revenue: collected / evaded / avoided">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis dataKey="tick" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} />
          <YAxis
            tickFormatter={(v) => formatCompactUSD(v)}
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip content={<ChartTooltip formatValue={formatCompactUSD} />} />
          <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} iconType="line" iconSize={10} />
          <Area
            type="monotone"
            dataKey="Collected"
            stackId="revenue"
            stroke="var(--series-collected)"
            fill="var(--series-collected)"
            fillOpacity={0.35}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="Evaded"
            stackId="revenue"
            stroke="var(--series-evaded)"
            fill="var(--series-evaded)"
            fillOpacity={0.35}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="Avoided"
            stackId="revenue"
            stroke="var(--series-avoided)"
            fill="var(--series-avoided)"
            fillOpacity={0.35}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
