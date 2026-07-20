"use client";

import type { CachedCefrEvaluation, CefrEvaluation } from "@/types/cefr";

const STORAGE_KEY = "bookroot.cefrEvaluations.v1";

export function normaliseCefrTerm(term: string): string {
  return term.trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ");
}

export function createCefrCacheKey(term: string): string {
  return `${normaliseCefrTerm(term)}::general-english::cefr::v1`;
}

export function readCefrEvaluations(): CachedCefrEvaluation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CachedCefrEvaluation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getCefrEvaluation(term: string): CachedCefrEvaluation | undefined {
  const key = createCefrCacheKey(term);
  return readCefrEvaluations().find((item) => item.cacheKey === key);
}

export function saveCefrEvaluations(
  evaluations: CefrEvaluation[],
  model?: string,
): CachedCefrEvaluation[] {
  const existing = readCefrEvaluations();
  const incomingKeys = new Set(evaluations.map((item) => createCefrCacheKey(item.term)));
  const retained = existing.filter((item) => !incomingKeys.has(item.cacheKey));
  const saved = evaluations.map((item) => ({
    ...item,
    normalizedTerm: normaliseCefrTerm(item.term),
    cacheKey: createCefrCacheKey(item.term),
    evaluatedAt: new Date().toISOString(),
    model,
  }));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...saved, ...retained]));
  return saved;
}
