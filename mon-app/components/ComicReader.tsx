"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resolveComicBackUrl } from "@/lib/comic-back-url";
import { getComicPageUrl } from "@/lib/comic-pages";

const PAGE_BUFFER = 4;

interface Props {
  pageCount: number;
  storagePath: string;
  pageExtension: string;
  title: string;
  fallbackBackUrl: string;
}

export default function ComicReader({
  pageCount,
  storagePath,
  pageExtension,
  title,
  fallbackBackUrl,
}: Props) {
  const searchParams = useSearchParams();
  const backUrl = resolveComicBackUrl(
    searchParams.get("from") ?? undefined,
    fallbackBackUrl
  );

  const [currentPage, setCurrentPage] = useState(1);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadedRange = useMemo(() => {
    const start = Math.max(1, currentPage - PAGE_BUFFER);
    const end = Math.min(pageCount, currentPage + PAGE_BUFFER);
    return { start, end };
  }, [currentPage, pageCount]);

  const onPageVisible = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        let bestPage = 0;
        let bestRatio = 0;

        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const page = Number(entry.target.getAttribute("data-page"));
          if (!page) continue;
          if (entry.intersectionRatio >= bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestPage = page;
          }
        }

        if (bestPage) onPageVisible(bestPage);
      },
      { threshold: [0.25, 0.5, 0.75] }
    );

    const elements = document.querySelectorAll("[data-page]");
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [onPageVisible, pageCount]);

  const progress = Math.round((currentPage / pageCount) * 100);

  return (
    <div className="bg-black min-h-screen">
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
            {currentPage} / {pageCount}
          </span>
        </div>

        <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-yellow-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col items-center">
        {Array.from({ length: pageCount }, (_, i) => {
          const pageNum = i + 1;
          const loaded =
            pageNum >= loadedRange.start && pageNum <= loadedRange.end;

          return (
            <div
              key={pageNum}
              data-page={pageNum}
              className="w-full max-w-2xl min-h-[50vh]"
            >
              {loaded ? (
                <img
                  src={getComicPageUrl(storagePath, pageExtension, pageNum)}
                  alt={`Page ${pageNum}`}
                  className="w-full block"
                  loading={pageNum <= 3 ? "eager" : "lazy"}
                  decoding="async"
                />
              ) : (
                <div
                  className="w-full aspect-[2/3] bg-zinc-900"
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>

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
