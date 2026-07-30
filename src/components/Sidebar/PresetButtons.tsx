import { useSimStore } from '@/state/useSimStore';
import { DEFAULT_POLICY } from '@/engine';
import type { Policy } from '@/types';

// Each preset fully specifies aiTaxMechanisms and ubi (not a partial subset) so presets stay
// idempotent regardless of what was clicked before — applyPreset's merge would otherwise leave
// stale enabled mechanisms/UBI settings from a previously-applied preset in place.
const PRESETS: { label: string; description: string; policy: Partial<Policy> }[] = [
  {
    label: 'Status quo',
    description: 'Default brackets, no AI taxes, no UBI, light enforcement.',
    policy: DEFAULT_POLICY,
  },
  {
    label: 'High progressive + UBI',
    description: 'Steeper brackets; taxes AI (token + revenue contribution) to fund a tapered UBI.',
    policy: {
      brackets: [
        { threshold: 0, rate: 0.15 },
        { threshold: 45000, rate: 0.32 },
        { threshold: 180000, rate: 0.55 },
      ],
      capitalGainsRate: 0.28,
      aiTaxMechanisms: {
        tokenTax: { enabled: true, rate: 0.008 }, // $/1,000 tokens — 80% surcharge on market price
        energyTax: { enabled: false, rate: 0.05 },
        revenueContribution: { enabled: true, rate: 0.08 },
        automationTax: { enabled: false, rate: 0.06 },
        equityCapture: { enabled: false, rate: 0.1, annualLiquidationPct: 0.08 },
      },
      ubi: { enabled: true, taperStrength: 0.6 },
    },
  },
  {
    label: 'Full AI tax package',
    description: 'All five AI/automation mechanisms enabled, fully redistributed as UBI.',
    policy: {
      aiTaxMechanisms: {
        tokenTax: { enabled: true, rate: 0.006 }, // $/1,000 tokens
        energyTax: { enabled: true, rate: 0.08 }, // $/kWh
        revenueContribution: { enabled: true, rate: 0.05 },
        automationTax: { enabled: true, rate: 0.06 },
        equityCapture: { enabled: true, rate: 0.15, annualLiquidationPct: 0.08 },
      },
      ubi: { enabled: true, taperStrength: 0.5 },
    },
  },
  {
    label: 'Equity capture only',
    description: 'Sanders-style public equity fund on AI-linked capital gains, paid out as a dividend.',
    policy: {
      aiTaxMechanisms: {
        tokenTax: { enabled: false, rate: 0.005 },
        energyTax: { enabled: false, rate: 0.05 },
        revenueContribution: { enabled: false, rate: 0.05 },
        automationTax: { enabled: false, rate: 0.06 },
        equityCapture: { enabled: true, rate: 0.2, annualLiquidationPct: 0.08 },
      },
      ubi: { enabled: true, taperStrength: 0.7 },
    },
  },
  {
    label: 'Low tax / low audit',
    description: 'Flatter brackets, minimal enforcement, no AI taxes or UBI.',
    policy: {
      brackets: [
        { threshold: 0, rate: 0.08 },
        { threshold: 60000, rate: 0.15 },
        { threshold: 250000, rate: 0.22 },
      ],
      capitalGainsRate: 0.1,
      auditBudgetPct: 0.005,
      aiTaxMechanisms: DEFAULT_POLICY.aiTaxMechanisms,
      ubi: DEFAULT_POLICY.ubi,
    },
  },
];

export function PresetButtons() {
  const applyPreset = useSimStore((s) => s.applyPreset);

  return (
    <div className="card">
      <div className="section-title mb-2">Presets</div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="preset-pill"
            title={preset.description}
            onClick={() => applyPreset(preset.policy)}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
