"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import ComicLink from "@/components/ComicLink";
import PeriodBadge from "@/components/PeriodBadge";
import type { TimelineItem } from "@/lib/library";

const FALLBACK_COLOR = "#71717a";
const INITIAL_VISIBLE = 6;

function TimelineEntry({
  item,
  publisherId,
  isFirst,
  isLast,
  total,
}: {
  item: TimelineItem;
  publisherId: string;
  isFirst: boolean;
  isLast: boolean;
  total: number;
}) {
  const { comic, characterId, characterName, period, isEvent } = item;
  const color = period?.color ?? FALLBACK_COLOR;
  const href = isEvent
    ? `/${publisherId}/${characterId}`
    : `/${publisherId}/${characterId}/${comic.id}`;
  const title = isEvent ? characterName : comic.title;

  const cardContent = (
    <>
      <img
        src={comic.cover}
        alt={comic.title}
        className="h-24 w-16 sm:h-28 sm:w-[4.5rem] lg:h-40 lg:w-28 flex-shrink-0 rounded-lg lg:rounded-xl object-cover shadow-lg"
      />
      <div className="flex flex-col justify-center gap-1.5 lg:gap-2">
        {period && <PeriodBadge period={period} />}
        <span className="text-zinc-500 text-xs lg:text-sm">
          {isEvent ? "Event" : characterName}
          {comic.year > 0 && ` · ${comic.year}`}
        </span>
        <h3 className="text-white text-base lg:text-xl font-bold leading-tight group-hover:underline">
          {title}
        </h3>
      </div>
    </>
  );

  const lineStyle: CSSProperties = {
    backgroundColor: color,
    top: isFirst ? "1.5rem" : 0,
    ...(isLast ? { height: "1.5rem" } : { bottom: 0 }),
  };

  const cardClassName =
    "group flex gap-4 lg:gap-6 rounded-2xl lg:rounded-3xl border border-white/5 bg-zinc-900/60 p-3 sm:p-4 lg:p-5 transition-colors hover:border-white/15 hover:bg-zinc-900";

  return (
    <li className="relative pl-10 lg:pl-14 pb-6 lg:pb-8 last:pb-0">
      {total > 1 && (
        <span
          aria-hidden
          className="absolute left-2 lg:left-2.5 w-0.5 lg:w-1"
          style={lineStyle}
        />
      )}
      <span
        aria-hidden
        className="absolute left-0 lg:left-0.5 top-3 lg:top-5 h-4 w-4 lg:h-5 lg:w-5 rounded-full ring-4 lg:ring-[6px] ring-zinc-950"
        style={{ backgroundColor: color }}
      />

      {isEvent ? (
        <Link href={href} className={cardClassName}>
          {cardContent}
        </Link>
      ) : (
        <ComicLink href={href} className={cardClassName}>
          {cardContent}
        </ComicLink>
      )}
    </li>
  );
}

export default function Timeline({
  items,
  publisherId,
}: {
  items: TimelineItem[];
  publisherId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > INITIAL_VISIBLE;
  const visible = items.slice(0, INITIAL_VISIBLE);
  const hidden = items.slice(INITIAL_VISIBLE);

  return (
    <div>
      <ol>
        {visible.map((item, i) => (
          <TimelineEntry
            key={item.comic.id}
            item={item}
            publisherId={publisherId}
            isFirst={i === 0}
            isLast={!hasMore && i === visible.length - 1}
            total={visible.length}
          />
        ))}
      </ol>

      {hasMore && (
        <>
          <div
            className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${
              expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <ol className="pt-0">
                {hidden.map((item, i) => (
                  <TimelineEntry
                    key={item.comic.id}
                    item={item}
                    publisherId={publisherId}
                    isFirst={false}
                    isLast={i === hidden.length - 1}
                    total={hidden.length + 1}
                  />
                ))}
              </ol>
            </div>
          </div>

          <div className="relative mt-2 flex justify-center">
            {!expanded && (
              <div
                aria-hidden
                className="pointer-events-none absolute -top-16 left-0 right-0 h-16 bg-gradient-to-t from-zinc-950 to-transparent"
              />
            )}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="relative flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/90 px-5 py-2.5 text-sm font-medium text-zinc-400 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:text-white"
            >
              <span>{expanded ? "Voir moins" : "Voir plus"}</span>
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`h-4 w-4 transition-transform duration-500 ease-in-out ${
                  expanded ? "rotate-180" : ""
                }`}
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
