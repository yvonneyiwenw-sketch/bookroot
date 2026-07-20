"use client";

import type { DictionaryEntry } from "@/types/dictionary";

const STORAGE_KEY = "bookroot.aiDictionaryEntries.v1";

export type CachedDictionaryEntry = DictionaryEntry & {
  source: "ai";
  cacheKey: string;
  generatedAt: string;
  model?: string;
};

export function normaliseDictionaryTerm(term: string): string {
  return term
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ");
}

export function createDictionaryCacheKey(term: string, domain = "building-construction"): string {
  return `${normaliseDictionaryTerm(term)}::${domain}::zh-CN::v1`;
}

export function readAiDictionaryEntries(): CachedDictionaryEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CachedDictionaryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function findAiDictionaryEntry(term: string, domain = "building-construction") {
  const cacheKey = createDictionaryCacheKey(term, domain);
  return readAiDictionaryEntries().find((entry) => entry.cacheKey === cacheKey);
}

export function findAiDictionaryEntryBySlug(slug: string) {
  return readAiDictionaryEntries().find((entry) => entry.slug === slug);
}

export function saveAiDictionaryEntry(
  entry: DictionaryEntry,
  domain = "building-construction",
  model?: string,
): CachedDictionaryEntry {
  const cacheKey = createDictionaryCacheKey(entry.term, domain);
  const next: CachedDictionaryEntry = {
    ...entry,
    source: "ai",
    cacheKey,
    generatedAt: new Date().toISOString(),
    model,
  };

  const existing = readAiDictionaryEntries();
  const withoutDuplicate = existing.filter((item) => item.cacheKey !== cacheKey);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([next, ...withoutDuplicate]));
  return next;
}
