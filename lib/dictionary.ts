import type { DictionaryEntry, DictionaryPart } from "@/types/dictionary";
import sampleDictionary from "@/data/dictionary/building-construction.sample.json";

type RawDictionaryEntry = {
  word: string;
  slug?: string;
  partOfSpeech?: string | string[];
  domains?: string[];

  meaningZh?: string;
  definitionEn?: string;

  professionalMeaningEn?: string;
  professionalMeaningZh?: string;

  whyThisWordEn?: string;
  whyThisWordZh?: string;

  originEn?: string;
  originZh?: string;

  memoryTrickEn?: string;
  memoryTrickZh?: string;

  exampleEn?: string;
  exampleZh?: string;

  australianUsageEn?: string;
  australianUsageZh?: string;

  wordParts?: DictionaryPart[];
  relatedWords?: string[];

  isTechnicalTerm?: boolean;
};

type RawDictionaryFile = {
  category?: string;
  entries: RawDictionaryEntry[];
};

const rawDictionary = sampleDictionary as unknown as RawDictionaryFile;

export const dictionaryEntries: DictionaryEntry[] =
  rawDictionary.entries.map((entry) => {
    const partOfSpeech = Array.isArray(entry.partOfSpeech)
      ? entry.partOfSpeech.join(", ")
      : entry.partOfSpeech || "";

    return {
      term: entry.word,
      slug: entry.slug || entry.word.toLowerCase().replace(/\s+/g, "-"),

      category:
        entry.domains?.[0] ||
        rawDictionary.category ||
        "General",

      partOfSpeech,

      meaningZh: entry.meaningZh,
      definitionEn: entry.definitionEn,

      professionalExplanationEn:
        entry.professionalMeaningEn || entry.definitionEn || "",

      professionalExplanationZh:
        entry.professionalMeaningZh || entry.meaningZh || "",

      whyThisWordEn: entry.whyThisWordEn,
      whyThisWordZh: entry.whyThisWordZh,

      originEn: entry.originEn,
      originZh: entry.originZh,

      memoryTrickEn: entry.memoryTrickEn,
      memoryTrickZh: entry.memoryTrickZh,

      exampleEn: entry.exampleEn,
      exampleZh: entry.exampleZh,

      australianUsageEn: entry.australianUsageEn,
      australianUsageZh: entry.australianUsageZh,

      isTechnicalTerm: entry.isTechnicalTerm ?? true,

      wordParts: entry.wordParts || [],
      relatedWords: entry.relatedWords || [],
    };
  });

const bySlug = new Map(
  dictionaryEntries.map((entry) => [entry.slug, entry])
);

export function getDictionaryEntry(
  termOrSlug: string
): DictionaryEntry | undefined {
  const normalized = termOrSlug.trim().toLowerCase();

  return (
    bySlug.get(normalized) ||
    dictionaryEntries.find(
      (entry) => entry.term.toLowerCase() === normalized
    )
  );
}

export function searchDictionary(
  query: string
): DictionaryEntry[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return dictionaryEntries;
  }

  return dictionaryEntries.filter((entry) => {
    return (
      entry.term.toLowerCase().includes(normalized) ||
      entry.slug.toLowerCase().includes(normalized) ||
      entry.meaningZh?.includes(query) ||
      entry.definitionEn?.toLowerCase().includes(normalized) ||
      entry.relatedWords.some((word) =>
        word.toLowerCase().includes(normalized)
      )
    );
  });
}