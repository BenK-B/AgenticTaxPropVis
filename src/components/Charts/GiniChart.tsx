import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSimStore } from '@/state/useSimStore';
import { ChartCard } from './ChartCard';
import { ChartTooltip } from './ChartTooltip';

const HISTORICAL_US_GINI = 0.48;

export function GiniChart() {
  const metricsHistory = useSimStore((s) => s.metricsHistory);
  const data = metricsHistory.map((m) => ({ tick: m.tick, Gini: m.gini }));

  return (
    <ChartCard title="Gini coefficient" subtitle="Falling = UBI/tax redistribution outpacing wealth concentration">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis dataKey="tick" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} />
          <YAxis domain={[0, 1]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
          <ReferenceLine y={HISTORICAL_US_GINI} stroke="var(--baseline)" strokeDasharray="4 4" />
          <Tooltip content={<ChartTooltip formatValue={(v) => v.toFixed(3)} />} />
          <Line type="monotone" dataKey="Gini" stroke="var(--series-gini)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
