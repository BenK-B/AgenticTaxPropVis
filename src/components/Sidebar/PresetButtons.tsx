import { useSimStore } from '@/state/useSimStore';
import { DEFAULT_POLICY } from '@/engine';
import type { Policy } from '@/types';

const PRESETS: { label: string; description: string; policy: Partial<Policy> }[] = [
  {
    label: 'Status quo',
    description: 'Default brackets, no AI taxes, light enforcement.',
    policy: DEFAULT_POLICY,
  },
  {
    label: 'High progressive + UBI',
    description: 'Steeper top brackets funding a flat monthly payout.',
    policy: {
      brackets: [
        { threshold: 0, rate: 0.15 },
        { threshold: 45000, rate: 0.32 },
        { threshold: 180000, rate: 0.55 },
      ],
      capitalGainsRate: 0.28,
      ubiPayout: 1200,
    },
  },
  {
    label: 'Full AI tax package',
    description: 'All five AI/automation mechanisms enabled at moderate rates.',
    policy: {
      aiTaxMechanisms: {
        tokenTax: { enabled: true, rate: 0.1 },
        energyTax: { enabled: true, rate: 0.08 },
        revenueContribution: { enabled: true, rate: 0.05 },
        automationTax: { enabled: true, rate: 0.06 },
        equityCapture: { enabled: true, rate: 0.15 },
      },
    },
  },
  {
    label: 'Equity capture only',
    description: "Sanders-style public equity fund on AI-linked capital gains.",
    policy: {
      aiTaxMechanisms: {
        ...DEFAULT_POLICY.aiTaxMechanisms,
        equityCapture: { enabled: true, rate: 0.2 },
      },
    },
  },
  {
    label: 'Low tax / low audit',
    description: 'Flatter brackets, minimal enforcement.',
    policy: {
      brackets: [
        { threshold: 0, rate: 0.08 },
        { threshold: 60000, rate: 0.15 },
        { threshold: 250000, rate: 0.22 },
      ],
      capitalGainsRate: 0.1,
      auditBudgetPct: 0.005,
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
