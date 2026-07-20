import type { ReactNode } from "react";
import AppNavigation from "./AppNavigation";

export default function PageShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-stone-100 p-4 lg:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div><p className="text-sm font-semibold text-green-700">BookRoot</p><h1 className="text-2xl font-bold text-gray-900">{title}</h1>{subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}</div>
          <AppNavigation />
        </header>
        {children}
      </div>
    </main>
  );
}
