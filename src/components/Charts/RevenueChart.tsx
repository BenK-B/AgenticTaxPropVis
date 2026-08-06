import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSimStore } from '@/state/useSimStore';
import { trailingAnnualSeries } from '@/state/annualize';
import { formatUSD } from '@/utils/format';
import { ChartCard } from './ChartCard';
import { ChartTooltip } from './ChartTooltip';

export function RevenueChart() {
  const metricsHistory = useSimStore((s) => s.metricsHistory);
  // Capital gains / equity-capture / equity-fund-liquidation revenue settles once a sim-year
  // rather than smoothly every tick (see tick.ts), so a raw per-tick read spikes ~4-10x on the
  // settlement month. Rolling over a trailing 12-tick window turns that into the smooth annual
  // run-rate it actually represents, instead of a once-a-year sawtooth.
  const data = trailingAnnualSeries(metricsHistory).map((m) => {
    const perAgent = m.activeAgentCount > 0 ? m.activeAgentCount : 1;
    return {
      tick: m.tick,
      Collected: m.taxRevenueCollected / 12 / perAgent,
      Evaded: m.taxRevenueEvaded / 12 / perAgent,
      Avoided: m.taxRevenueAvoided / 12 / perAgent,
    };
  });

  return (
    <ChartCard
      title="Tax revenue per agent: collected / evaded / avoided"
      subtitle="Trailing 12-month average, $ per active agent — smooths the once-a-year capital-gains/equity settlement into a steady run rate"
    >
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
