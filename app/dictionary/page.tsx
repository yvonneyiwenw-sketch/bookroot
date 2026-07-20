"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { buildingDictionary, dictionaryCategories, searchDictionary } from "@/lib/buildingDictionary";
import {
  findAiDictionaryEntry,
  readAiDictionaryEntries,
  saveAiDictionaryEntry,
  type CachedDictionaryEntry,
} from "@/lib/aiDictionaryStorage";
import type { DictionaryEntry } from "@/types/dictionary";

export default function DictionaryPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [limit, setLimit] = useState(80);
  const [generatedEntries, setGeneratedEntries] = useState<CachedDictionaryEntry[]>([]);
  const [context, setContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Read the browser-only cache after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGeneratedEntries(readAiDictionaryEntries());
  }, []);

  const builtInResults = useMemo(() => searchDictionary(query, category), [query, category]);
  const generatedResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return generatedEntries.filter((entry) => {
      const matchesCategory = category === "all" || entry.category === category;
      const haystack = `${entry.term} ${entry.chinese} ${entry.category} ${entry.definition} ${entry.relatedWords.join(" ")}`.toLowerCase();
      return matchesCategory && (!needle || haystack.includes(needle));
    });
  }, [category, generatedEntries, query]);

  const totalResults = generatedResults.length + builtInResults.length;
  const visibleBuiltIn = builtInResults.slice(0, Math.max(0, limit - generatedResults.length));

  async function generateEntry(event: FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (!term) {
      setMessage("Enter a word or phrase first.");
      return;
    }

    const builtIn = buildingDictionary.find((entry) => entry.term.toLowerCase() === term.toLowerCase());
    if (builtIn) {
      setMessage("This term already exists in the built-in dictionary, so AI was not called.");
      return;
    }

    const cached = findAiDictionaryEntry(term);
    if (cached) {
      setMessage("Loaded the saved AI explanation. No new AI request was made.");
      setGeneratedEntries(readAiDictionaryEntries());
      return;
    }

    setGenerating(true);
    setMessage("Generating one new entry…");
    try {
      const response = await fetch("/api/dictionary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term, context, domain: "building and construction in Australia" }),
      });
      const payload = (await response.json()) as { entry?: DictionaryEntry; model?: string; error?: string };
      if (!response.ok || !payload.entry) throw new Error(payload.error || "Generation failed.");

      const saved = saveAiDictionaryEntry(payload.entry, "building-construction", payload.model);
      setGeneratedEntries(readAiDictionaryEntries());
      setQuery(saved.term);
      setMessage("Generated once and saved in this browser. Future searches will reuse it.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <PageShell title="Building & Construction Dictionary" subtitle={`${buildingDictionary.length.toLocaleString()} built-in terms, plus reusable AI explanations saved in your browser.`}>
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_260px]">
          <input value={query} onChange={(event) => { setQuery(event.target.value); setLimit(80); setMessage(""); }} placeholder="Search English, Chinese, category, or related words" className="rounded-xl border px-4 py-3" />
          <select value={category} onChange={(event) => { setCategory(event.target.value); setLimit(80); }} className="rounded-xl border px-4 py-3">
            <option value="all">All categories</option>
            {dictionaryCategories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <p className="mt-3 text-sm text-gray-500">{totalResults.toLocaleString()} matching entries</p>
      </section>

      {query.trim() && totalResults === 0 && (
        <form onSubmit={generateEntry} className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5">
          <h2 className="text-lg font-bold">Not in the dictionary yet</h2>
          <p className="mt-1 text-sm text-gray-600">BookRoot checks the built-in dictionary and your saved AI cache first. AI is called only when both are missing.</p>
          <textarea value={context} onChange={(event) => setContext(event.target.value)} placeholder="Optional: paste the sentence from your PDF for a more accurate professional meaning." className="mt-4 min-h-24 w-full rounded-xl border bg-white px-4 py-3" />
          <button disabled={generating} className="mt-3 rounded-xl bg-green-700 px-5 py-3 font-semibold text-white disabled:opacity-50">
            {generating ? "Generating…" : `Generate “${query.trim()}” with AI`}
          </button>
          {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
        </form>
      )}

      {message && totalResults > 0 && <div className="mt-4 rounded-xl border bg-white px-4 py-3 text-sm text-gray-700">{message}</div>}

      <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {generatedResults.map((entry) => (
          <Link key={entry.cacheKey} href={`/dictionary/generated/${entry.slug}`} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm transition hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-lg font-bold capitalize">{entry.term}</h2><p className="mt-1 font-medium text-green-700">{entry.chinese}</p></div>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-800">AI saved</span>
            </div>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">{entry.definition}</p>
            <p className="mt-4 text-sm font-semibold text-green-700">Open saved entry →</p>
          </Link>
        ))}

        {visibleBuiltIn.map((entry) => (
          <Link key={entry.slug} href={`/dictionary/${entry.slug}`} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-green-500">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-lg font-bold capitalize">{entry.term}</h2><p className="mt-1 font-medium text-green-700">{entry.chinese}</p></div>
              <span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] font-medium text-gray-600">{entry.category}</span>
            </div>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">{entry.definition}</p>
            <p className="mt-4 text-sm font-semibold text-green-700">Open entry →</p>
          </Link>
        ))}
      </section>
      {visibleBuiltIn.length < builtInResults.length && <button onClick={() => setLimit((value) => value + 100)} className="mt-5 w-full rounded-xl border bg-white py-3 font-medium hover:bg-stone-50">Show 100 more</button>}
    </PageShell>
  );
}
