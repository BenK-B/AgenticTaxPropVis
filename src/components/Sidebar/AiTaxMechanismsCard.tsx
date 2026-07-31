import { useLatestMetrics } from '@/state/selectors';
import { useSimStore } from '@/state/useSimStore';
import type { AiTaxMechanisms } from '@/types';
import { formatCompactNumber, formatPercent } from '@/utils/format';
import { ToggleSwitch } from '../common/ToggleSwitch';

const MECHANISM_LABELS: Record<keyof AiTaxMechanisms, string> = {
  tokenTax: 'Token tax',
  energyTax: 'Energy tax',
  revenueContribution: 'Revenue contribution',
  automationTax: 'Automation / digital services tax',
  equityCapture: 'Equity capture fund',
};

const MECHANISM_DESCRIPTIONS: Record<keyof AiTaxMechanisms, string> = {
  tokenTax:
    'A real $/token excise, not a % of revenue — raise the rate and businesses actually use ' +
    'fewer tokens (the tax base shrinks), rather than just paying more on the same usage.',
  energyTax:
    'A real $/kWh excise on the energy AI-attributed activity consumes — same logic as the ' +
    'token tax: usage falls as the rate rises.',
  revenueContribution: "Altman-style: AI firms contribute a share of AI-attributed revenue.",
  automationTax: 'Robot/automation tax on AI-attributed business revenue.',
  equityCapture:
    "Sanders-style: a public fund captures this share of AI-linked capital gains as an equity " +
    'stake each month. It isn’t spendable right away — the fund sells (liquidates) a ' +
    'slice of its holdings once a year, and only that cash reaches the AI-tax pot / UBI.',
};

const MECHANISM_ORDER: (keyof AiTaxMechanisms)[] = [
  'tokenTax',
  'energyTax',
  'revenueContribution',
  'automationTax',
  'equityCapture',
];

/** tokenTax/energyTax rates are $ per physical unit (usage responds to price); the other three
 * remain a plain % of AI-attributed revenue. */
const RATE_SLIDER: Record<keyof AiTaxMechanisms, { min: number; max: number; step: number; format: (rate: number) => string }> = {
  tokenTax: { min: 0, max: 0.03, step: 0.0005, format: (r) => `$${r.toFixed(4)}/1K tok` },
  energyTax: { min: 0, max: 0.3, step: 0.005, format: (r) => `$${r.toFixed(3)}/kWh` },
  revenueContribution: { min: 0, max: 0.4, step: 0.01, format: (r) => formatPercent(r) },
  automationTax: { min: 0, max: 0.4, step: 0.01, format: (r) => formatPercent(r) },
  equityCapture: { min: 0, max: 0.4, step: 0.01, format: (r) => formatPercent(r) },
};

