import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BookRoot",
  description: "Extract, save and review professional English vocabulary from PDFs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="min-h-full">{children}</body></html>;
}
