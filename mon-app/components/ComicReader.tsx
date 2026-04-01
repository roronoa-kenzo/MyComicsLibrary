"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Props {
  pages: string[];
  title: string;
  backUrl: string;
}

export default function ComicReader({ pages, title, backUrl }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const onPageVisible = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const page = Number(entry.target.getAttribute("data-page"));
            if (page) onPageVisible(page);
          }
        }
      },
      { threshold: 0.5 }
    );

    const elements = document.querySelectorAll("[data-page]");
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [onPageVisible]);

  const progress = Math.round((currentPage / pages.length) * 100);

  return (
    <div className="bg-black min-h-screen">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-zinc-950/95 backdrop-blur-md border-b border-white/5">
        <Link
          href={backUrl}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
        >
          <span className="text-lg leading-none">←</span>
          <span className="hidden sm:inline">Retour</span>
        </Link>

        <div className="flex flex-col items-center">
          <span className="text-white text-xs font-semibold truncate max-w-xs text-center leading-tight">
            {title}
          </span>
          <span className="text-zinc-500 text-xs mt-0.5">
            {currentPage} / {pages.length}
          </span>
        </div>

        <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-yellow-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Pages */}
      <div className="flex flex-col items-center">
        {pages.map((url, i) => (
          <img
            key={url}
            src={url}
            alt={`Page ${i + 1}`}
            data-page={i + 1}
            className="w-full max-w-2xl block"
            loading={i < 3 ? "eager" : "lazy"}
          />
        ))}
      </div>

      {/* Bottom end card */}
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <span className="text-zinc-500 text-sm">Fin du comic</span>
        <Link
          href={backUrl}
          className="px-6 py-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors"
        >
          ← Retour aux comics
        </Link>
      </div>
    </div>
  );
}
