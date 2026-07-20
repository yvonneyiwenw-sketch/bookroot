"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const router = useRouter();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.type !== "application/pdf") {
      alert("Please select a PDF file.");
      event.target.value = "";
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }

  function handleStartReading() {
    if (!selectedFile) {
      return;
    }

    const pdfUrl = URL.createObjectURL(selectedFile);

    sessionStorage.setItem("bookrootPdfUrl", pdfUrl);
    sessionStorage.setItem("bookrootPdfName", selectedFile.name);

    router.push("/reader");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-lg rounded-2xl bg-white p-10 shadow-lg">
        <h1 className="mb-8 text-3xl font-bold">
          Upload Your Book
        </h1>

        <label className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-400 p-10 transition hover:border-black hover:bg-gray-50">
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          📄 Click to Select PDF
        </label>

        {selectedFile && (
          <div className="mt-8">
            <div className="rounded-lg bg-green-100 p-4">
              <p className="font-semibold">
                Selected File
              </p>

              <p className="mt-1 break-words">
                {selectedFile.name}
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartReading}
              className="mt-4 w-full rounded-lg bg-black py-3 text-white transition hover:bg-gray-800"
            >
              Start Reading
            </button>
          </div>
        )}
      </div>
    </main>
  );
}