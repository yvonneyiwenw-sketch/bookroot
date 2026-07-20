import { STOP_WORDS } from "./stopWords";
import type { AnalysisSettings, WordCandidate } from "@/types/vocabulary";

export type PageText = { page: number; text: string };

function normalizeToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/'s$/i, "")
    .replace(/^'+|'+$/g, "");
}

function isDrawingCode(token: string): boolean {
  return /\d/.test(token) || /^[a-z]{1,4}\d+[a-z]*$/i.test(token);
}

export function analysePageTexts(
  pages: PageText[],
  settings: AnalysisSettings,
  hiddenWords: Set<string>
): WordCandidate[] {
  const counts = new Map<string, { count: number; firstPage: number }>();

  for (const page of pages) {
    const cleaned = page.text
      .replace(/https?:\/\/\S+/gi, " ")
      .replace(/\b\S+@\S+\.\S+\b/g, " ")
      .replace(/[’‘]/g, "'");

    const tokens = cleaned.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? [];
    for (const raw of tokens) {
      const word = normalizeToken(raw);
      if (
        word.length < settings.minimumLength ||
        STOP_WORDS.has(word) ||
        hiddenWords.has(word) ||
        isDrawingCode(word)
      ) {
        continue;
      }
      const existing = counts.get(word);
      counts.set(word, {
        count: (existing?.count ?? 0) + 1,
        firstPage: existing?.firstPage ?? page.page,
      });
    }
  }

  return [...counts.entries()]
    .filter(([, value]) => value.count >= settings.minimumFrequency)
    .map(([word, value]) => ({ word, count: value.count, firstPage: value.firstPage }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}
