import type { Archetype } from '@/types';
import { ARCHETYPE_X_CENTER } from '@/engine/position';
import { ARCHETYPE_CSS_VAR, cssVar } from './colorMap';

const ARCHETYPE_ORDER: Archetype[] = ['W2_Worker', 'Freelancer', 'Business_Owner', 'HNW_Investor'];

// Short forms for this compact overlay — the Inspector uses the full "W-2 Worker" etc.
const SHORT_LABEL: Record<Archetype, string> = {
  W2_Worker: 'W-2',
  Freelancer: 'Freelance',
  Business_Owner: 'Business',
  HNW_Investor: 'HNW',
};

/**
 * Static overlay explaining what the dots' position and color encode — the canvas itself has
 * no notion of labels, this just sits on top of it. Positioned with the same fixed fractions
 * (ARCHETYPE_X_CENTER) the engine uses for clustering, so labels always line up with the bands.
 */
export function CanvasLabels() {
  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {ARCHETYPE_ORDER.map((archetype) => (
        <div
          key={archetype}
          className="absolute top-1.5 flex items-center gap-1 -translate-x-1/2 text-[10px] font-medium whitespace-nowrap"
          style={{ left: `${ARCHETYPE_X_CENTER[archetype] * 100}%` }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: cssVar(ARCHETYPE_CSS_VAR[archetype]) }}
          />
          <span className="text-text-secondary">{SHORT_LABEL[archetype]}</span>
        </div>
      ))}
      <div className="absolute top-1.5 right-2 text-[10px] text-text-muted">↑ Wealthier</div>
      <div className="absolute bottom-1.5 right-2 text-[10px] text-text-muted">↓ Poorer</div>
    </div>
  );
}
