export default function UploadPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-[600px]">

        <h1 className="text-4xl font-bold mb-3">
          📖 Upload Your Book
        </h1>

        <p className="text-gray-500 mb-8">
          Upload a PDF to start learning.
        </p>

        <div className="border-2 border-dashed rounded-xl h-60 flex flex-col items-center justify-center">

          <div className="text-6xl mb-4">
            📄
          </div>

          <p className="text-lg font-semibold">
            Drag & Drop PDF Here
          </p>

          <p className="text-gray-500 mt-2">
            or click to browse
          </p>

        </div>

      </div>
    </main>
  );
}