import { KpiRow } from '../Charts/KpiRow';
import { RevenueChart } from '../Charts/RevenueChart';
import { GiniChart } from '../Charts/GiniChart';
import { CapitalFlightChart } from '../Charts/CapitalFlightChart';

export function BottomPanel() {
  return (
    <section className="h-[340px] shrink-0 border-t border-border bg-surface-0 p-3 flex flex-col gap-3 overflow-hidden">
      <KpiRow />
      <div className="flex-1 min-h-0 grid grid-cols-3 gap-3">
        <RevenueChart />
        <GiniChart />
        <CapitalFlightChart />
      </div>
    </section>
  );
}
