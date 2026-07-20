import Link from "next/link";
export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-10">

        <h1 className="text-5xl font-bold mb-3">
          📚 BookRoot
        </h1>

        <p className="text-gray-600 mb-10">
          Turn Every Book Into a Personalized Learning Experience
        </p>

        <div className="space-y-4">

          <Link
            href="/upload"
            className="block w-full rounded-xl bg-black py-4 text-center text-lg text-white transition hover:bg-gray-800"
          >
            📖 Upload Your First Book
          </Link>

          <button className="w-full rounded-xl border py-4 text-lg hover:bg-gray-100 transition">
            📚 My Library
          </button>

          <button className="w-full rounded-xl border py-4 text-lg hover:bg-gray-100 transition">
            🧠 Today's Review
          </button>

          <button className="w-full rounded-xl border py-4 text-lg hover:bg-gray-100 transition">
            📈 Statistics
          </button>

        </div>

      </div>
    </main>
  );
}