export function AiTaxMechanismsCard() {
  const mechanisms = useSimStore((s) => s.policy.aiTaxMechanisms);
  const setAiTaxMechanism = useSimStore((s) => s.setAiTaxMechanism);
  const ubi = useSimStore((s) => s.policy.ubi);
  const setUbi = useSimStore((s) => s.setUbi);
  const metrics = useLatestMetrics();

  return (
    <div className="card">
      <div className="section-title mb-1">AI &amp; automation tax</div>
      <p className="text-[11px] text-text-secondary mb-2 leading-snug">
        Business owners and investors with AI-linked revenue adapt to these — restructuring
        operations, shielding revenue, or moving capital, not just paying more.
      </p>
      {MECHANISM_ORDER.map((key) => {
        const mechanism = mechanisms[key];
        const slider = RATE_SLIDER[key];
        return (
          <div key={key} className="py-1.5 border-t border-gridline first:border-t-0 first:pt-0">
            <div className="flex items-center justify-between gap-2">
              <ToggleSwitch
                checked={mechanism.enabled}
                onChange={(checked) => setAiTaxMechanism(key, { enabled: checked })}
                label={MECHANISM_LABELS[key]}
                accentColor="var(--series-avoided)"
              />
              <span className={`text-[11px] tabular-nums ${mechanism.enabled ? 'text-text-muted' : 'text-text-muted/40'}`}>
                {mechanism.enabled ? slider.format(mechanism.rate) : 'off'}
              </span>
            </div>
            <input
              type="range"
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={mechanism.rate}
              disabled={!mechanism.enabled}
              onChange={(e) => setAiTaxMechanism(key, { rate: Number(e.target.value) })}
              className="w-full mt-1 disabled:opacity-40"
              style={{ accentColor: 'var(--series-avoided)' }}
            />
            <p className="text-[10.5px] text-text-muted leading-snug">{MECHANISM_DESCRIPTIONS[key]}</p>
            {key === 'tokenTax' && (
              <p className="text-[10.5px] text-text-secondary leading-snug mt-1 tabular-nums">
                {metrics ? `≈ ${formatCompactNumber(metrics.tokensConsumed * 1000)} tokens consumed /mo` : '—'}
              </p>
            )}
            {key === 'energyTax' && (
              <p className="text-[10.5px] text-text-secondary leading-snug mt-1 tabular-nums">
                {metrics ? `≈ ${formatCompactNumber(metrics.kwhConsumed)} kWh consumed /mo` : '—'}
              </p>
            )}
            {key === 'equityCapture' && (
              <div className="mt-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] ${mechanism.enabled ? 'text-text-secondary' : 'text-text-muted/40'}`}>
                    Annual fund liquidation
                  </span>
                  <span className={`text-[11px] tabular-nums ${mechanism.enabled ? 'text-text-muted' : 'text-text-muted/40'}`}>
                    {formatPercent(mechanisms.equityCapture.annualLiquidationPct)}/yr
                  </span>
                </div>
                <input
                  type="range"
                  min={0.01}
                  max={0.5}
                  step={0.01}
                  value={mechanisms.equityCapture.annualLiquidationPct}
                  disabled={!mechanism.enabled}
                  onChange={(e) => setAiTaxMechanism('equityCapture', { annualLiquidationPct: Number(e.target.value) })}
                  className="w-full mt-1 disabled:opacity-40"
                  style={{ accentColor: 'var(--series-avoided)' }}
                />
                <p className="text-[10.5px] text-text-muted leading-snug">
                  Share of the accumulated public equity fund sold off each year to fund the
                  dividend/UBI — the rest stays invested as an ongoing public stake.
                </p>
              </div>
            )}
          </div>
        );
      })}

      <div className="pt-2 mt-1 border-t border-gridline">
        <div className="flex items-center justify-between gap-2">
          <ToggleSwitch
            checked={ubi.enabled}
            onChange={(checked) => setUbi({ enabled: checked })}
            label="Redistribute as UBI"
            accentColor="var(--status-good)"
          />
        </div>
        <p className="text-[10.5px] text-text-muted leading-snug mt-1">
          When on, 100% of the AI/automation tax revenue above is paid out to active agents each
          month — not a separate budget line. It's a pure redistribution of that pot.
        </p>
        {ubi.enabled && MECHANISM_ORDER.every((key) => !mechanisms[key].enabled) && (
          <p className="text-[10.5px] leading-snug mt-1" style={{ color: 'var(--status-warning)' }}>
            No AI/automation tax mechanism is enabled above, so this pot is $0 — UBI is on but
            currently paying out nothing.
          </p>
        )}
        <div className="flex items-center justify-between gap-2 mt-2">
          <span className={`text-xs ${ubi.enabled ? 'text-text-secondary' : 'text-text-muted/40'}`}>Progressivity</span>
          <span className={`text-[11px] tabular-nums ${ubi.enabled ? 'text-text-muted' : 'text-text-muted/40'}`}>
            {formatPercent(ubi.taperStrength)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={ubi.taperStrength}
          disabled={!ubi.enabled}
          onChange={(e) => setUbi({ taperStrength: Number(e.target.value) })}
          className="w-full mt-1 disabled:opacity-40"
          style={{ accentColor: 'var(--status-good)' }}
        />
        <p className="text-[10.5px] text-text-muted leading-snug">
          0% splits the pot equally. 100% tapers it so lower-income agents get roughly double the
          flat share and the highest earners approach zero — same total either way.
        </p>
      </div>
    </div>
  );
}
