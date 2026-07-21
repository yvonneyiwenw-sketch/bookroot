"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppNavigation from "@/components/AppNavigation";
import { analysePageTexts, type PageText } from "@/lib/textAnalysis";
import {
  dictionaryByTerm,
  findDictionaryMatches,
} from "@/lib/buildingDictionary";
import { dictionaryText } from "@/types/dictionary";
import {
  addVocabularyItems,
  getAnalysisSettings,
  getHiddenWords,
  getVocabulary,
  saveAnalysisSettings,
  saveHiddenWords,
  saveVocabulary,
} from "@/lib/vocabularyStorage";
import type { AnalysisSettings, VocabularyItem } from "@/types/vocabulary";

type SortMode = "frequency" | "alphabetical" | "unsaved";

type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type LevelFilter = "all" | CefrLevel;

type CandidateWithLevel = ReturnType<typeof analysePageTexts>[number] & {
  level: CefrLevel;
};

const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const A1_WORDS = new Set([
  "about",
  "after",
  "again",
  "all",
  "also",
  "another",
  "back",
  "because",
  "before",
  "big",
  "book",
  "both",
  "bring",
  "build",
  "building",
  "call",
  "change",
  "come",
  "day",
  "different",
  "door",
  "down",
  "each",
  "end",
  "every",
  "find",
  "first",
  "follow",
  "form",
  "give",
  "good",
  "great",
  "hand",
  "help",
  "home",
  "house",
  "keep",
  "know",
  "large",
  "last",
  "learn",
  "left",
  "line",
  "little",
  "long",
  "look",
  "make",
  "many",
  "more",
  "move",
  "much",
  "need",
  "new",
  "next",
  "number",
  "open",
  "other",
  "part",
  "people",
  "place",
  "point",
  "put",
  "right",
  "same",
  "see",
  "small",
  "start",
  "still",
  "take",
  "thing",
  "time",
  "turn",
  "under",
  "use",
  "want",
  "water",
  "way",
  "well",
  "work",
  "world",
]);

const A2_WORDS = new Set([
  "above",
  "across",
  "allow",
  "area",
  "around",
  "carry",
  "complete",
  "control",
  "create",
  "develop",
  "during",
  "example",
  "ground",
  "include",
  "inside",
  "level",
  "material",
  "measure",
  "outside",
  "position",
  "prepare",
  "process",
  "provide",
  "result",
  "section",
  "several",
  "simple",
  "surface",
  "system",
  "together",
  "usually",
]);

const B1_WORDS = new Set([
  "access",
  "apply",
  "appropriate",
  "avoid",
  "condition",
  "construction",
  "contact",
  "equipment",
  "existing",
  "identify",
  "improve",
  "individual",
  "install",
  "location",
  "manage",
  "method",
  "prevent",
  "protect",
  "required",
  "responsible",
  "standard",
  "support",
  "temporary",
]);

const B2_WORDS = new Set([
  "adjacent",
  "assessment",
  "compliance",
  "component",
  "coordinate",
  "demolition",
  "excavation",
  "hazardous",
  "inspection",
  "installation",
  "maintenance",
  "procedure",
  "reinforcement",
  "requirement",
  "specification",
  "structural",
  "subcontractor",
]);

const C1_WORDS = new Set([
  "accommodate",
  "commencement",
  "configuration",
  "contamination",
  "deterioration",
  "implementation",
  "infrastructure",
  "interference",
  "rectification",
  "remediation",
  "verification",
]);

