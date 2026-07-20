"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const router = useRouter();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      setSelectedFile(file);
    }
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
            accept=".pdf"
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

              <p>{selectedFile.name}</p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/reader")}
              className="mt-4 w-full rounded-lg bg-black py-3 text-white hover:bg-gray-800"
            >
              Start Reading
            </button>
          </div>
        )}
      </div>
    </main>
  );
}