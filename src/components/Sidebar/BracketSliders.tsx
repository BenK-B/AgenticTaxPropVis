import { useSimStore } from '@/state/useSimStore';
import type { Policy, TaxBracket } from '@/types';
import { formatPercent, formatUSD } from '@/utils/format';
import { cssVar } from '../Canvas/colorMap';
import { FieldRow } from './FieldRow';

const ACCENT = cssVar('--archetype-w2');

export function BracketSliders() {
  const brackets = useSimStore((s) => s.policy.brackets);
  const setPolicy = useSimStore((s) => s.setPolicy);

  const updateBracket = (index: 0 | 1 | 2, patch: Partial<TaxBracket>) => {
    const next = brackets.map((b, i) => (i === index ? { ...b, ...patch } : b)) as Policy['brackets'];
    setPolicy({ brackets: next });
  };

  return (
    <div>
      <FieldRow
        label="Bracket 1 rate"
        value={brackets[0].rate}
        onChange={(v) => updateBracket(0, { rate: v })}
        min={0}
        max={0.5}
        step={0.01}
        accentColor={ACCENT}
        formatValue={(v) => formatPercent(v)}
      />
      <FieldRow
        label="Bracket 2 threshold"
        value={brackets[1].threshold}
        onChange={(v) => updateBracket(1, { threshold: v })}
        min={brackets[0].threshold + 1000}
        max={Math.max(brackets[0].threshold + 2000, brackets[2].threshold - 1000)}
        step={1000}
        accentColor={ACCENT}
        formatValue={formatUSD}
      />
      <FieldRow
        label="Bracket 2 rate"
        value={brackets[1].rate}
        onChange={(v) => updateBracket(1, { rate: v })}
        min={0}
        max={0.6}
        step={0.01}
        accentColor={ACCENT}
        formatValue={(v) => formatPercent(v)}
      />
      <FieldRow
        label="Bracket 3 threshold"
        value={brackets[2].threshold}
        onChange={(v) => updateBracket(2, { threshold: v })}
        min={brackets[1].threshold + 1000}
        max={1_000_000}
        step={5000}
        accentColor={ACCENT}
        formatValue={formatUSD}
      />
      <FieldRow
        label="Bracket 3 rate"
        value={brackets[2].rate}
        onChange={(v) => updateBracket(2, { rate: v })}
        min={0}
        max={0.9}
        step={0.01}
        accentColor={ACCENT}
        formatValue={(v) => formatPercent(v)}
      />
    </div>
  );
}
