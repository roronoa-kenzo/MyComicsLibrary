"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Character } from "@/lib/library";

interface Props {
  characters: Character[];
  publisherId: string;
  accentColor: string;
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

export default function CharacterCarousel({
  characters,
  publisherId,
  accentColor,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (ref.current) {
      ref.current.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
    }
  };

  if (characters.length === 0) {
    return (
      <p className="text-zinc-500 text-center py-12">
        Aucun personnage défini pour cet éditeur.
      </p>
    );
  }

  return (
    <div className="relative">
      {characters.length > 3 && (
        <>
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center shadow-xl transition-colors"
            aria-label="Défiler à gauche"
          >
            ‹
          </button>
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center shadow-xl transition-colors"
            aria-label="Défiler à droite"
          >
            ›
          </button>
        </>
      )}

      <div
        ref={ref}
        className="flex gap-10 overflow-x-auto scroll-smooth pb-6 px-2"
        style={{ scrollbarWidth: "none" }}
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