function estimateCefrLevel(word: string): CefrLevel {
  const normalizedWord = word.trim().toLowerCase();

  if (A1_WORDS.has(normalizedWord)) return "A1";
  if (A2_WORDS.has(normalizedWord)) return "A2";
  if (B1_WORDS.has(normalizedWord)) return "B1";
  if (B2_WORDS.has(normalizedWord)) return "B2";
  if (C1_WORDS.has(normalizedWord)) return "C1";

  if (
    normalizedWord.endsWith("isation") ||
    normalizedWord.endsWith("ization") ||
    normalizedWord.endsWith("ological") ||
    normalizedWord.endsWith("ification")
  ) {
    return "C1";
  }

  if (
    normalizedWord.endsWith("ability") ||
    normalizedWord.endsWith("ibility") ||
    normalizedWord.endsWith("ential") ||
    normalizedWord.endsWith("aceous")
  ) {
    return "C1";
  }

  if (
    normalizedWord.endsWith("tion") ||
    normalizedWord.endsWith("sion") ||
    normalizedWord.endsWith("ment") ||
    normalizedWord.endsWith("ance") ||
    normalizedWord.endsWith("ence")
  ) {
    return normalizedWord.length >= 12 ? "C1" : "B2";
  }

  if (
    normalizedWord.endsWith("ive") ||
    normalizedWord.endsWith("ous") ||
    normalizedWord.endsWith("al") ||
    normalizedWord.endsWith("ity")
  ) {
    return normalizedWord.length >= 10 ? "B2" : "B1";
  }

  if (normalizedWord.length <= 4) return "A1";
  if (normalizedWord.length <= 6) return "A2";
  if (normalizedWord.length <= 8) return "B1";
  if (normalizedWord.length <= 11) return "B2";
  if (normalizedWord.length <= 14) return "C1";

  return "C2";
}

function getLevelBadgeClass(level: CefrLevel): string {
  switch (level) {
    case "A1":
      return "bg-emerald-50 text-emerald-700";
    case "A2":
      return "bg-green-50 text-green-700";
    case "B1":
      return "bg-sky-50 text-sky-700";
    case "B2":
      return "bg-blue-50 text-blue-700";
    case "C1":
      return "bg-violet-50 text-violet-700";
    case "C2":
      return "bg-purple-50 text-purple-700";
  }
}

type PdfJsModule = typeof import("pdfjs-dist");

function getErrorDescription(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown PDF error";
  }
}

/**
 * Reads a blob URL as an ArrayBuffer.
 *
 * Modern browsers normally support fetch(blobUrl), but XMLHttpRequest is
 * included as a fallback for mobile Safari and older WebKit behaviour.
 */
async function readBlobUrlAsArrayBuffer(blobUrl: string): Promise<ArrayBuffer> {
  try {
    const response = await fetch(blobUrl);

    if (!response.ok) {
      throw new Error(`Unable to read PDF. HTTP status: ${response.status}`);
    }

    return await response.arrayBuffer();
  } catch (fetchError) {
    console.warn(
      "Reading the PDF with fetch failed. Trying XMLHttpRequest.",
      fetchError,
    );

    return await new Promise<ArrayBuffer>((resolve, reject) => {
      const request = new XMLHttpRequest();

      request.open("GET", blobUrl, true);
      request.responseType = "arraybuffer";

      request.onload = () => {
        if (
          request.status === 0 ||
          (request.status >= 200 && request.status < 300)
        ) {
          if (request.response instanceof ArrayBuffer) {
            resolve(request.response);
            return;
          }

          reject(new Error("The browser returned an invalid PDF response."));
          return;
        }

        reject(new Error(`Unable to read PDF. HTTP status: ${request.status}`));
      };

      request.onerror = () => {
        reject(
          new Error("The browser could not access the temporary PDF file."),
        );
      };

      request.onabort = () => {
        reject(new Error("PDF loading was cancelled."));
      };

      request.send();
    });
  }
}

/**
 * Tries two different PDF.js loading methods.
 *
 * Method 1:
 * PDF.js directly loads the blob URL.
 *
 * Method 2:
 * BookRoot reads the PDF into memory first and gives PDF.js a Uint8Array.
 */
async function loadPdfDocument(pdfjsLib: PdfJsModule, pdfUrl: string) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  let directLoadError: unknown;

  try {
    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      useWorkerFetch: false,
    });

    return await loadingTask.promise;
  } catch (error) {
    directLoadError = error;

    console.warn(
      "Direct PDF.js blob loading failed. Trying binary loading.",
      error,
    );
  }

  try {
    const arrayBuffer = await readBlobUrlAsArrayBuffer(pdfUrl);
    const pdfBytes = new Uint8Array(arrayBuffer);

    const loadingTask = pdfjsLib.getDocument({
      data: pdfBytes,
      useWorkerFetch: false,
    });

    return await loadingTask.promise;
  } catch (binaryLoadError) {
    const directMessage = getErrorDescription(directLoadError);
    const binaryMessage = getErrorDescription(binaryLoadError);

    throw new Error(
      [
        "PDF.js could not load the document.",
        `Direct loading: ${directMessage}`,
        `Binary loading: ${binaryMessage}`,
      ].join(" "),
    );
  }
}

