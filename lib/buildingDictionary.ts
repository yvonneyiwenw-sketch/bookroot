import rawEntries from "@/data/buildingDictionary.json";
import type { DictionaryEntry } from "@/types/dictionary";

export const buildingDictionary = rawEntries as DictionaryEntry[];

export const dictionaryByTerm = new Map(
  buildingDictionary.map((entry) => [entry.term.toLowerCase(), entry]),
);

export const dictionaryBySlug = new Map(
  buildingDictionary.map((entry) => [entry.slug, entry]),
);

export const dictionaryCategories = [
  ...new Set(buildingDictionary.map((entry) => entry.category)),
].sort();

export function searchDictionary(query: string, category = "all") {
  const normalized = query.trim().toLowerCase();
  return buildingDictionary.filter((entry) => {
    const matchesCategory = category === "all" || entry.category === category;
    if (!matchesCategory) return false;
    if (!normalized) return true;
    return [
      entry.term,
      entry.chinese,
      entry.definition,
      entry.category,
      ...entry.relatedWords,
    ].some((value) => (value ?? "").toLowerCase().includes(normalized));
  });
}

export function findDictionaryMatches(text: string) {
  const normalizedText = ` ${text.toLowerCase().replace(/[^a-z0-9-]+/g, " ").replace(/\s+/g, " ")} `;
  return buildingDictionary
    .map((entry) => {
      const escaped = entry.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const count = (normalizedText.match(new RegExp(`\\b${escaped.replace(/\\ /g, "\\s+")}\\b`, "g")) ?? []).length;
      return { entry, count };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.entry.term.localeCompare(b.entry.term));
}
