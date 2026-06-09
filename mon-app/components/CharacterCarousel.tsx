"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Character } from "@/lib/library";

interface Props {
  characters: Character[];
  publisherId: string;
  accentColor: string;
  emptyMessage?: string;
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CharacterCircle({
  character,
  publisherId,
  accentColor,
}: {
  character: Character;
  publisherId: string;
  accentColor: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={`/${publisherId}/${character.id}`}
      className="flex-shrink-0 flex flex-col items-center gap-3 w-32 group"
    >
      <div
        className="w-28 h-28 rounded-full overflow-hidden transition-all duration-300"
        style={{
          boxShadow: hovered
            ? `0 0 0 4px ${accentColor}, 0 0 24px ${accentColor}55`
            : "0 0 0 4px transparent",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <img
          src={character.image}
          alt={character.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>
      <div className="text-center">
        <p className="text-white font-semibold text-sm leading-tight">
          {character.name}
        </p>
        <p className="text-zinc-500 text-xs mt-0.5">{character.realName}</p>
      </div>
    </Link>
  );
}

const arrowBase =
  "absolute top-[3.5rem] z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-zinc-900/70 text-zinc-300 shadow-lg shadow-black/20 backdrop-blur-md transition-all duration-300 ease-out hover:border-white/25 hover:bg-zinc-800 hover:text-white hover:scale-105 opacity-70 group-hover:opacity-90 hover:opacity-100";

export default function CharacterCarousel({
  characters,
  publisherId,
  accentColor,
  emptyMessage = "Aucun personnage défini pour cet éditeur.",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    ref.current?.scrollBy({
      left: dir === "left" ? -320 : 320,
      behavior: "smooth",
    });
  };

  if (characters.length === 0) {
    return (
      <p className="text-zinc-500 text-center py-12">{emptyMessage}</p>
    );
  }

  const showArrows = characters.length > 3;

  return (
    <div className="group relative">
      {showArrows && (
        <>
          <button
            type="button"
            onClick={() => scroll("left")}
            className={`${arrowBase} left-1`}
            aria-label="Défiler à gauche"
          >
            <Chevron className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className={`${arrowBase} right-1`}
            aria-label="Défiler à droite"
          >
            <Chevron className="h-[18px] w-[18px] rotate-180" />
          </button>
        </>
      )}

      <div
        ref={ref}
        className="flex gap-10 overflow-x-auto scroll-smooth pb-6 px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {characters.map((character) => (
          <CharacterCircle
            key={character.id}
            character={character}
            publisherId={publisherId}
            accentColor={accentColor}
          />
        ))}
      </div>
    </div>
  );
}
