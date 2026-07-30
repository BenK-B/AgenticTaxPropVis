export interface TaxBracket {
  /** Annual income above which this rate applies. Ascending, first is always 0. */
  threshold: number;
  rate: number;
}

export interface AiTaxMechanism {
  enabled: boolean;
  /** 0-1, applied to AI/automation-attributed revenue or capital gains. */
  rate: number;
}

export interface EquityCaptureMechanism extends AiTaxMechanism {
  /**
   * 0-1, share of the accumulated public equity fund sold off once a year (every 12 ticks).
   * Unlike the other 4 mechanisms, captured equity isn't recognized as spendable revenue the
   * month it's captured — it accrues as a public stake, and only this annual sale converts a
   * slice of it to cash, which is what actually reaches the AI-tax revenue pot (and UBI).
   */
  annualLiquidationPct: number;
}

export interface AiTaxMechanisms {
  /** Per-token compute tax on AI-attributed business revenue. */
  tokenTax: AiTaxMechanism;
  /** Energy-consumption tax on AI-attributed business revenue. */
  energyTax: AiTaxMechanism;
  /** Sam Altman-style: AI companies contribute a % of AI-attributed revenue. */
  revenueContribution: AiTaxMechanism;
  /** Digital services / robot-automation tax on AI-attributed business revenue. */
  automationTax: AiTaxMechanism;
  /** Bernie Sanders-style: public equity fund captures a % of AI-linked capital gains. */
  equityCapture: EquityCaptureMechanism;
}

export interface UbiPolicy {
  /** When on, 100% of that tick's AI/automation tax revenue is redistributed as UBI. */
  enabled: boolean;
  /**
   * 0-1. 0 = flat equal split across active agents. 1 = maximally progressive — weights the
   * split so the lowest-income agents get roughly double the flat share and the highest-income
   * agents approach a zero share. The total payout always equals the AI-tax pot regardless of
   * this value; it only changes who gets how much of it.
   */
  taperStrength: number;
}

export interface Policy {
  brackets: [TaxBracket, TaxBracket, TaxBracket];
  capitalGainsRate: number;
  /** 0-1, fraction of active population audited per tick. */
  auditBudgetPct: number;
  /** UBI is funded entirely by AI/automation tax revenue, not general appropriation. */
  ubi: UbiPolicy;
  aiTaxMechanisms: AiTaxMechanisms;
}
