import type { VocabularyItem } from "@/types/vocabulary";

const minutes = (value: number) => value * 60 * 1000;
const days = (value: number) => value * 24 * 60 * 60 * 1000;

export type ReviewRating = "again" | "hard" | "good";

export function applyReview(item: VocabularyItem, rating: ReviewRating, now = new Date()): VocabularyItem {
  const firstReviewedAt = item.firstReviewedAt ?? now.toISOString();
  let streak = item.streak;
  let correctCount = item.correctCount;
  let incorrectCount = item.incorrectCount;
  let status = item.status;
  let delay = days(1);

  if (rating === "again") {
    streak = 0;
    incorrectCount += 1;
    delay = minutes(10);
    status = "learning";
  } else if (rating === "hard") {
    streak = Math.min(Math.max(streak, 1), 1);
    delay = days(1);
    status = "learning";
  } else {
    streak += 1;
    correctCount += 1;
    if (streak === 1) delay = days(1);
    else if (streak === 2) delay = days(3);
    else if (streak === 3) delay = days(7);
    else if (streak === 4) delay = days(14);
    else delay = days(30);
    status = streak >= 5 ? "mastered" : "learning";
  }

  const next = new Date(now.getTime() + delay).toISOString();
  return {
    ...item,
    status,
    streak,
    correctCount,
    incorrectCount,
    reviewCount: item.reviewCount + 1,
    firstReviewedAt,
    lastReviewedAt: now.toISOString(),
    nextReviewAt: next,
    updatedAt: now.toISOString(),
  };
}
