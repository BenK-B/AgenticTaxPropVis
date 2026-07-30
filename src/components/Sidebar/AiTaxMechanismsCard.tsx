import { useSimStore } from '@/state/useSimStore';
import type { AiTaxMechanisms } from '@/types';
import { formatPercent } from '@/utils/format';
import { ToggleSwitch } from '../common/ToggleSwitch';

const MECHANISM_LABELS: Record<keyof AiTaxMechanisms, string> = {
  tokenTax: 'Token tax',
  energyTax: 'Energy tax',
  revenueContribution: 'Revenue contribution',
  automationTax: 'Automation / digital services tax',
  equityCapture: 'Equity capture fund',
};

const MECHANISM_DESCRIPTIONS: Record<keyof AiTaxMechanisms, string> = {
  tokenTax: 'Per-compute tax on AI-attributed business revenue.',
  energyTax: 'Tax on the energy consumption of AI-attributed revenue.',
  revenueContribution: "Altman-style: AI firms contribute a share of AI-attributed revenue.",
  automationTax: 'Robot/automation tax on AI-attributed business revenue.',
  equityCapture: "Sanders-style: public fund captures a share of AI-linked capital gains.",
};

const MECHANISM_ORDER: (keyof AiTaxMechanisms)[] = [
  'tokenTax',
  'energyTax',
  'revenueContribution',
  'automationTax',
  'equityCapture',
];

export function AiTaxMechanismsCard() {
  const mechanisms = useSimStore((s) => s.policy.aiTaxMechanisms);
  const setAiTaxMechanism = useSimStore((s) => s.setAiTaxMechanism);

  return (
    <div className="card">
      <div className="section-title mb-1">AI &amp; automation tax</div>
      <p className="text-[11px] text-text-secondary mb-2 leading-snug">
        Business owners and investors with AI-linked revenue adapt to these — restructuring
        operations, shielding revenue, or moving capital, not just paying more.
      </p>
      {MECHANISM_ORDER.map((key) => {
        const mechanism = mechanisms[key];
        return (
          <div key={key} className="py-1.5 border-t border-gridline first:border-t-0 first:pt-0">
            <div className="flex items-center justify-between gap-2">
              <ToggleSwitch
                checked={mechanism.enabled}
                onChange={(checked) => setAiTaxMechanism(key, { enabled: checked })}
                label={MECHANISM_LABELS[key]}
                accentColor="var(--series-avoided)"
              />
              <span className="text-[11px] text-text-muted tabular-nums">{formatPercent(mechanism.rate)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.4}
              step={0.01}
              value={mechanism.rate}
              disabled={!mechanism.enabled}
              onChange={(e) => setAiTaxMechanism(key, { rate: Number(e.target.value) })}
              className="w-full mt-1 disabled:opacity-40"
              style={{ accentColor: 'var(--series-avoided)' }}
            />
            <p className="text-[10.5px] text-text-muted leading-snug">{MECHANISM_DESCRIPTIONS[key]}</p>
          </div>
        );
      })}
    </div>
  );
}
