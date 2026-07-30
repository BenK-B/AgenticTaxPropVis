import { useSimStore } from '@/state/useSimStore';
import type { Archetype } from '@/types';
import { formatPercent } from '@/utils/format';
import { ARCHETYPE_CSS_VAR, ARCHETYPE_LABEL, cssVar } from '../Canvas/colorMap';
import { FieldRow } from './FieldRow';

const ORDER: Archetype[] = ['W2_Worker', 'Freelancer', 'Business_Owner', 'HNW_Investor'];

export function ArchetypeRatioSliders() {
  const ratios = useSimStore((s) => s.archetypeRatios);
  const setArchetypeRatio = useSimStore((s) => s.setArchetypeRatio);

  return (
    <div className="card">
      <div className="section-title mb-2">Population mix</div>
      {ORDER.map((archetype) => (
        <FieldRow
          key={archetype}
          label={ARCHETYPE_LABEL[archetype]}
          value={ratios[archetype]}
          onChange={(v) => setArchetypeRatio(archetype, v)}
          min={0}
          max={1}
          step={0.01}
          accentColor={cssVar(ARCHETYPE_CSS_VAR[archetype])}
          formatValue={(v) => formatPercent(v)}
        />
      ))}
      <p className="text-[11px] text-text-muted mt-1.5">Applies on the next Reset.</p>
    </div>
  );
}
