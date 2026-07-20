"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import {
  createDictionaryCacheKey,
  findAiDictionaryEntryBySlug,
  type CachedDictionaryEntry,
} from "@/lib/aiDictionaryStorage";
import { getDictionaryImage, saveDictionaryImage } from "@/lib/dictionaryImageStorage";
import { dictionaryText } from "@/types/dictionary";

export default function GeneratedDictionaryEntryPage() {
  const params = useParams<{ slug: string }>();
  const [entry, setEntry] = useState<CachedDictionaryEntry | null | undefined>(undefined);
  const [image, setImage] = useState<string | undefined>();
  const [generatingImage, setGeneratingImage] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const found = findAiDictionaryEntryBySlug(params.slug);
    setEntry(found);

    if (found) {
      const key = createDictionaryCacheKey(found.term, "building-construction");
      void getDictionaryImage(key).then((stored) => setImage(stored?.dataUrl));
    }
  }, [params.slug]);

  if (entry === undefined) {
    return <PageShell title="Loading entry…" subtitle="Reading the saved AI dictionary cache."><div /></PageShell>;
  }

  if (!entry) {
    return (
      <PageShell title="Entry not found" subtitle="This generated entry is not stored in this browser.">
        <Link href="/dictionary" className="inline-block rounded-xl border bg-white px-4 py-3 font-medium">← Back to dictionary</Link>
      </PageShell>
    );
  }

  const text = dictionaryText(entry);

  async function generateImage() {
    if (!entry || !text.imagePrompt) return;
    try {
      setGeneratingImage(true);
      setMessage("");
      const response = await fetch("/api/dictionary/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: entry.term, imagePrompt: text.imagePrompt }),
      });
      const result = (await response.json()) as { imageDataUrl?: string; model?: string; error?: string };
      if (!response.ok || !result.imageDataUrl) throw new Error(result.error || "Image generation failed.");
      const key = createDictionaryCacheKey(entry.term, "building-construction");
      await saveDictionaryImage(key, result.imageDataUrl, result.model);
      setImage(result.imageDataUrl);
      setMessage("Application image generated and saved in this browser.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not generate image.");
    } finally {
      setGeneratingImage(false);
    }
  }

  return (
    <PageShell title={entry.term} subtitle={`${text.meaningZh} · ${entry.category}`}>
      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        AI-generated bilingual draft · saved in this browser · {new Date(entry.generatedAt).toLocaleString()}
      </div>
      {message && <div className="mb-5 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>}

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <Card title="Meaning · 释义"><p className="font-semibold text-green-800">{text.meaningZh}</p><p className="mt-2">{text.definitionEn}</p></Card>
          <BilingualCard title="Professional explanation · 专业解释" en={text.professionalExplanationEn} zh={text.professionalExplanationZh} />
          <BilingualCard title="Why this word? · 为什么这样叫" en={text.whyThisWordEn} zh={text.whyThisWordZh} />
          <BilingualCard title="Origin · 词源" en={text.originEn} zh={text.originZh} />
          <Card title="Word parts · 词根词缀"><div className="space-y-2">{entry.wordParts.map((part, index) => <div key={`${part.part}-${index}`} className="rounded-xl bg-stone-50 p-3"><strong>{part.part}</strong><span className="ml-2 text-gray-600">{part.meaning}</span></div>)}</div></Card>
          <BilingualCard title="Professional example · 专业例句" en={text.exampleEn} zh={text.exampleZh} />
        </div>

        <div className="space-y-5">
          <BilingualCard title="Memory trick · 记忆方法" en={text.memoryTrickEn} zh={text.memoryTrickZh} />
          <BilingualCard title="Real-life application · 实际应用" en={text.realLifeApplicationEn} zh={text.realLifeApplicationZh} />
          <BilingualCard title="Australian usage · 澳洲用法" en={text.australianUsageEn} zh={text.australianUsageZh} />
          <Card title="Visual application · 图片理解">
            {text.visualDescriptionEn && <p>{text.visualDescriptionEn}</p>}
            {text.visualDescriptionZh && <p className="mt-2 text-gray-500">{text.visualDescriptionZh}</p>}
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={`Real-life application of ${entry.term}`} className="mt-4 aspect-square w-full rounded-xl object-cover" />
            ) : text.imagePrompt ? (
              <button type="button" disabled={generatingImage} onClick={() => void generateImage()} className="mt-4 rounded-xl bg-green-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
                {generatingImage ? "Generating image…" : "Generate application image"}
              </button>
            ) : null}
          </Card>
          <Card title="Related words · 相关词"><div className="flex flex-wrap gap-2">{entry.relatedWords.map((word) => <span key={word} className="rounded-full bg-green-50 px-3 py-1 text-sm text-green-800">{word}</span>)}</div></Card>
          <Link href="/dictionary" className="inline-block rounded-xl border bg-white px-4 py-3 font-medium hover:bg-stone-50">← Back to dictionary</Link>
        </div>
      </div>
    </PageShell>
  );
}

function BilingualCard({ title, en, zh }: { title: string; en: string; zh: string }) {
  return <Card title={title}>{en && <p>{en}</p>}{zh && <p className="mt-3 text-gray-500">{zh}</p>}</Card>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">{title}</h2><div className="mt-3 text-sm leading-7 text-gray-700">{children}</div></section>;
}
