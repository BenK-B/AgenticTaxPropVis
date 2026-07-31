import { useEffect, useState } from 'react';
import { engineRunner } from '@/state/engineBridge';
import { wealthPercentileToY } from '@/engine/position';
import { povertyLineAtTick } from '@/engine/metrics';
import { formatCompactUSD } from '@/utils/format';

const AXIS_PERCENTILES = [0.9, 0.5, 0.1];
const POLL_MS = 1000;

interface ScaleState {
  axisTicks: { percentile: number; wealth: number }[];
  povertyPercentile: number | null;
  povertyLine: number;
}

const EMPTY_SCALE: ScaleState = { axisTicks: [], povertyPercentile: null, povertyLine: 0 };

/** Reads the live agent population (not a per-frame concern — polled on an interval, not tied
 * to the render loop) and derives where actual dollar amounts fall on the wealth-clustering axis. */
function computeScale(): ScaleState {
  const agents = engineRunner.getAgentsRef();
  const n = agents.length;
  if (n === 0) return EMPTY_SCALE;

  const povertyLine = povertyLineAtTick(engineRunner.getTick());
  const sortedWealth = agents.map((a) => a.wealth).sort((a, b) => a - b);
  const axisTicks = AXIS_PERCENTILES.map((percentile) => ({
    percentile,
    wealth: sortedWealth[Math.min(n - 1, Math.floor(percentile * (n - 1)))],
  }));

  let belowPoverty = 0;
  for (const wealth of sortedWealth) {
    if (wealth <= povertyLine) belowPoverty += 1;
  }
  const povertyPercentile = belowPoverty > 0 ? belowPoverty / n : null;

  return { axisTicks, povertyPercentile, povertyLine };
}

/** Static-ish overlay (updated on a 1s interval, not per animation frame) showing actual wealth
 * dollar amounts at a few points on the vertical clustering axis, plus a poverty-line reference. */
export function WealthScale() {
  const [scale, setScale] = useState<ScaleState>(EMPTY_SCALE);

  useEffect(() => {
    setScale(computeScale());
    const id = setInterval(() => setScale(computeScale()), POLL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {scale.axisTicks.map((t) => (
        <div
          key={t.percentile}
          className="absolute left-1.5 -translate-y-1/2 text-[10px] text-text-muted tabular-nums"
          style={{ top: `${wealthPercentileToY(t.percentile) * 100}%` }}
        >
          {formatCompactUSD(t.wealth)}
        </div>
      ))}
      {scale.povertyPercentile !== null && (
        <div
          className="absolute left-0 right-0 border-t border-dashed"
          style={{ top: `${wealthPercentileToY(scale.povertyPercentile) * 100}%`, borderColor: 'var(--status-critical)' }}
        >
          <span
            className="absolute left-1.5 -top-[13px] text-[10px] font-medium whitespace-nowrap"
            style={{ color: 'var(--status-critical)' }}
          >
            Poverty line (~{formatCompactUSD(scale.povertyLine)})
          </span>
        </div>
      )}
    </div>
  );
}
