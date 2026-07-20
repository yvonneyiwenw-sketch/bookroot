export type VocabularyStatus = "new" | "learning" | "mastered";

export type VocabularySource = {
  documentName: string;
  frequency: number;
  firstPage?: number;
  addedAt: string;
};

export type VocabularyItem = {
  id: string;
  word: string;
  normalizedWord: string;
  status: VocabularyStatus;
  meaning: string;
  notes: string;
  sources: VocabularySource[];
  createdAt: string;
  updatedAt: string;
  firstReviewedAt?: string;
  lastReviewedAt?: string;
  nextReviewAt: string;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  streak: number;
};

export type WordCandidate = {
  word: string;
  count: number;
  firstPage?: number;
};

export type AnalysisSettings = {
  minimumLength: 3 | 4 | 5;
  minimumFrequency: 1 | 2 | 3 | 5;
};

export type ReviewHistoryEntry = {
  id: string;
  wordId: string;
  word: string;
  rating: "again" | "hard" | "good";
  reviewedAt: string;
  nextReviewAt: string;
};
