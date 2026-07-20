export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "Off-list"] as const;

export type CefrLevel = (typeof CEFR_LEVELS)[number];
export type CefrConfidence = "high" | "medium" | "low";

export type CefrEvaluation = {
  term: string;
  normalizedTerm: string;
  level: CefrLevel;
  confidence: CefrConfidence;
  isTechnicalTerm: boolean;
  reasonEn: string;
  reasonZh: string;
};

export type CachedCefrEvaluation = CefrEvaluation & {
  cacheKey: string;
  evaluatedAt: string;
  model?: string;
};
