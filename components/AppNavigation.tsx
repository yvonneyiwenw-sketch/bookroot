"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/", "Dashboard"],
  ["/upload", "Upload PDF"],
  ["/dictionary", "Dictionary"],
  ["/vocabulary", "My Vocabulary"],
  ["/review", "Daily Review"],
] as const;

export default function AppNavigation() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2" aria-label="BookRoot navigation">
      {links.map(([href, label]) => (
        <Link key={href} href={href} className={`rounded-xl px-3 py-2 text-sm font-medium transition ${pathname === href ? "bg-green-700 text-white" : "bg-white text-gray-600 hover:bg-green-50 hover:text-green-800"}`}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
