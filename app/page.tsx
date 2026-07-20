"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { getDueVocabulary, getVocabulary } from "@/lib/vocabularyStorage";
import type { VocabularyItem } from "@/types/vocabulary";

export default function Home() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [due, setDue] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setItems(getVocabulary());
      setDue(getDueVocabulary().length);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const stats = useMemo(() => ({
    total: items.length,
    newWords: items.filter((item) => item.status === "new").length,
    learning: items.filter((item) => item.status === "learning").length,
    mastered: items.filter((item) => item.status === "mastered").length,
  }), [items]);

  return (
    <PageShell title="Learning Dashboard" subtitle="Turn professional PDFs into a vocabulary list you can keep and review.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Vocabulary" value={stats.total} />
        <Stat label="New" value={stats.newWords} />
        <Stat label="Learning" value={stats.learning} />
        <Stat label="Mastered" value={stats.mastered} />
        <Stat label="Due now" value={due} />
      </div>
      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard href="/upload" title="Upload a PDF" text="Extract real English words and choose the unfamiliar ones." primary />
        <ActionCard href="/dictionary" title="Construction Dictionary" text="Browse 1,000 building and construction terms with Chinese explanations." />
        <ActionCard href="/vocabulary" title="My Vocabulary" text="Add meanings, notes and learning status." />
        <ActionCard href="/review" title="Start Daily Review" text="Review due words using spaced repetition." />
      </section>
      <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">How this non-AI version works</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-600">BookRoot extracts selectable text from your PDF, counts repeated words, filters common function words, and lets you decide what to save. The built-in construction dictionary supplies meanings for matched terms, while review timing and learning records are managed automatically in this browser.</p>
      </section>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">{label}</p><p className="mt-1 text-3xl font-bold text-gray-900">{value}</p></div>; }
function ActionCard({ href, title, text, primary = false }: { href: string; title: string; text: string; primary?: boolean }) { return <Link href={href} className={`rounded-2xl border p-6 shadow-sm transition hover:-translate-y-0.5 ${primary ? "border-green-700 bg-green-700 text-white" : "border-stone-200 bg-white hover:border-green-500"}`}><h2 className="text-xl font-bold">{title}</h2><p className={`mt-2 text-sm leading-6 ${primary ? "text-green-50" : "text-gray-500"}`}>{text}</p><p className="mt-5 font-semibold">Open →</p></Link>; }
