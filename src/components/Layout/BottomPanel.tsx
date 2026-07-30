import { KpiRow } from '../Charts/KpiRow';
import { RevenueChart } from '../Charts/RevenueChart';
import { GiniChart } from '../Charts/GiniChart';
import { CapitalFlightChart } from '../Charts/CapitalFlightChart';

export function BottomPanel() {
  return (
    <section className="flex-1 min-h-0 border-t border-border bg-surface-0 p-3 flex flex-col gap-3 overflow-hidden">
      <KpiRow />
      <div className="flex-1 min-h-0 flex gap-3">
        <div className="flex-1 min-w-0">
          <RevenueChart />
        </div>
        <div className="flex-1 min-w-0">
          <GiniChart />
        </div>
        <div className="flex-1 min-w-0">
          <CapitalFlightChart />
        </div>
      </div>
    </section>
  );
}
