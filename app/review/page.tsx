"use client";

import { useEffect, useMemo, useState } from "react";
import PageShell from "@/components/PageShell";

import {
  applyReview,
  type ReviewRating,
} from "@/lib/reviewScheduler";

import {
  addReviewHistory,
  getDueVocabulary,
  getVocabulary,
  saveVocabulary,
  updateVocabularyItem,
} from "@/lib/vocabularyStorage";

import { dictionaryByTerm } from "@/lib/buildingDictionary";

import {
  findAiDictionaryEntry,
  normaliseDictionaryTerm,
} from "@/lib/aiDictionaryStorage";

import { getCefrEvaluation } from "@/lib/cefrStorage";

import {
  dictionaryText,
  type DictionaryEntry,
} from "@/types/dictionary";

import type { VocabularyItem } from "@/types/vocabulary";

const DICTIONARY_DOMAIN = "building-construction";

type DictionarySource =
  | "personal"
  | "built-in"
  | "ai"
  | "missing";

type ReviewExplanation = {
  source: DictionarySource;
  entry?: DictionaryEntry;
  meaningZh: string;
  definitionEn: string;
};

function getPossibleDictionaryTerms(word: string): string[] {
  const normalized = normaliseDictionaryTerm(word);
  const possibilities = [normalized];

  if (normalized.endsWith("ies") && normalized.length > 4) {
    possibilities.push(`${normalized.slice(0, -3)}y`);
  }

  if (normalized.endsWith("es") && normalized.length > 3) {
    possibilities.push(normalized.slice(0, -2));
  }

  if (normalized.endsWith("s") && normalized.length > 2) {
    possibilities.push(normalized.slice(0, -1));
  }

  if (normalized.endsWith("ing") && normalized.length > 5) {
    possibilities.push(normalized.slice(0, -3));
    possibilities.push(`${normalized.slice(0, -3)}e`);
  }

  if (normalized.endsWith("ed") && normalized.length > 4) {
    possibilities.push(normalized.slice(0, -2));
    possibilities.push(normalized.slice(0, -1));
  }

  return [...new Set(possibilities)];
}

function findDictionaryEntry(word: string): {
  entry?: DictionaryEntry;
  source: "built-in" | "ai" | "missing";
} {
  const possibleTerms = getPossibleDictionaryTerms(word);

  for (const term of possibleTerms) {
    const builtInEntry = dictionaryByTerm.get(term);

    if (builtInEntry) {
      return {
        entry: builtInEntry,
        source: "built-in",
      };
    }
  }

  for (const term of possibleTerms) {
    const aiEntry = findAiDictionaryEntry(
      term,
      DICTIONARY_DOMAIN,
    );

    if (aiEntry) {
      return {
        entry: aiEntry,
        source: "ai",
      };
    }
  }

  return {
    source: "missing",
  };
}

function splitPersonalMeaning(meaning: string): {
  meaningZh: string;
  definitionEn: string;
} {
  const separators = ["—", " - ", "–"];

  for (const separator of separators) {
    const separatorIndex = meaning.indexOf(separator);

    if (separatorIndex >= 0) {
      return {
        meaningZh: meaning
          .slice(0, separatorIndex)
          .trim(),

        definitionEn: meaning
          .slice(separatorIndex + separator.length)
          .trim(),
      };
    }
  }

  return {
    meaningZh: meaning.trim(),
    definitionEn: "",
  };
}

function getReviewExplanation(
  item: VocabularyItem,
): ReviewExplanation {
  const dictionaryResult = findDictionaryEntry(
    item.word,
  );

  if (dictionaryResult.entry) {
    const text = dictionaryText(
      dictionaryResult.entry,
    );

    return {
      source: dictionaryResult.source,
      entry: dictionaryResult.entry,
      meaningZh: text.meaningZh,
      definitionEn: text.definitionEn,
    };
  }

  if (item.meaning.trim()) {
    const personalMeaning = splitPersonalMeaning(
      item.meaning,
    );

    return {
      source: "personal",
      meaningZh: personalMeaning.meaningZh,
      definitionEn: personalMeaning.definitionEn,
    };
  }

  return {
    source: "missing",
    meaningZh: "",
    definitionEn: "",
  };
}

