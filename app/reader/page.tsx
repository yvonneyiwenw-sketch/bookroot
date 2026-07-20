"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppNavigation from "@/components/AppNavigation";
import { analysePageTexts, type PageText } from "@/lib/textAnalysis";
import { dictionaryByTerm, findDictionaryMatches } from "@/lib/buildingDictionary";
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

export default function ReaderPage() {
  const router = useRouter();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState("");
  const [pageTexts, setPageTexts] = useState<PageText[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isExtracting, setIsExtracting] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [settings, setSettings] = useState<AnalysisSettings>({ minimumLength: 4, minimumFrequency: 2 });
  const [hiddenWords, setHiddenWords] = useState<string[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("frequency");
  const [showCount, setShowCount] = useState(100);
  const [activeTab, setActiveTab] = useState<"candidates" | "dictionary" | "saved">("candidates");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      setSettings(getAnalysisSettings());
      setHiddenWords(getHiddenWords());
      setVocabulary(getVocabulary());
    }, 0);

    const savedPdfUrl = sessionStorage.getItem("bookrootPdfUrl");
    const savedPdfName = sessionStorage.getItem("bookrootPdfName");
    if (!savedPdfUrl) {
      router.push("/upload");
      return;
    }
    const confirmedPdfUrl: string = savedPdfUrl;
    const pdfTimer = window.setTimeout(() => {
      setPdfUrl(confirmedPdfUrl);
      setPdfName(savedPdfName ?? "Selected PDF");
    }, 0);

    async function extractPdfText() {
      try {
        setIsExtracting(true);
        setErrorMessage("");
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const response = await fetch(confirmedPdfUrl);
        if (!response.ok) throw new Error("Unable to read the selected PDF.");
        const pdfBytes = new Uint8Array(await response.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
        setProgress({ current: 0, total: pdf.numPages });
        const pages: PageText[] = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
          pages.push({ page: pageNumber, text });
          setPageTexts([...pages]);
          setProgress({ current: pageNumber, total: pdf.numPages });
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        if (!pages.some((page) => page.text.trim())) setErrorMessage("No selectable text was found. This may be a scanned PDF. OCR is not included yet.");
      } catch (error) {
        console.error(error);
        setErrorMessage("BookRoot could not extract text from this PDF. You can still read the PDF on the left.");
      } finally {
        setIsExtracting(false);
      }
    }
    extractPdfText();
    return () => {
      window.clearTimeout(initialTimer);
      window.clearTimeout(pdfTimer);
    };
  }, [router]);

  const candidates = useMemo(() => analysePageTexts(pageTexts, settings, new Set(hiddenWords)), [pageTexts, settings, hiddenWords]);
  const savedMap = useMemo(() => new Map(vocabulary.map((item) => [item.normalizedWord, item])), [vocabulary]);
  const dictionaryMatches = useMemo(() => findDictionaryMatches(pageTexts.map((page) => page.text).join(" ")), [pageTexts]);
  const visibleCandidates = useMemo(() => {
    let result = candidates.filter((candidate) => candidate.word.includes(search.trim().toLowerCase()));
    if (sortMode === "alphabetical") result = [...result].sort((a, b) => a.word.localeCompare(b.word));
    if (sortMode === "unsaved") result = result.filter((candidate) => !savedMap.has(candidate.word));
    return result.slice(0, showCount);
  }, [candidates, search, sortMode, showCount, savedMap]);

  function changeSettings(next: AnalysisSettings) {
    setSettings(next);
    saveAnalysisSettings(next);
    setSelected(new Set());
  }

  function toggleWord(word: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(word)) next.delete(word); else next.add(word);
      return next;
    });
  }

  function hideWord(word: string) {
    const next = [...new Set([...hiddenWords, word])];
    setHiddenWords(next);
    saveHiddenWords(next);
    setSelected((current) => { const copy = new Set(current); copy.delete(word); return copy; });
  }

  function saveSelected() {
    const chosen = candidates.filter((candidate) => selected.has(candidate.word));
    const added = addVocabularyItems(chosen, pdfName);
    const next = added.map((item) => {
      const dictionaryEntry = dictionaryByTerm.get(item.normalizedWord);
      if (!dictionaryEntry || item.meaning) return item;
      const text = dictionaryText(dictionaryEntry);
      return { ...item, meaning: text.meaningZh, notes: `${text.definitionEn}\n\nMemory: ${text.memoryTrickEn}` };
    });
    saveVocabulary(next);
    setVocabulary(next);
    setSelected(new Set());
    setSuccessMessage(`${chosen.length} word${chosen.length === 1 ? "" : "s"} added to My Vocabulary.`);
    window.setTimeout(() => setSuccessMessage(""), 3000);
  }

  if (!pdfUrl) return <main className="flex min-h-screen items-center justify-center bg-stone-100"><p>Loading PDF…</p></main>;

  const totalTokens = pageTexts.reduce((total, page) => total + (page.text.match(/[A-Za-z]+/g)?.length ?? 0), 0);
  const savedForDocument = vocabulary.filter((item) => item.sources.some((source) => source.documentName === pdfName));

  return (
    <main className="min-h-screen bg-stone-100 p-4 lg:p-6">
      <div className="mx-auto max-w-[1700px]">
        <header className="mb-4 flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div><p className="text-sm font-semibold text-green-700">BookRoot</p><h1 className="text-xl font-bold">Read and collect real vocabulary</h1><p className="mt-1 max-w-xl truncate text-sm text-gray-500">{pdfName}</p></div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><AppNavigation /><button onClick={() => router.push("/upload")} className="rounded-xl border px-3 py-2 text-sm hover:bg-stone-50">Choose Another PDF</button></div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(430px,0.75fr)]">
          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-200 px-4 py-3"><h2 className="font-semibold">Reading Document</h2></div>
            <iframe src={pdfUrl} title={pdfName} className="h-[calc(100vh-160px)] min-h-[680px] w-full" />
          </section>

          <aside className="relative h-[calc(100vh-125px)] min-h-[720px] overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="sticky top-0 z-10 border-b border-stone-200 bg-white p-5">
              <div className="flex rounded-xl bg-stone-100 p-1">
                <button onClick={() => setActiveTab("candidates")} className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium ${activeTab === "candidates" ? "bg-white shadow-sm" : "text-gray-500"}`}>Candidates</button>
                <button onClick={() => setActiveTab("dictionary")} className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium ${activeTab === "dictionary" ? "bg-white shadow-sm" : "text-gray-500"}`}>Dictionary ({dictionaryMatches.length})</button>
                <button onClick={() => setActiveTab("saved")} className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium ${activeTab === "saved" ? "bg-white shadow-sm" : "text-gray-500"}`}>Saved ({savedForDocument.length})</button>
              </div>
            </div>

            {activeTab === "saved" ? (
              <div className="p-5">
                {savedForDocument.length === 0 ? <Empty title="No saved words from this PDF" text="Return to Candidate Words and select the vocabulary you want to learn." /> : <div className="space-y-3">{savedForDocument.map((item) => <div key={item.id} className="rounded-xl border p-4"><div className="flex items-center justify-between"><p className="font-semibold capitalize">{item.word}</p><span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium capitalize text-green-700">{item.status}</span></div><p className="mt-2 text-sm text-gray-500">{item.meaning || "No meaning added yet."}</p><Link href="/vocabulary" className="mt-3 inline-block text-sm font-medium text-green-700">Open in My Vocabulary →</Link></div>)}</div>}
              </div>
            ) : activeTab === "dictionary" ? (
              <div className="p-5">
                <h2 className="text-xl font-bold">Dictionary matches</h2>
                <p className="mt-1 text-sm text-gray-500">Building and construction terms found anywhere in this PDF.</p>
                {dictionaryMatches.length === 0 ? <div className="mt-4"><Empty title="No dictionary terms found yet" text="BookRoot will show matches after the PDF text has been extracted." /></div> : <div className="mt-4 space-y-3">{dictionaryMatches.slice(0, 200).map(({ entry, count }) => <Link key={entry.slug} href={`/dictionary/${entry.slug}`} className="block rounded-xl border p-4 hover:border-green-500 hover:bg-green-50"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold capitalize">{entry.term}</p><p className="mt-1 text-sm font-medium text-green-700">{dictionaryText(entry).meaningZh}</p></div><span className="rounded-full bg-stone-100 px-2 py-1 text-xs">{count}×</span></div><p className="mt-2 line-clamp-2 text-sm text-gray-500">{dictionaryText(entry).definitionEn}</p></Link>)}</div>}
              </div>
            ) : (
              <div className="pb-28">
                <div className="p-5">
                  <h2 className="text-xl font-bold">Real words from this PDF</h2>
                  <p className="mt-1 text-sm text-gray-500">Choose only the words you do not know or want to practise.</p>

                  <div className="mt-4 rounded-xl bg-stone-50 p-4 text-sm">
                    {isExtracting ? <p>Reading page {progress.current} of {progress.total || "…"}</p> : errorMessage ? <p className="text-amber-700">{errorMessage}</p> : <p><strong>{totalTokens.toLocaleString()}</strong> total word tokens · <strong>{candidates.length}</strong> unique candidates</p>}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="text-xs font-medium text-gray-600">Minimum length<select value={settings.minimumLength} onChange={(event) => changeSettings({ ...settings, minimumLength: Number(event.target.value) as 3 | 4 | 5 })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">{[3,4,5].map((value) => <option key={value}>{value}</option>)}</select></label>
                    <label className="text-xs font-medium text-gray-600">Minimum frequency<select value={settings.minimumFrequency} onChange={(event) => changeSettings({ ...settings, minimumFrequency: Number(event.target.value) as 1 | 2 | 3 | 5 })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">{[1,2,3,5].map((value) => <option key={value}>{value}</option>)}</select></label>
                  </div>

                  <div className="mt-4 flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search words" className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm" /><select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="rounded-xl border px-3 py-2 text-sm"><option value="frequency">Most frequent</option><option value="alphabetical">Alphabetical</option><option value="unsaved">Not yet saved</option></select></div>

                  <div className="mt-4 flex items-center justify-between text-sm"><button onClick={() => setSelected(new Set(visibleCandidates.map((item) => item.word)))} className="font-medium text-green-700">Select all visible</button><button onClick={() => setSelected(new Set())} className="text-gray-500">Clear selection</button></div>

                  <div className="mt-3 space-y-2">
                    {visibleCandidates.map((candidate) => {
                      const saved = savedMap.get(candidate.word);
                      return <div key={candidate.word} className={`flex items-center gap-3 rounded-xl border p-3 ${selected.has(candidate.word) ? "border-green-500 bg-green-50" : "border-stone-200"}`}><input type="checkbox" checked={selected.has(candidate.word)} onChange={() => toggleWord(candidate.word)} aria-label={`Select ${candidate.word}`} className="h-4 w-4" /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-semibold capitalize">{candidate.word}</p>{saved && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium capitalize text-gray-600">Saved · {saved.status}</span>}</div><p className="text-xs text-gray-500">{candidate.count} occurrence{candidate.count === 1 ? "" : "s"} · first seen page {candidate.firstPage}</p></div><button onClick={() => hideWord(candidate.word)} className="text-xs text-gray-400 hover:text-red-600">Hide</button></div>;
                    })}
                  </div>
                  {visibleCandidates.length < candidates.length && <button onClick={() => setShowCount((value) => value + 100)} className="mt-4 w-full rounded-xl border py-2 text-sm font-medium hover:bg-stone-50">Show more</button>}
                </div>

                <div className="sticky bottom-0 border-t border-stone-200 bg-white/95 p-4 backdrop-blur">
                  {successMessage && <p className="mb-2 text-sm font-medium text-green-700">{successMessage}</p>}
                  <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{selected.size} words selected</p><div className="flex gap-2"><button onClick={() => setSelected(new Set())} className="rounded-xl border px-3 py-2 text-sm">Clear</button><button disabled={selected.size === 0} onClick={saveSelected} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Add to My Vocabulary</button></div></div>
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
  return <div className="rounded-2xl border border-dashed p-8 text-center"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm text-gray-500">{text}</p></div>;
}
