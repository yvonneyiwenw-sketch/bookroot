export type DictionaryPart = {
  part: string;
  meaning: string;
};

/**
 * BookRoot supports both the original built-in dictionary fields and the
 * richer bilingual fields returned by AI. Keeping the legacy fields optional
 * means the existing 1,000-word JSON file continues to work unchanged.
 */
export type DictionaryEntry = {
  term: string;
  slug: string;
  category: string;
  partOfSpeech: string;

  // Rich bilingual AI fields
  meaningZh?: string;
  definitionEn?: string;
  professionalExplanationEn?: string;
  professionalExplanationZh?: string;
  whyThisWordEn?: string;
  whyThisWordZh?: string;
  originEn?: string;
  originZh?: string;
  memoryTrickEn?: string;
  memoryTrickZh?: string;
  exampleEn?: string;
  exampleZh?: string;
  realLifeApplicationEn?: string;
  realLifeApplicationZh?: string;
  australianUsageEn?: string;
  australianUsageZh?: string;
  visualDescriptionEn?: string;
  visualDescriptionZh?: string;
  imagePrompt?: string;

  // CEFR vocabulary estimate
  cefrLevel?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Off-list";
  cefrConfidence?: "high" | "medium" | "low";
  cefrReasonEn?: string;
  cefrReasonZh?: string;
  isTechnicalTerm?: boolean;

  // Shared fields
  wordParts: DictionaryPart[];
  relatedWords: string[];

  // Legacy built-in dictionary fields
  chinese?: string;
  definition?: string;
  whyThisWord?: string;
  origin?: string;
  memoryTrick?: string;
  example?: string;
  australianUsage?: string;
};

export type DictionaryFile = {
  entries: DictionaryEntry[];
};

export function dictionaryText(entry: DictionaryEntry) {
  return {
    meaningZh: entry.meaningZh || entry.chinese || "暂无中文释义",
    definitionEn: entry.definitionEn || entry.definition || "No English definition available.",
    professionalExplanationEn:
      entry.professionalExplanationEn || entry.definitionEn || entry.definition || "",
    professionalExplanationZh:
      entry.professionalExplanationZh || entry.meaningZh || entry.chinese || "",
    whyThisWordEn: entry.whyThisWordEn || entry.whyThisWord || "",
    whyThisWordZh: entry.whyThisWordZh || "",
    originEn: entry.originEn || entry.origin || "",
    originZh: entry.originZh || "",
    memoryTrickEn: entry.memoryTrickEn || entry.memoryTrick || "",
    memoryTrickZh: entry.memoryTrickZh || "",
    exampleEn: entry.exampleEn || entry.example || "",
    exampleZh: entry.exampleZh || "",
    realLifeApplicationEn: entry.realLifeApplicationEn || "",
    realLifeApplicationZh: entry.realLifeApplicationZh || "",
    australianUsageEn: entry.australianUsageEn || entry.australianUsage || "",
    australianUsageZh: entry.australianUsageZh || "",
    visualDescriptionEn: entry.visualDescriptionEn || "",
    visualDescriptionZh: entry.visualDescriptionZh || "",
    imagePrompt: entry.imagePrompt || "",
    cefrLevel: entry.cefrLevel,
    cefrConfidence: entry.cefrConfidence,
    cefrReasonEn: entry.cefrReasonEn || "",
    cefrReasonZh: entry.cefrReasonZh || "",
    isTechnicalTerm: entry.isTechnicalTerm || false,
  };
}
