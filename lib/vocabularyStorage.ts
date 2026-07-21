import type { AnalysisSettings, ReviewHistoryEntry, CefrLevel, VocabularyItem, VocabularyStatus, WordCandidate } from "@/types/vocabulary";

export const STORAGE_KEYS = {
  vocabulary: "bookroot-vocabulary-v1",
  hiddenWords: "bookroot-hidden-words-v1",
  analysisSettings: "bookroot-analysis-settings-v1",
  reviewHistory: "bookroot-review-history-v1",
} as const;

const defaultSettings: AnalysisSettings = { minimumLength: 4, minimumFrequency: 2 };

function safeParse<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getVocabulary(): VocabularyItem[] {
  const items = safeParse<VocabularyItem[]>(STORAGE_KEYS.vocabulary, []);
  return Array.isArray(items) ? items : [];
}

export function saveVocabulary(items: VocabularyItem[]): void {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEYS.vocabulary, JSON.stringify(items));
}

type WordCandidateWithLevel = WordCandidate & {
  level?: CefrLevel;
};

export function addVocabularyItems(
  candidates: WordCandidateWithLevel[],
  documentName: string,
): VocabularyItem[] {
  const current = getVocabulary();
  const now = new Date().toISOString();

  const byWord = new Map(
    current.map((item) => [
      item.normalizedWord,
      item,
    ]),
  );

  for (const candidate of candidates) {
    const normalizedWord = candidate.word
      .trim()
      .toLowerCase();

    const existing = byWord.get(normalizedWord);

    if (existing) {
      const sourceIndex = existing.sources.findIndex(
        (source) =>
          source.documentName === documentName,
      );

      const sources = [...existing.sources];

      if (sourceIndex >= 0) {
        sources[sourceIndex] = {
          ...sources[sourceIndex],
          frequency: candidate.count,
          firstPage: candidate.firstPage,
        };
      } else {
        sources.push({
          documentName,
          frequency: candidate.count,
          firstPage: candidate.firstPage,
          addedAt: now,
        });
      }

      byWord.set(normalizedWord, {
        ...existing,

        // 如果词库中已经有等级，就保留原等级。
        // 如果旧词没有等级，就补上 Candidate 已经计算好的等级。
        level: existing.level ?? candidate.level,

        sources,
        updatedAt: now,
      });
    } else {
      byWord.set(normalizedWord, {
        id:
          typeof crypto !== "undefined" &&
          "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${normalizedWord}-${Date.now()}`,

        word: candidate.word,
        normalizedWord,

        // 直接保存 Reader 页面已经计算好的 CEFR 等级。
        level: candidate.level,

        status: "new",
        meaning: "",
        notes: "",

        sources: [
          {
            documentName,
            frequency: candidate.count,
            firstPage: candidate.firstPage,
            addedAt: now,
          },
        ],

        createdAt: now,
        updatedAt: now,
        nextReviewAt: now,

        reviewCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        streak: 0,
      });
    }
  }

  const merged = [...byWord.values()];

  saveVocabulary(merged);

  return merged;
}

export function updateVocabularyItem(id: string, patch: Partial<VocabularyItem>): VocabularyItem[] {
  const next = getVocabulary().map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item);
  saveVocabulary(next);
  return next;
}

export function deleteVocabularyItem(id: string): VocabularyItem[] {
  const next = getVocabulary().filter((item) => item.id !== id);
  saveVocabulary(next);
  return next;
}

export function getVocabularyByStatus(status: VocabularyStatus): VocabularyItem[] {
  return getVocabulary().filter((item) => item.status === status);
}

export function getDueVocabulary(now = new Date()): VocabularyItem[] {
  return getVocabulary().filter((item) => item.status !== "mastered" && new Date(item.nextReviewAt).getTime() <= now.getTime());
}

export function isWordSaved(word: string): VocabularyItem | undefined {
  return getVocabulary().find((item) => item.normalizedWord === word.toLowerCase());
}

export function getHiddenWords(): string[] {
  const words = safeParse<string[]>(STORAGE_KEYS.hiddenWords, []);
  return Array.isArray(words) ? words : [];
}

export function saveHiddenWords(words: string[]): void {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEYS.hiddenWords, JSON.stringify([...new Set(words)]));
}

export function getAnalysisSettings(): AnalysisSettings {
  return safeParse<AnalysisSettings>(STORAGE_KEYS.analysisSettings, defaultSettings);
}

export function saveAnalysisSettings(settings: AnalysisSettings): void {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEYS.analysisSettings, JSON.stringify(settings));
}

export function getReviewHistory(): ReviewHistoryEntry[] {
  const entries = safeParse<ReviewHistoryEntry[]>(STORAGE_KEYS.reviewHistory, []);
  return Array.isArray(entries) ? entries : [];
}

export function addReviewHistory(entry: ReviewHistoryEntry): void {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEYS.reviewHistory, JSON.stringify([...getReviewHistory(), entry]));
}

export function exportLearningData(): string {
  return JSON.stringify({ version: 1, vocabulary: getVocabulary(), reviewHistory: getReviewHistory(), exportedAt: new Date().toISOString() }, null, 2);
}

export function importLearningData(raw: string): number {
  const parsed = JSON.parse(raw) as { vocabulary?: VocabularyItem[]; reviewHistory?: ReviewHistoryEntry[] };
  if (!Array.isArray(parsed.vocabulary)) throw new Error("Invalid BookRoot data file.");
  const current = getVocabulary();
  const map = new Map(current.map((item) => [item.normalizedWord, item]));
  let imported = 0;
  for (const item of parsed.vocabulary) {
    if (!item?.normalizedWord || !item?.word) continue;
    if (!map.has(item.normalizedWord)) imported += 1;
    map.set(item.normalizedWord, map.has(item.normalizedWord) ? { ...map.get(item.normalizedWord)!, ...item, id: map.get(item.normalizedWord)!.id } : item);
  }
  saveVocabulary([...map.values()]);
  if (Array.isArray(parsed.reviewHistory) && typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEYS.reviewHistory, JSON.stringify(parsed.reviewHistory));
  return imported;
}
