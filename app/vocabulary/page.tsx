"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PageShell from "@/components/PageShell";
import {
  deleteVocabularyItem,
  exportLearningData,
  getVocabulary,
  importLearningData,
  STORAGE_KEYS,
  updateVocabularyItem,
} from "@/lib/vocabularyStorage";
import { dictionaryByTerm } from "@/lib/buildingDictionary";
import {
  createDictionaryCacheKey,
  findAiDictionaryEntry,
  normaliseDictionaryTerm,
  saveAiDictionaryEntry,
} from "@/lib/aiDictionaryStorage";
import {
  getDictionaryImage,
  saveDictionaryImage,
} from "@/lib/dictionaryImageStorage";
import {
  dictionaryText,
  type DictionaryEntry,
} from "@/types/dictionary";
import type { VocabularyItem, VocabularyStatus } from "@/types/vocabulary";
import {
  readCefrEvaluations,
  saveCefrEvaluations,
} from "@/lib/cefrStorage";
import { CEFR_LEVELS, type CefrEvaluation, type CefrLevel } from "@/types/cefr";

type Filter = "all" | VocabularyStatus;
type SortMode = "date" | "alphabetical" | "due";
type EntrySource = "personal" | "built-in" | "ai" | "missing";

const DICTIONARY_DOMAIN = "building-construction";

function getPossibleTerms(word: string) {
  const normalized = normaliseDictionaryTerm(word);
  const terms = [normalized];

  if (normalized.endsWith("ies") && normalized.length > 4) terms.push(`${normalized.slice(0, -3)}y`);
  if (normalized.endsWith("es") && normalized.length > 3) terms.push(normalized.slice(0, -2));
  if (normalized.endsWith("s") && normalized.length > 2) terms.push(normalized.slice(0, -1));
  if (normalized.endsWith("ing") && normalized.length > 5) {
    terms.push(normalized.slice(0, -3));
    terms.push(`${normalized.slice(0, -3)}e`);
  }
  if (normalized.endsWith("ed") && normalized.length > 4) {
    terms.push(normalized.slice(0, -2));
    terms.push(normalized.slice(0, -1));
  }

  return [...new Set(terms)];
}

function findDictionaryEntry(word: string): {
  entry?: DictionaryEntry;
  source: Exclude<EntrySource, "personal">;
} {
  const terms = getPossibleTerms(word);

  for (const term of terms) {
    const builtIn = dictionaryByTerm.get(term);
    if (builtIn) return { entry: builtIn, source: "built-in" };
  }

  for (const term of terms) {
    const aiEntry = findAiDictionaryEntry(term, DICTIONARY_DOMAIN);
    if (aiEntry) return { entry: aiEntry, source: "ai" };
  }

  return { source: "missing" };
}

