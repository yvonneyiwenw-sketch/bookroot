"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ReaderPage() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState("");
  const router = useRouter();

  useEffect(() => {
    const savedPdfUrl = sessionStorage.getItem("bookrootPdfUrl");
    const savedPdfName = sessionStorage.getItem("bookrootPdfName");

    if (!savedPdfUrl) {
      router.push("/upload");
      return;
    }

    setPdfUrl(savedPdfUrl);
    setPdfName(savedPdfName ?? "Selected PDF");
  }, [router]);

  if (!pdfUrl) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">
          Loading PDF...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-4 flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold">
              📖 Book Reader
            </h1>

            <p className="mt-1 max-w-2xl truncate text-sm text-gray-600">
              {pdfName}
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/upload")}
            className="rounded-lg border border-gray-300 px-4 py-2 transition hover:bg-gray-100"
          >
            Choose Another PDF
          </button>
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow-lg">
          <iframe
            src={pdfUrl}
            title={pdfName}
            className="h-[calc(100vh-140px)] w-full"
          />
        </div>
      </div>
    </main>
  );
}