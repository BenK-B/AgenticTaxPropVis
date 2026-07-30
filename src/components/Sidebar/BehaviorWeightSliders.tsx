import { useSimStore } from '@/state/useSimStore';
import { formatPercent } from '@/utils/format';
import { FieldRow } from './FieldRow';

export function BehaviorWeightSliders() {
  const weights = useSimStore((s) => s.behaviorWeights);
  const setBehaviorWeight = useSimStore((s) => s.setBehaviorWeight);

  return (
    <div className="card">
      <div className="section-title mb-2">Aggregate behavior</div>
      <FieldRow
        label="Avg. tax sensitivity"
        value={weights.avgTaxSensitivity}
        onChange={(v) => setBehaviorWeight('avgTaxSensitivity', v)}
        min={0}
        max={1}
        step={0.05}
        formatValue={(v) => formatPercent(v)}
      />
      <FieldRow
        label="Risk aversion"
        value={weights.riskAversion}
        onChange={(v) => setBehaviorWeight('riskAversion', v)}
        min={0}
        max={1}
        step={0.05}
        formatValue={(v) => formatPercent(v)}
      />
      <p className="text-[11px] text-text-muted mt-1.5">Scales every agent's own traits live — no reset needed.</p>
    </div>
  );
}
