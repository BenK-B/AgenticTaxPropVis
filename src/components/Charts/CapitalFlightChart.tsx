import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSimStore } from '@/state/useSimStore';
import { formatPercent } from '@/utils/format';
import { ChartCard } from './ChartCard';
import { ChartTooltip } from './ChartTooltip';

export function CapitalFlightChart() {
  const metricsHistory = useSimStore((s) => s.metricsHistory);
  const data = metricsHistory.map((m) => ({ tick: m.tick, 'Capital flight': m.capitalFlightRate }));

  return (
    <ChartCard title="Capital flight rate">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis dataKey="tick" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} />
          <YAxis
            domain={[0, (max: number) => Math.max(0.05, max * 1.2)]}
            tickFormatter={(v) => formatPercent(v, 0)}
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <Tooltip content={<ChartTooltip formatValue={(v) => formatPercent(v, 1)} />} />
          <Area
            type="monotone"
            dataKey="Capital flight"
            stroke="var(--series-flight)"
            fill="var(--series-flight)"
            fillOpacity={0.3}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
