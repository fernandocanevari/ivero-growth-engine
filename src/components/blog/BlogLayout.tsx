import type { ReactNode } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

interface Props {
  children: ReactNode;
}

/**
 * Light-themed wrapper for /blog and /blog/:slug.
 * Reuses Navbar + Footer to keep the brand surface consistent.
 */
export function BlogLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-28 pb-20">{children}</main>
      <Footer />
    </div>
  );
}
