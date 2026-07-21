import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import { dictionaryBySlug } from "@/lib/buildingDictionary";
import { dictionaryText } from "@/types/dictionary";
import AddToVocabularyButton from "@/components/AddToVocabularyButton";

export default async function DictionaryEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = dictionaryBySlug.get(slug);
  if (!entry) notFound();
  const text = dictionaryText(entry);

  return (
    <PageShell title={entry.term} subtitle={`${text.meaningZh} · ${entry.category}`}>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <Card title="Professional meaning"><p>{text.definitionEn}</p></Card>
          <Card title="Why this word?"><p>{text.whyThisWordEn}</p></Card>
          <Card title="Origin"><p>{text.originEn}</p></Card>
          <Card title="Word parts"><div className="space-y-2">{entry.wordParts.map((part, index) => <div key={`${part.part}-${index}`} className="rounded-xl bg-stone-50 p-3"><strong>{part.part}</strong><span className="ml-2 text-gray-600">{part.meaning}</span></div>)}</div></Card>
          <Card title="Professional example"><p>{text.exampleEn}</p><p className="mt-3 text-gray-500">{text.exampleZh}</p></Card>
        </div>
        <div className="space-y-5">
            <AddToVocabularyButton
              word={entry.term}
              meaning={`${text.meaningZh} — ${text.definitionEn}`}
            />
            
          <Card title="Memory trick"><p>{text.memoryTrickEn}</p></Card>
          <Card title="Australian usage"><p>{text.australianUsageEn}</p></Card>
          <Card title="Related words"><div className="flex flex-wrap gap-2">{entry.relatedWords.length ? entry.relatedWords.map((word) => <span key={word} className="rounded-full bg-green-50 px-3 py-1 text-sm text-green-800">{word}</span>) : <span className="text-gray-500">No related words listed.</span>}</div></Card>
          <Link href="/dictionary" className="inline-block rounded-xl border bg-white px-4 py-3 font-medium hover:bg-stone-50">← Back to dictionary</Link>
        </div>
      </div>
    </PageShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">{title}</h2><div className="mt-3 text-sm leading-7 text-gray-700">{children}</div></section>;
}