export default function VocabularyPage() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("date");
  const [editing, setEditing] = useState<VocabularyItem | null>(null);
  const [message, setMessage] = useState("");
  const [generatingWord, setGeneratingWord] = useState<string | null>(null);
  const [generatingImageWord, setGeneratingImageWord] = useState<string | null>(null);
  const [images, setImages] = useState<Record<string, string>>({});
  const [cefrEvaluations, setCefrEvaluations] = useState<Record<string, CefrEvaluation>>({});
  const [evaluatingLevels, setEvaluatingLevels] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setItems(getVocabulary());
      const stored = readCefrEvaluations();
      setCefrEvaluations(
        Object.fromEntries(stored.map((evaluation) => [evaluation.normalizedTerm, evaluation])),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadImages() {
      const next: Record<string, string> = {};
      for (const item of items) {
        const key = createDictionaryCacheKey(item.word, DICTIONARY_DOMAIN);
        const stored = await getDictionaryImage(key);
        if (stored?.dataUrl) next[item.normalizedWord] = stored.dataUrl;
      }
      if (!cancelled) setImages(next);
    }

    if (items.length) void loadImages();
    return () => {
      cancelled = true;
    };
  }, [items]);

  const filtered = useMemo(() => {
    let result = items.filter(
      (item) =>
        (filter === "all" || item.status === filter) &&
        item.word.toLowerCase().includes(search.toLowerCase()),
    );

    if (sort === "alphabetical") result = [...result].sort((a, b) => a.word.localeCompare(b.word));
    if (sort === "date") result = [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sort === "due") result = [...result].sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt));
    return result;
  }, [items, filter, search, sort]);

  const cefrProfile = useMemo(() => {
    const counts = Object.fromEntries(CEFR_LEVELS.map((level) => [level, 0])) as Record<CefrLevel, number>;
    let evaluated = 0;
    for (const item of items) {
      const evaluation = cefrEvaluations[normaliseDictionaryTerm(item.word)];
      if (!evaluation) continue;
      counts[evaluation.level] += 1;
      evaluated += 1;
    }
    return { counts, evaluated, total: items.length };
  }, [items, cefrEvaluations]);

  function updateStatus(item: VocabularyItem, status: VocabularyStatus) {
    const nextReviewAt = status === "mastered" ? item.nextReviewAt : new Date().toISOString();
    setItems(updateVocabularyItem(item.id, { status, nextReviewAt }));
  }

  function saveEdit() {
    if (!editing) return;
    setItems(updateVocabularyItem(editing.id, { meaning: editing.meaning, notes: editing.notes }));
    setEditing(null);
  }

  async function generateExplanation(item: VocabularyItem) {
    try {
      setGeneratingWord(item.normalizedWord);
      setMessage("");

      const existing = findDictionaryEntry(item.word);
      if (existing.entry) {
        const text = dictionaryText(existing.entry);
        setItems(updateVocabularyItem(item.id, { meaning: `${text.meaningZh} — ${text.definitionEn}` }));
        setMessage(`${item.word} already has a saved explanation.`);
        return;
      }

      const source = item.sources.at(-1);
      const response = await fetch("/api/dictionary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: item.word,
          domain: "Australian building, construction, landscape architecture and site management",
          context: source
            ? `The word was extracted from the PDF "${source.documentName}" and appeared ${source.frequency} time(s).`
            : "The word was saved from a professional PDF.",
        }),
      });

      const result = (await response.json()) as {
        entry?: DictionaryEntry;
        model?: string;
        error?: string;
      };

      if (!response.ok || !result.entry) throw new Error(result.error || "AI generation failed.");

      saveAiDictionaryEntry(result.entry, DICTIONARY_DOMAIN, result.model);
      if (result.entry.cefrLevel) {
        const saved = saveCefrEvaluations(
          [{
            term: result.entry.term,
            normalizedTerm: normaliseDictionaryTerm(result.entry.term),
            level: result.entry.cefrLevel,
            confidence: result.entry.cefrConfidence || "medium",
            isTechnicalTerm: result.entry.isTechnicalTerm || false,
            reasonEn: result.entry.cefrReasonEn || "Estimated during dictionary generation.",
            reasonZh: result.entry.cefrReasonZh || "在生成词典解释时估算。",
          }],
          result.model,
        );
        setCefrEvaluations((current) => ({
          ...current,
          [saved[0].normalizedTerm]: saved[0],
        }));
      }
      const text = dictionaryText(result.entry);
      setItems(updateVocabularyItem(item.id, { meaning: `${text.meaningZh} — ${text.definitionEn}` }));
      setMessage(`${item.word} now has a bilingual AI explanation and was saved for reuse.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not generate the explanation.");
    } finally {
      setGeneratingWord(null);
    }
  }

  async function generateApplicationImage(item: VocabularyItem, entry: DictionaryEntry) {
    try {
      setGeneratingImageWord(item.normalizedWord);
      setMessage("");
      const text = dictionaryText(entry);

      if (!text.imagePrompt) {
        throw new Error("This entry does not include an image prompt. Generate a new bilingual AI explanation first.");
      }

      const response = await fetch("/api/dictionary/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: entry.term, imagePrompt: text.imagePrompt }),
      });

      const result = (await response.json()) as {
        imageDataUrl?: string;
        model?: string;
        error?: string;
      };

      if (!response.ok || !result.imageDataUrl) throw new Error(result.error || "Image generation failed.");

      const key = createDictionaryCacheKey(item.word, DICTIONARY_DOMAIN);
      await saveDictionaryImage(key, result.imageDataUrl, result.model);
      setImages((current) => ({ ...current, [item.normalizedWord]: result.imageDataUrl! }));
      setMessage(`${item.word} application image was generated and saved in this browser.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not generate the image.");
    } finally {
      setGeneratingImageWord(null);
    }
  }

  async function evaluateCefrLevels(words: string[]) {
    const missingTerms = [...new Set(words.map((word) => word.trim()).filter(Boolean))].filter(
      (word) => !cefrEvaluations[normaliseDictionaryTerm(word)],
    );

    if (!missingTerms.length) {
      setMessage("All selected words already have saved CEFR estimates.");
      return;
    }

    try {
      setEvaluatingLevels(true);
      setMessage(
        `Evaluating ${missingTerms.length} word${missingTerms.length === 1 ? "" : "s"} in saved batches…`,
      );

      const allSaved: CefrEvaluation[] = [];
      for (let index = 0; index < missingTerms.length; index += 40) {
        const batch = missingTerms.slice(index, index + 40);
        const response = await fetch("/api/dictionary/level", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ terms: batch }),
        });
        const result = (await response.json()) as {
          evaluations?: CefrEvaluation[];
          model?: string;
          error?: string;
        };
        if (!response.ok || !result.evaluations) {
          throw new Error(result.error || "CEFR evaluation failed.");
        }
        const saved = saveCefrEvaluations(result.evaluations, result.model);
        allSaved.push(...saved);
      }

      setCefrEvaluations((current) => ({
        ...current,
        ...Object.fromEntries(allSaved.map((evaluation) => [evaluation.normalizedTerm, evaluation])),
      }));
      setMessage(
        `${allSaved.length} CEFR estimate${allSaved.length === 1 ? " was" : "s were"} generated and saved for reuse.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not evaluate CEFR levels.");
    } finally {
      setEvaluatingLevels(false);
    }
  }

  function exportData() {
    const blob = new Blob([exportLearningData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bookroot-vocabulary-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(file: File) {
    try {
      const count = importLearningData(await file.text());
      setItems(getVocabulary());
      setMessage(`${count} new vocabulary item${count === 1 ? "" : "s"} imported.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    }
  }

  function clearAll() {
    if (!window.confirm("Clear all vocabulary and review data? This cannot be undone.")) return;
    Object.values(STORAGE_KEYS).forEach((key) => window.localStorage.removeItem(key));
    setItems([]);
    setMessage("All BookRoot learning data was cleared.");
  }

  return (
    <PageShell title="My Vocabulary" subtitle="Bilingual AI explanations, practical applications and visual learning from your PDFs.">
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["all", "new", "learning", "mastered"] as Filter[]).map((value) => (
              <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${filter === value ? "bg-green-700 text-white" : "bg-stone-100 text-gray-600"}`}>
                {value} ({value === "all" ? items.length : items.filter((item) => item.status === value).length})
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vocabulary" className="rounded-xl border px-3 py-2 text-sm" />
            <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="rounded-xl border px-3 py-2 text-sm">
              <option value="date">Date added</option>
              <option value="alphabetical">Alphabetical</option>
              <option value="due">Review due</option>
            </select>
          </div>
        </div>

        {message && <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">{message}</p>}

        <section className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-bold text-gray-900">CEFR vocabulary profile</h2>
              <p className="mt-1 text-sm text-gray-500">
                AI-estimated word difficulty from A1 to C2. Specialist terms may be marked Off-list.
              </p>
            </div>
            <button
              type="button"
              disabled={evaluatingLevels || !items.length}
              onClick={() => void evaluateCefrLevels(items.map((item) => item.word))}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {evaluatingLevels
                ? "Evaluating levels…"
                : cefrProfile.evaluated
                  ? `Evaluate missing (${cefrProfile.total - cefrProfile.evaluated})`
                  : "Evaluate word levels"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {CEFR_LEVELS.map((level) => {
              const count = cefrProfile.counts[level];
              const percent = cefrProfile.evaluated ? Math.round((count / cefrProfile.evaluated) * 100) : 0;
              return (
                <div key={level} className="rounded-xl border border-stone-200 bg-white p-3 text-center">
                  <p className="text-sm font-bold text-gray-900">{level}</p>
                  <p className="mt-1 text-lg font-semibold text-green-700">{count}</p>
                  <p className="text-xs text-gray-500">{percent}%</p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Evaluated {cefrProfile.evaluated} of {cefrProfile.total} words. Results are saved in this browser and are learning guidance, not official CEFR certification.
          </p>
        </section>

        {filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed p-10 text-center">
            <h2 className="font-semibold">No vocabulary here yet</h2>
            <p className="mt-2 text-sm text-gray-500">Upload a PDF, select unfamiliar words, and add them to your vocabulary.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {filtered.map((item) => {
              const source = item.sources.at(-1);
              const accuracy = item.reviewCount ? Math.round((item.correctCount / item.reviewCount) * 100) : 0;
              const found = findDictionaryEntry(item.word);
              const entry = found.entry;
              const text = entry ? dictionaryText(entry) : null;
              const sourceLabel: EntrySource = item.meaning && !entry ? "personal" : found.source;
              const isGenerating = generatingWord === item.normalizedWord;
              const isGeneratingImage = generatingImageWord === item.normalizedWord;
              const image = images[item.normalizedWord];
              const cefr = cefrEvaluations[normaliseDictionaryTerm(item.word)];

              return (
                <article key={item.id} className="rounded-2xl border border-stone-200 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold capitalize">{item.word}</h2>
                        <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium capitalize text-green-700">{item.status}</span>
                        {sourceLabel === "ai" && <span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">Bilingual AI</span>}
                        {sourceLabel === "built-in" && <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">BookRoot Dictionary</span>}
                        {cefr && (
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700" title={`${cefr.reasonEn} ${cefr.reasonZh}`}>
                            CEFR {cefr.level}{cefr.isTechnicalTerm ? " · technical" : ""}
                          </span>
                        )}
                      </div>

                      {entry && text ? (
                        <div className="mt-4 space-y-4">
                          <section className="rounded-xl bg-stone-50 p-4">
                            <p className="text-lg font-semibold text-green-800">{text.meaningZh}</p>
                            <p className="mt-2 text-sm leading-6 text-gray-800">{text.definitionEn}</p>
                          </section>

                          {(text.professionalExplanationEn || text.professionalExplanationZh) && (
                            <BilingualBlock title="Professional explanation · 专业解释" en={text.professionalExplanationEn} zh={text.professionalExplanationZh} />
                          )}

                          {(text.whyThisWordEn || text.whyThisWordZh) && (
                            <BilingualBlock title="Why this word? · 为什么这样叫" en={text.whyThisWordEn} zh={text.whyThisWordZh} />
                          )}

                          {(text.memoryTrickEn || text.memoryTrickZh) && (
                            <BilingualBlock title="Memory trick · 记忆方法" en={text.memoryTrickEn} zh={text.memoryTrickZh} />
                          )}

                          {(text.exampleEn || text.exampleZh) && (
                            <BilingualBlock title="Professional example · 专业例句" en={text.exampleEn} zh={text.exampleZh} />
                          )}

                          {(text.realLifeApplicationEn || text.realLifeApplicationZh) && (
                            <BilingualBlock title="Real-life application · 实际应用" en={text.realLifeApplicationEn} zh={text.realLifeApplicationZh} />
                          )}

                          {(text.australianUsageEn || text.australianUsageZh) && (
                            <BilingualBlock title="Australian usage · 澳洲用法" en={text.australianUsageEn} zh={text.australianUsageZh} />
                          )}

                          {(text.visualDescriptionEn || text.visualDescriptionZh || text.imagePrompt) && (
                            <section className="rounded-xl border border-green-100 bg-green-50/50 p-4">
                              <h3 className="font-semibold text-gray-900">Visual application · 图片理解</h3>
                              {text.visualDescriptionEn && <p className="mt-2 text-sm leading-6 text-gray-700">{text.visualDescriptionEn}</p>}
                              {text.visualDescriptionZh && <p className="mt-1 text-sm leading-6 text-gray-500">{text.visualDescriptionZh}</p>}

                              {image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={image} alt={`Real-life application of ${entry.term}`} className="mt-4 aspect-square w-full max-w-xl rounded-xl object-cover shadow-sm" />
                              ) : text.imagePrompt ? (
                                <button type="button" disabled={isGeneratingImage} onClick={() => void generateApplicationImage(item, entry)} className="mt-4 rounded-xl border border-green-700 bg-white px-4 py-2 text-sm font-semibold text-green-700 disabled:opacity-50">
                                  {isGeneratingImage ? "Generating application image…" : "Generate application image"}
                                </button>
                              ) : null}
                            </section>
                          )}
                        </div>
                      ) : item.meaning ? (
                        <p className="mt-3 text-sm leading-6 text-gray-700">{item.meaning}</p>
                      ) : (
                        <div className="mt-3 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4">
                          <p className="text-sm text-gray-600">No bilingual dictionary explanation is available yet.</p>
                          <button type="button" disabled={isGenerating} onClick={() => void generateExplanation(item)} className="mt-3 rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                            {isGenerating ? "Generating English + 中文…" : "Generate bilingual explanation with AI"}
                          </button>
                        </div>
                      )}

                      {cefr ? (
                        <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-gray-900">CEFR level: {cefr.level}</h3>
                            <span className="text-xs text-gray-500">Confidence: {cefr.confidence}</span>
                            {cefr.isTechnicalTerm && <span className="rounded-full bg-white px-2 py-1 text-xs text-gray-600">Technical term</span>}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-gray-700">{cefr.reasonEn}</p>
                          <p className="mt-1 text-sm leading-6 text-gray-500">{cefr.reasonZh}</p>
                        </section>
                      ) : (
                        <button
                          type="button"
                          disabled={evaluatingLevels}
                          onClick={() => void evaluateCefrLevels([item.word])}
                          className="mt-4 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
                        >
                          Evaluate CEFR level
                        </button>
                      )}

                      {item.notes && <p className="mt-3 text-sm italic text-gray-500">{item.notes}</p>}
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
                        <span>Source: {source?.documentName ?? "Unknown"}</span>
                        <span>Frequency: {source?.frequency ?? 0}</span>
                        <span>Added: {new Date(item.createdAt).toLocaleDateString()}</span>
                        <span>Next review: {new Date(item.nextReviewAt).toLocaleString()}</span>
                        <span>Accuracy: {item.reviewCount ? `${accuracy}%` : "Not reviewed"}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <select value={item.status} onChange={(event) => updateStatus(item, event.target.value as VocabularyStatus)} className="rounded-xl border px-3 py-2 text-sm">
                        <option value="new">New</option>
                        <option value="learning">Learning</option>
                        <option value="mastered">Mastered</option>
                      </select>
                      <button type="button" onClick={() => setEditing({ ...item })} className="rounded-xl border px-3 py-2 text-sm">Edit meaning</button>
                      <button type="button" onClick={() => { if (window.confirm(`Delete ${item.word}?`)) setItems(deleteVocabularyItem(item.id)); }} className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600">Delete</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold">Data management</h2>
        <p className="mt-1 text-sm text-gray-500">Vocabulary and AI text are stored in this browser. Generated images are stored in IndexedDB.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={exportData} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white">Export JSON</button>
          <button type="button" onClick={() => inputRef.current?.click()} className="rounded-xl border px-4 py-2 text-sm font-medium">Import JSON</button>
          <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); }} />
          <button type="button" onClick={clearAll} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600">Clear all learning data</button>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold capitalize">Edit {editing.word}</h2>
            <label className="mt-4 block text-sm font-medium">Meaning<textarea value={editing.meaning} onChange={(event) => setEditing({ ...editing, meaning: event.target.value })} className="mt-1 min-h-24 w-full rounded-xl border p-3" /></label>
            <label className="mt-4 block text-sm font-medium">Personal notes<textarea value={editing.notes} onChange={(event) => setEditing({ ...editing, notes: event.target.value })} className="mt-1 min-h-24 w-full rounded-xl border p-3" /></label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-xl border px-4 py-2">Cancel</button>
              <button type="button" onClick={saveEdit} className="rounded-xl bg-green-700 px-4 py-2 font-semibold text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function BilingualBlock({ title, en, zh }: { title: string; en: string; zh: string }) {
  return (
    <section className="rounded-xl border border-stone-200 p-4">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {en && <p className="mt-2 text-sm leading-6 text-gray-700">{en}</p>}
      {zh && <p className="mt-1 text-sm leading-6 text-gray-500">{zh}</p>}
    </section>
  );
}