export default function ReviewPage() {
  const [allItems, setAllItems] = useState<
    VocabularyItem[]
  >([]);

  const [queue, setQueue] = useState<
    VocabularyItem[]
  >([]);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [mastered, setMastered] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const vocabulary = getVocabulary();

      const enrichedVocabulary = vocabulary.map(
        (item) => {
          if (item.meaning.trim()) {
            return item;
          }

          const dictionaryResult =
            findDictionaryEntry(item.word);

          if (!dictionaryResult.entry) {
            return item;
          }

          const text = dictionaryText(
            dictionaryResult.entry,
          );

          const meaning =
            `${text.meaningZh} — ${text.definitionEn}`;

          updateVocabularyItem(item.id, {
            meaning,
          });

          return {
            ...item,
            meaning,
            updatedAt: new Date().toISOString(),
          };
        },
      );

      setAllItems(enrichedVocabulary);

      const dueIds = new Set(
        getDueVocabulary().map(
          (item) => item.id,
        ),
      );

      setQueue(
        enrichedVocabulary.filter((item) =>
          dueIds.has(item.id),
        ),
      );
    }, 0);

    return () =>
      window.clearTimeout(timer);
  }, []);

  const current = queue[index];

  const counts = useMemo(
    () => ({
      new: allItems.filter(
        (item) => item.status === "new",
      ).length,

      learning: allItems.filter(
        (item) => item.status === "learning",
      ).length,
    }),
    [allItems],
  );

  function review(rating: ReviewRating) {
    if (!current) return;

    const updated = applyReview(
      current,
      rating,
    );

    const nextAll = allItems.map((item) =>
      item.id === updated.id
        ? updated
        : item,
    );

    saveVocabulary(nextAll);
    setAllItems(nextAll);

    addReviewHistory({
      id: crypto.randomUUID(),
      wordId: updated.id,
      word: updated.word,
      rating,
      reviewedAt: updated.lastReviewedAt!,
      nextReviewAt: updated.nextReviewAt,
    });

    setReviewed((value) => value + 1);

    if (rating === "good") {
      setCorrect((value) => value + 1);
    }

    if (
      current.status !== "mastered" &&
      updated.status === "mastered"
    ) {
      setMastered((value) => value + 1);
    }

    setIndex((value) => value + 1);
    setRevealed(false);
  }

  function reviewAnyway() {
    setQueue(
      allItems.filter(
        (item) =>
          item.status !== "mastered",
      ),
    );

    setIndex(0);
    setReviewed(0);
    setCorrect(0);
    setMastered(0);
    setRevealed(false);
  }

  const complete =
    queue.length > 0 &&
    index >= queue.length;

  const explanation = current
    ? getReviewExplanation(current)
    : undefined;

  const cefr = current
    ? getCefrEvaluation(current.word)
    : undefined;

  const entryText =
    explanation?.entry
      ? dictionaryText(explanation.entry)
      : undefined;

  return (
    <PageShell
      title="Daily Review"
      subtitle="Review your saved vocabulary with bilingual dictionary explanations."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Due now"
          value={
            queue.length -
            Math.min(index, queue.length)
          }
        />

        <Stat
          label="New words"
          value={counts.new}
        />

        <Stat
          label="Learning words"
          value={counts.learning}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        {allItems.length === 0 ? (
          <Empty
            title="No vocabulary saved"
            text="Upload a PDF and add unfamiliar words first."
          />
        ) : queue.length === 0 ? (
          <div className="text-center">
            <h2 className="text-xl font-bold">
              Nothing is due right now
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              BookRoot will bring words back
              when their next review time arrives.
            </p>

            <button
              type="button"
              onClick={reviewAnyway}
              className="mt-5 rounded-xl bg-green-700 px-4 py-2 font-semibold text-white"
            >
              Review learning words anyway
            </button>
          </div>
        ) : complete ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold">
              Review complete
            </h2>

            <div className="mx-auto mt-5 grid max-w-xl gap-3 sm:grid-cols-3">
              <Stat
                label="Reviewed"
                value={reviewed}
              />

              <Stat
                label="Good"
                value={correct}
              />

              <Stat
                label="Mastered"
                value={mastered}
              />
            </div>

            <p className="mt-5 text-sm text-gray-500">
              Your next review dates have been
              saved in this browser.
            </p>
          </div>
        ) : current && explanation ? (
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                {index + 1} / {queue.length}
              </span>

              <div className="flex items-center gap-2">
                {cefr && (
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                    {cefr.level}

                    {cefr.isTechnicalTerm
                      ? " · Technical"
                      : ""}
                  </span>
                )}

                <span className="capitalize">
                  {current.status}
                </span>
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-stone-200 bg-stone-50 p-8 text-center">
              <p className="text-4xl font-bold capitalize">
                {current.word}
              </p>

              <p className="mt-3 text-sm text-gray-500">
                {
                  current.sources.at(-1)
                    ?.documentName
                }
              </p>

              {!revealed ? (
                <button
                  type="button"
                  onClick={() =>
                    setRevealed(true)
                  }
                  className="mt-8 rounded-xl bg-green-700 px-5 py-3 font-semibold text-white"
                >
                  Reveal
                </button>
              ) : (
                <div className="mt-8 text-left">
                  <div className="rounded-2xl bg-white p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Bilingual explanation
                      </p>

                      {explanation.source ===
                        "built-in" && (
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
                          BookRoot Dictionary
                        </span>
                      )}

                      {explanation.source ===
                        "ai" && (
                        <span className="rounded-full bg-purple-50 px-2 py-1 text-xs text-purple-700">
                          AI Dictionary
                        </span>
                      )}

                      {explanation.source ===
                        "personal" && (
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">
                          Personal meaning
                        </span>
                      )}
                    </div>

                    {explanation.meaningZh ? (
                      <>
                        <p className="mt-4 text-sm font-semibold text-gray-500">
                          中文释义
                        </p>

                        <p className="mt-1 text-lg leading-8 text-gray-900">
                          {
                            explanation.meaningZh
                          }
                        </p>

                        {explanation.definitionEn && (
                          <>
                            <p className="mt-5 text-sm font-semibold text-gray-500">
                              English definition
                            </p>

                            <p className="mt-1 text-lg leading-8 text-gray-800">
                              {
                                explanation.definitionEn
                              }
                            </p>
                          </>
                        )}
                      </>
                    ) : (
                      <p className="mt-4 text-gray-500">
                        No explanation is available yet.
                      </p>
                    )}

                    {entryText?.professionalExplanationZh && (
                      <>
                        <p className="mt-5 text-sm font-semibold text-gray-500">
                          专业解释
                        </p>

                        <p className="mt-1 leading-7 text-gray-700">
                          {
                            entryText.professionalExplanationZh
                          }
                        </p>
                      </>
                    )}

                    {entryText?.professionalExplanationEn && (
                      <>
                        <p className="mt-5 text-sm font-semibold text-gray-500">
                          Professional explanation
                        </p>

                        <p className="mt-1 leading-7 text-gray-700">
                          {
                            entryText.professionalExplanationEn
                          }
                        </p>
                      </>
                    )}

                    {entryText?.whyThisWordEn && (
                      <>
                        <p className="mt-5 text-sm font-semibold text-gray-500">
                          Why this word
                        </p>

                        <p className="mt-1 leading-7 text-gray-700">
                          {
                            entryText.whyThisWordEn
                          }
                        </p>

                        {entryText.whyThisWordZh && (
                          <p className="mt-1 leading-7 text-gray-500">
                            {
                              entryText.whyThisWordZh
                            }
                          </p>
                        )}
                      </>
                    )}

                    {entryText?.memoryTrickEn && (
                      <div className="mt-5 rounded-xl bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-800">
                          Memory trick
                        </p>

                        <p className="mt-2 leading-7 text-amber-900">
                          {
                            entryText.memoryTrickEn
                          }
                        </p>

                        {entryText.memoryTrickZh && (
                          <p className="mt-1 leading-7 text-amber-700">
                            {
                              entryText.memoryTrickZh
                            }
                          </p>
                        )}
                      </div>
                    )}

                    {entryText?.exampleEn && (
                      <div className="mt-5 border-l-4 border-green-200 pl-4">
                        <p className="text-sm font-semibold text-gray-500">
                          Example
                        </p>

                        <p className="mt-1 leading-7 text-gray-800">
                          {entryText.exampleEn}
                        </p>

                        {entryText.exampleZh && (
                          <p className="mt-1 leading-7 text-gray-500">
                            {
                              entryText.exampleZh
                            }
                          </p>
                        )}
                      </div>
                    )}

                    {(entryText?.realLifeApplicationEn ||
                      entryText?.realLifeApplicationZh) && (
                      <div className="mt-5 rounded-xl bg-green-50 p-4">
                        <p className="text-sm font-semibold text-green-800">
                          Real-life application
                        </p>

                        {entryText.realLifeApplicationEn && (
                          <p className="mt-2 leading-7 text-green-900">
                            {
                              entryText.realLifeApplicationEn
                            }
                          </p>
                        )}

                        {entryText.realLifeApplicationZh && (
                          <p className="mt-2 leading-7 text-green-800">
                            {
                              entryText.realLifeApplicationZh
                            }
                          </p>
                        )}
                      </div>
                    )}

                    {(entryText?.australianUsageEn ||
                      entryText?.australianUsageZh) && (
                      <div className="mt-5 rounded-xl bg-stone-50 p-4">
                        <p className="text-sm font-semibold text-gray-700">
                          Australian usage
                        </p>

                        {entryText.australianUsageEn && (
                          <p className="mt-2 leading-7 text-gray-800">
                            {
                              entryText.australianUsageEn
                            }
                          </p>
                        )}

                        {entryText.australianUsageZh && (
                          <p className="mt-1 leading-7 text-gray-500">
                            {
                              entryText.australianUsageZh
                            }
                          </p>
                        )}
                      </div>
                    )}

                    {current.notes && (
                      <>
                        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Personal notes
                        </p>

                        <p className="mt-2 text-gray-700">
                          {current.notes}
                        </p>
                      </>
                    )}

                    {cefr && (
                      <div className="mt-5 rounded-xl bg-blue-50 p-4">
                        <p className="text-sm font-semibold text-blue-800">
                          CEFR level: {cefr.level}

                          {cefr.isTechnicalTerm
                            ? " · Technical term"
                            : ""}
                        </p>

                        {cefr.reasonEn && (
                          <p className="mt-2 text-sm leading-6 text-blue-900">
                            {cefr.reasonEn}
                          </p>
                        )}

                        {cefr.reasonZh && (
                          <p className="mt-1 text-sm leading-6 text-blue-700">
                            {cefr.reasonZh}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() =>
                        review("again")
                      }
                      className="rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-700"
                    >
                      Again
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        review("hard")
                      }
                      className="rounded-xl bg-amber-50 px-4 py-3 font-semibold text-amber-700"
                    >
                      Hard
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        review("good")
                      }
                      className="rounded-xl bg-green-700 px-4 py-3 font-semibold text-white"
                    >
                      Good
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}

function Empty({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="text-center">
      <h2 className="text-xl font-bold">
        {title}
      </h2>

      <p className="mt-2 text-sm text-gray-500">
        {text}
      </p>
    </div>
  );
}