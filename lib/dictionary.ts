import type { DictionaryEntry, DictionaryFile } from "@/types/dictionary";
import sampleDictionary from "@/data/dictionary/building-construction.sample.json";

const dictionaryFile = sampleDictionary as DictionaryFile;

export const dictionaryEntries: DictionaryEntry[] = dictionaryFile.entries;

const bySlug = new Map(dictionaryEntries.map((entry) => [entry.slug, entry]));
const byTerm = new Map<string, DictionaryEntry>();

for (const entry of dictionaryEntries) {
  const terms = [entry.word, entry.slug, ...entry.aliases, ...(entry.searchTerms ?? [])];
  for (const term of terms) {
    const key = normalizeDictionaryTerm(term);
    if (key && !byTerm.has(key)) byTerm.set(key, entry);
  }
}

export function normalizeDictionaryTerm(value: string): string {
  return value.trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ");
}

export function getDictionaryEntryBySlug(slug: string): DictionaryEntry | undefined {
  return bySlug.get(slug);
}

export function findDictionaryEntry(term: string): DictionaryEntry | undefined {
  return byTerm.get(normalizeDictionaryTerm(term));
}

export function searchDictionary(query: string): DictionaryEntry[] {
  const normalized = normalizeDictionaryTerm(query);
  if (!normalized) return dictionaryEntries;

  return dictionaryEntries.filter((entry) => {
    const haystack = [
      entry.word,
      entry.meaningZh,
      entry.definitionEn,
      entry.professionalMeaningZh ?? "",
      ...entry.aliases,
      ...entry.tags,
      ...(entry.searchTerms ?? []),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}
