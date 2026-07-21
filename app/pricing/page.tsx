import Link from "next/link";

const freeFeatures = [
  "3 PDF analyses per month",
  "Automatic CEFR estimates",
  "Personal vocabulary collection",
  "Basic spaced review",
];

const proFeatures = [
  "30 PDF analyses per month",
  "AI-generated Chinese meanings",
  "Australian English context",
  "Word roots and word families",
  "Learning insights and reports",
  "Priority access to new features",
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-stone-100 px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-sm font-semibold text-green-700">
            BookRoot Plans
          </p>

          <h1 className="mt-2 text-4xl font-bold text-stone-900">
            Learn from your own books
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-stone-600">
            Start free and upgrade when you need more PDF analyses and
            AI-powered professional vocabulary support.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl border border-stone-200 bg-white p-7 shadow-sm">
            <p className="font-semibold text-stone-600">Free</p>

            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-bold">A$0</span>
              <span className="pb-1 text-sm text-stone-500">
                forever
              </span>
            </div>

            <p className="mt-4 text-sm text-stone-600">
              Explore BookRoot and build your first professional
              vocabulary collection.
            </p>

            <ul className="mt-6 space-y-3">
              {freeFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex gap-3 text-sm text-stone-700"
                >
                  <span className="font-bold text-green-700">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/upload"
              className="mt-8 block rounded-xl border border-stone-300 px-4 py-3 text-center font-semibold hover:bg-stone-50"
            >
              Continue with Free
            </Link>
          </section>

          <section className="relative rounded-3xl border-2 border-green-700 bg-white p-7 shadow-sm">
            <span className="absolute right-5 top-5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
              Early access
            </span>

            <p className="font-semibold text-green-700">
              BookRoot Pro
            </p>

            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-bold">A$7.99</span>
              <span className="pb-1 text-sm text-stone-500">
                per month
              </span>
            </div>

            <p className="mt-4 text-sm text-stone-600">
              For students and professionals learning English from
              technical documents.
            </p>

            <ul className="mt-6 space-y-3">
              {proFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex gap-3 text-sm text-stone-700"
                >
                  <span className="font-bold text-green-700">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <a
              href="mailto:yvonneyiwenw@gmail.com?subject=BookRoot Pro Early Access"
              className="mt-8 block rounded-xl bg-green-700 px-4 py-3 text-center font-semibold text-white hover:bg-green-800"
            >
              Join Pro Early Access
            </a>

            <p className="mt-3 text-center text-xs text-stone-500">
              No payment required during early access.
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-green-700 hover:underline"
          >
            ← Return to BookRoot
          </Link>
        </div>
      </div>
    </main>
  );
}