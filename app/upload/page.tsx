"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/PageShell";

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const router = useRouter();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      window.alert("Please select a PDF file.");
      event.target.value = "";
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  }

  function handleStartReading() {
    if (!selectedFile) return;
    const oldUrl = sessionStorage.getItem("bookrootPdfUrl");
    if (oldUrl?.startsWith("blob:")) URL.revokeObjectURL(oldUrl);
    const pdfUrl = URL.createObjectURL(selectedFile);
    sessionStorage.setItem("bookrootPdfUrl", pdfUrl);
    sessionStorage.setItem("bookrootPdfName", selectedFile.name);
    router.push("/reader");
  }

  return (
    <PageShell title="Upload a PDF" subtitle="Text-based PDFs work best. Scanned drawings need OCR, which is not included yet.">
      <div className="mx-auto max-w-2xl rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 p-12 text-center transition hover:border-green-600 hover:bg-green-50">
          <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleFileChange} />
          <span className="text-4xl">PDF</span>
          <span className="mt-4 text-lg font-bold">Click to select a PDF</span>
          <span className="mt-2 text-sm text-gray-500">The file stays in your current browser session.</span>
        </label>
        {selectedFile && <div className="mt-6 rounded-2xl bg-stone-50 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Selected file</p><p className="mt-2 break-words font-semibold">{selectedFile.name}</p><button type="button" onClick={handleStartReading} className="mt-5 w-full rounded-xl bg-green-700 py-3 font-semibold text-white hover:bg-green-800">Start Reading and Extract Words</button></div>}
      </div>
    </PageShell>
  );
}