export default function ReaderPage() {
  const router = useRouter();

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState("");
  const [pageTexts, setPageTexts] = useState<PageText[]>([]);

  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
  });

  const [isExtracting, setIsExtracting] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [settings, setSettings] = useState<AnalysisSettings>({
    minimumLength: 4,
    minimumFrequency: 2,
  });

  const [hiddenWords, setHiddenWords] = useState<string[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("frequency");

  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");

  const [showCount, setShowCount] = useState(100);

  const [activeTab, setActiveTab] = useState<
    "candidates" | "dictionary" | "saved"
  >("candidates");

  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const initialTimer = window.setTimeout(() => {
      if (cancelled) return;

      setSettings(getAnalysisSettings());
      setHiddenWords(getHiddenWords());
      setVocabulary(getVocabulary());
    }, 0);

    const savedPdfUrl = sessionStorage.getItem("bookrootPdfUrl");

    const savedPdfName = sessionStorage.getItem("bookrootPdfName");

    if (!savedPdfUrl) {
      router.replace("/upload");

      return () => {
        cancelled = true;
        window.clearTimeout(initialTimer);
      };
    }

    const confirmedPdfUrl = savedPdfUrl;

    const pdfTimer = window.setTimeout(() => {
      if (cancelled) return;

      setPdfUrl(confirmedPdfUrl);
      setPdfName(savedPdfName ?? "Selected PDF");
    }, 0);

    async function extractPdfText() {
      try {
        setIsExtracting(true);
        setErrorMessage("");
        setPageTexts([]);
        setProgress({
          current: 0,
          total: 0,
        });

        const pdfjsLib = await import("pdfjs-dist");

        if (cancelled) return;

        const pdf = await loadPdfDocument(pdfjsLib, confirmedPdfUrl);

        if (cancelled) {
          return;
        }

        setProgress({
          current: 0,
          total: pdf.numPages,
        });

        const pages: PageText[] = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) {
            return;
          }

          const page = await pdf.getPage(pageNumber);

          const textStream = page.streamTextContent();
          const reader = textStream.getReader();
          const textParts: string[] = [];

          try {
            while (true) {
              const result = await reader.read();

              if (result.done) {
                break;
              }

              const chunk = result.value;

              if (!chunk) {
                continue;
              }

              for (const item of chunk.items) {
                if ("str" in item && item.str) {
                  textParts.push(item.str);
                }
              }
            }
          } finally {
            reader.releaseLock();
          }

          const text = textParts.join(" ").replace(/\s+/g, " ").trim();

          pages.push({
            page: pageNumber,
            text,
          });

          if (!cancelled) {
            setPageTexts([...pages]);

            setProgress({
              current: pageNumber,
              total: pdf.numPages,
            });
          }

          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 0);
          });
        }

        const containsSelectableText = pages.some(
          (page) => page.text.trim().length > 0,
        );

        if (!containsSelectableText && !cancelled) {
          setErrorMessage(
            "No selectable text was found. This may be a scanned or image-based PDF. OCR is not included yet.",
          );
        }
      } catch (error) {
        console.error("BookRoot PDF extraction error:", error);

        if (cancelled) return;

        const details = getErrorDescription(error);

        setErrorMessage(
          `BookRoot could not extract text from this PDF. Technical detail: ${details}`,
        );
      } finally {
        if (!cancelled) {
          setIsExtracting(false);
        }
      }
    }

    void extractPdfText();

    return () => {
      cancelled = true;
      window.clearTimeout(initialTimer);
      window.clearTimeout(pdfTimer);
    };
  }, [router]);

  const candidates = useMemo<CandidateWithLevel[]>(
    () =>
      analysePageTexts(pageTexts, settings, new Set(hiddenWords)).map(
        (candidate) => ({
          ...candidate,
          level: estimateCefrLevel(candidate.word),
        }),
      ),
    [pageTexts, settings, hiddenWords],
  );

  const savedMap = useMemo(
    () => new Map(vocabulary.map((item) => [item.normalizedWord, item])),
    [vocabulary],
  );

  const dictionaryMatches = useMemo(
    () => findDictionaryMatches(pageTexts.map((page) => page.text).join(" ")),
    [pageTexts],
  );

  const levelCounts = useMemo(() => {
    const counts: Record<CefrLevel, number> = {
      A1: 0,
      A2: 0,
      B1: 0,
      B2: 0,
      C1: 0,
      C2: 0,
    };

    candidates.forEach((candidate) => {
      counts[candidate.level] += 1;
    });

    return counts;
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    let result = candidates.filter((candidate) =>
      candidate.word.includes(normalizedSearch),
    );

    if (levelFilter !== "all") {
      result = result.filter((candidate) => candidate.level === levelFilter);
    }

    if (sortMode === "alphabetical") {
      result = [...result].sort((a, b) => a.word.localeCompare(b.word));
    }

    if (sortMode === "unsaved") {
      result = result.filter((candidate) => !savedMap.has(candidate.word));
    }

    return result;
  }, [candidates, search, levelFilter, sortMode, savedMap]);

  const visibleCandidates = useMemo(
    () => filteredCandidates.slice(0, showCount),
    [filteredCandidates, showCount],
  );

  const visibleCandidateWords = useMemo(
    () => visibleCandidates.map((candidate) => candidate.word),
    [visibleCandidates],
  );

  const allVisibleSelected =
    visibleCandidateWords.length > 0 &&
    visibleCandidateWords.every((word) => selected.has(word));

  function changeSettings(next: AnalysisSettings) {
    setSettings(next);
    saveAnalysisSettings(next);
    setSelected(new Set());
  }

  function toggleSelectAllVisible() {
    setSelected((current) => {
      const next = new Set(current);

      if (allVisibleSelected) {
        visibleCandidateWords.forEach((word) => {
          next.delete(word);
        });
      } else {
        visibleCandidateWords.forEach((word) => {
          next.add(word);
        });
      }

      return next;
    });
  }

  function toggleWord(word: string) {
    setSelected((current) => {
      const next = new Set(current);

      if (next.has(word)) {
        next.delete(word);
      } else {
        next.add(word);
      }

      return next;
    });
  }

  function hideWord(word: string) {
    const next = [...new Set([...hiddenWords, word])];

    setHiddenWords(next);
    saveHiddenWords(next);

    setSelected((current) => {
      const copy = new Set(current);
      copy.delete(word);
      return copy;
    });
  }

  function saveSelected() {
    const chosen = candidates.filter((candidate) =>
      selected.has(candidate.word),
    );

    const added = addVocabularyItems(chosen, pdfName);

    const next = added.map((item) => {
      const dictionaryEntry = dictionaryByTerm.get(item.normalizedWord);

      if (!dictionaryEntry || item.meaning) {
        return item;
      }

      const text = dictionaryText(dictionaryEntry);

      return {
        ...item,
        meaning: text.meaningZh,
        notes: `${text.definitionEn}\n\nMemory: ${text.memoryTrickEn}`,
      };
    });

    saveVocabulary(next);
    setVocabulary(next);
    setSelected(new Set());

    setSuccessMessage(
      `${chosen.length} word${
        chosen.length === 1 ? "" : "s"
      } added to My Vocabulary.`,
    );

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  }

  if (!pdfUrl) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-100">
        <p>Loading PDF…</p>
      </main>
    );
  }

  const totalTokens = pageTexts.reduce(
    (total, page) => total + (page.text.match(/[A-Za-z]+/g)?.length ?? 0),
    0,
  );

  const savedForDocument = vocabulary.filter((item) =>
    item.sources.some((source) => source.documentName === pdfName),
  );

  return (
    <main className="min-h-screen bg-stone-100 p-4 lg:p-6">
      <div className="mx-auto max-w-[1700px]">
        <header className="mb-4 flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-green-700">BookRoot</p>

            <h1 className="text-xl font-bold">
              Read and collect real vocabulary
            </h1>

            <p className="mt-1 max-w-xl truncate text-sm text-gray-500">
              {pdfName}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <AppNavigation />

            <button
              type="button"
              onClick={() => router.push("/upload")}
              className="rounded-xl border px-3 py-2 text-sm hover:bg-stone-50"
            >
              Choose Another PDF
            </button>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(430px,0.75fr)]">
          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-200 px-4 py-3">
              <h2 className="font-semibold">Reading Document</h2>
            </div>

            <iframe
              src={pdfUrl}
              title={pdfName}
              className="h-[70vh] min-h-[500px] w-full lg:h-[calc(100vh-160px)] lg:min-h-[680px]"
            />

            <div className="border-t border-stone-200 p-3 text-center sm:hidden">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-green-700"
              >
                Open PDF in a separate window
              </a>
            </div>
          </section>

          <aside className="relative min-h-[720px] overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-sm xl:h-[calc(100vh-125px)]">
            <div className="sticky top-0 z-10 border-b border-stone-200 bg-white p-5">
              <div className="flex rounded-xl bg-stone-100 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("candidates")}
                  className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium ${
                    activeTab === "candidates"
                      ? "bg-white shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  Candidates
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("dictionary")}
                  className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium ${
                    activeTab === "dictionary"
                      ? "bg-white shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  Dictionary ({dictionaryMatches.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("saved")}
                  className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium ${
                    activeTab === "saved"
                      ? "bg-white shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  Saved ({savedForDocument.length})
                </button>
              </div>
            </div>

            {activeTab === "saved" ? (
              <div className="p-5">
                {savedForDocument.length === 0 ? (
                  <Empty
                    title="No saved words from this PDF"
                    text="Return to Candidate Words and select the vocabulary you want to learn."
                  />
                ) : (
                  <div className="space-y-3">
                    {savedForDocument.map((item) => (
                      <div key={item.id} className="rounded-xl border p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold capitalize">
                            {item.word}
                          </p>

                          <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium capitalize text-green-700">
                            {item.status}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-gray-500">
                          {item.meaning || "No meaning added yet."}
                        </p>

                        <Link
                          href="/vocabulary"
                          className="mt-3 inline-block text-sm font-medium text-green-700"
                        >
                          Open in My Vocabulary →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === "dictionary" ? (
              <div className="p-5">
                <h2 className="text-xl font-bold">Dictionary matches</h2>

                <p className="mt-1 text-sm text-gray-500">
                  Building and construction terms found anywhere in this PDF.
                </p>

                {dictionaryMatches.length === 0 ? (
                  <div className="mt-4">
                    <Empty
                      title="No dictionary terms found yet"
                      text="BookRoot will show matches after the PDF text has been extracted."
                    />
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {dictionaryMatches.slice(0, 200).map(({ entry, count }) => (
                      <Link
                        key={entry.slug}
                        href={`/dictionary/${entry.slug}`}
                        className="block rounded-xl border p-4 hover:border-green-500 hover:bg-green-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold capitalize">
                              {entry.term}
                            </p>

                            <p className="mt-1 text-sm font-medium text-green-700">
                              {dictionaryText(entry).meaningZh}
                            </p>
                          </div>

                          <span className="rounded-full bg-stone-100 px-2 py-1 text-xs">
                            {count}×
                          </span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                          {dictionaryText(entry).definitionEn}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="pb-28">
                <div className="p-5">
                  <h2 className="text-xl font-bold">
                    Real words from this PDF
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Choose only the words you do not know or want to practise.
                  </p>

                  <div className="mt-4 rounded-xl bg-stone-50 p-4 text-sm">
                    {isExtracting ? (
                      <p>
                        Reading page {progress.current} of{" "}
                        {progress.total || "…"}
                      </p>
                    ) : errorMessage ? (
                      <div className="space-y-2">
                        <p className="break-words text-amber-700">
                          {errorMessage}
                        </p>

                        <button
                          type="button"
                          onClick={() => router.push("/upload")}
                          className="font-medium text-green-700"
                        >
                          Choose the PDF again
                        </button>
                      </div>
                    ) : (
                      <p>
                        <strong>{totalTokens.toLocaleString()}</strong> total
                        word tokens · <strong>{candidates.length}</strong>{" "}
                        unique candidates
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="text-xs font-medium text-gray-600">
                      Minimum length
                      <select
                        value={settings.minimumLength}
                        onChange={(event) =>
                          changeSettings({
                            ...settings,
                            minimumLength: Number(event.target.value) as
                              3 | 4 | 5,
                          })
                        }
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      >
                        {[3, 4, 5].map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </label>

                    <label className="text-xs font-medium text-gray-600">
                      Minimum frequency
                      <select
                        value={settings.minimumFrequency}
                        onChange={(event) =>
                          changeSettings({
                            ...settings,
                            minimumFrequency: Number(event.target.value) as
                              1 | 2 | 3 | 5,
                          })
                        }
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      >
                        {[1, 2, 3, 5].map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search words"
                      className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm"
                    />

                    <select
                      value={sortMode}
                      onChange={(event) =>
                        setSortMode(event.target.value as SortMode)
                      }
                      className="rounded-xl border px-3 py-2 text-sm"
                    >
                      <option value="frequency">Most frequent</option>

                      <option value="alphabetical">Alphabetical</option>

                      <option value="unsaved">Not yet saved</option>
                    </select>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        CEFR level
                      </p>

                      <p className="text-xs text-gray-400">
                        Automatically estimated
                      </p>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLevelFilter("all");
                          setShowCount(100);
                        }}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          levelFilter === "all"
                            ? "border-green-700 bg-green-700 text-white"
                            : "border-stone-200 bg-white text-gray-600 hover:border-green-500"
                        }`}
                      >
                        All {candidates.length}
                      </button>

                      {CEFR_LEVELS.map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => {
                            setLevelFilter(level);
                            setShowCount(100);
                          }}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            levelFilter === level
                              ? "border-green-700 bg-green-700 text-white"
                              : "border-stone-200 bg-white text-gray-600 hover:border-green-500"
                          }`}
                        >
                          {level} {levelCounts[level]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                    <button
                      type="button"
                      onClick={toggleSelectAllVisible}
                      disabled={visibleCandidates.length === 0}
                      className="font-medium text-green-700 disabled:cursor-not-allowed disabled:text-gray-300"
                    >
                      {allVisibleSelected
                        ? "Unselect all visible"
                        : `Select all visible (${visibleCandidates.length})`}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelected(new Set())}
                      disabled={selected.size === 0}
                      className="text-gray-500 disabled:text-gray-300"
                    >
                      Clear selection
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {visibleCandidates.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-stone-300 p-6 text-center">
                        <p className="font-medium text-gray-700">
                          No matching candidate words
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          Try another CEFR level or change the search filters.
                        </p>
                      </div>
                    ) : (
                      visibleCandidates.map((candidate) => {
                        const saved = savedMap.get(candidate.word);

                        return (
                          <div
                            key={candidate.word}
                            className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                              selected.has(candidate.word)
                                ? "border-green-500 bg-green-50"
                                : "border-stone-200 hover:border-stone-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(candidate.word)}
                              onChange={() => toggleWord(candidate.word)}
                              aria-label={`Select ${candidate.word}`}
                              className="h-4 w-4 shrink-0 accent-green-700"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold capitalize">
                                  {candidate.word}
                                </p>

                                <span
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${getLevelBadgeClass(
                                    candidate.level,
                                  )}`}
                                  title="Automatically estimated CEFR level"
                                >
                                  {candidate.level}
                                </span>

                                {saved && (
                                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium capitalize text-gray-600">
                                    Saved · {saved.status}
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-xs text-gray-500">
                                {candidate.count} occurrence
                                {candidate.count === 1 ? "" : "s"} · first seen
                                page {candidate.firstPage}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => hideWord(candidate.word)}
                              className="shrink-0 text-xs text-gray-400 hover:text-red-600"
                            >
                              Hide
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {visibleCandidates.length < filteredCandidates.length && (
                    <button
                      type="button"
                      onClick={() => setShowCount((value) => value + 100)}
                      className="mt-4 w-full rounded-xl border py-2 text-sm font-medium hover:bg-stone-50"
                    >
                      Show more
                    </button>
                  )}
                </div>

                <div className="sticky bottom-0 border-t border-stone-200 bg-white/95 p-4 backdrop-blur">
                  {successMessage && (
                    <p className="mb-2 text-sm font-medium text-green-700">
                      {successMessage}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {selected.size}{" "}
                        {selected.size === 1
                          ? "word selected"
                          : "words selected"}
                      </p>

                      {levelFilter !== "all" && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          Currently viewing {levelFilter} words
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelected(new Set())}
                        disabled={selected.size === 0}
                        className="rounded-xl border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Clear
                      </button>

                      <button
                        type="button"
                        disabled={selected.size === 0}
                        onClick={saveSelected}
                        className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {selected.size === 0
                          ? "Select words to add"
                          : `Add ${selected.size} to My Vocabulary`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed p-8 text-center">
      <h3 className="font-semibold">{title}</h3>

      <p className="mt-2 text-sm text-gray-500">{text}</p>
    </div>
  );
}