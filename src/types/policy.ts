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
  equityCapture: AiTaxMechanism;
}

export interface Policy {
  brackets: [TaxBracket, TaxBracket, TaxBracket];
  capitalGainsRate: number;
  /** 0-1, fraction of active population audited per tick. */
  auditBudgetPct: number;
  /** Flat monthly $ paid to every active agent. */
  ubiPayout: number;
  aiTaxMechanisms: AiTaxMechanisms;
}
