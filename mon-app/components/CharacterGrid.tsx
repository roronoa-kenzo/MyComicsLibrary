import Link from "next/link";
import ComicCover from "@/components/ComicCover";
import type { Character } from "@/lib/library";

interface Props {
  characters: Character[];
  publisherId: string;
  accentColor: string;
  /** Équipes : cartes panoramiques plus larges que les portraits de personnages. */
  wide?: boolean;
}

export default function CharacterGrid({
  characters,
  publisherId,
  accentColor,
  wide = false,
}: Props) {
  return (
    <ul
      className={`grid gap-4 sm:gap-5 ${
        wide
          ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
          : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      }`}
    >
      {characters.map((character, index) => (
        <li key={character.id}>
          <Link
            href={`/${publisherId}/${character.id}`}
            className={`group relative flex cursor-pointer overflow-hidden rounded-3xl border border-white/10 transition-colors duration-200 hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
              wide ? "aspect-[16/10]" : "aspect-[3/4]"
            }`}
            style={{ outlineColor: accentColor }}
          >
            <ComicCover
              src={character.image}
              alt={character.name}
              width={640}
              height={854}
              sizes={
                wide
                  ? "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  : "(max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              }
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/45 to-transparent" />

            <span
              aria-hidden
              className="absolute right-4 top-3 text-4xl font-black leading-none tracking-tighter text-white/20 lg:text-6xl"
            >
              {String(index + 1).padStart(2, "0")}
            </span>

            <div className="relative z-10 mt-auto w-full p-4 sm:p-5 lg:p-6">
              <span
                aria-hidden
                className="mb-3 block h-1 w-8 rounded-full transition-all duration-300 ease-out group-hover:w-16 lg:mb-4"
                style={{ backgroundColor: accentColor }}
              />

              <h3
                className={`font-black uppercase leading-[0.9] tracking-tighter text-white ${
                  wide ? "text-2xl sm:text-3xl lg:text-4xl" : "text-xl sm:text-2xl lg:text-3xl"
                }`}
              >
                {character.name}
              </h3>

              {character.realName && (
                <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-zinc-300">
                  {character.realName}
                </p>
              )}

              <p className="mt-3 text-xs font-medium text-zinc-400">
                {character.comics.length} comic
                {character.comics.length > 1 ? "s" : ""}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
