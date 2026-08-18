import ComicCover from "@/components/ComicCover";
import ComicLink from "@/components/ComicLink";
import PeriodBadge from "@/components/PeriodBadge";
import type { Comic } from "@/lib/library";
import { getComicPeriod } from "@/lib/library";

interface Props {
  comics: Comic[];
  publisherId: string;
  characterId: string;
  accentColor: string;
}

export default function ComicsList({
  comics,
  publisherId,
  characterId,
  accentColor,
}: Props) {
  const sorted = [...comics].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-6">
      {sorted.map((comic) => {
        const period = getComicPeriod(publisherId, comic);
        return (
          <div
            key={comic.id}
            className="group relative flex flex-col gap-6 overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/60 p-5 transition-colors duration-200 hover:border-white/25 hover:bg-zinc-900 sm:flex-row lg:p-6"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-2 right-4 text-6xl font-black tracking-tighter text-white/5 lg:text-8xl"
            >
              {String(comic.order).padStart(2, "0")}
            </span>

            <ComicLink
              href={`/${publisherId}/${characterId}/${comic.id}`}
              className="flex-shrink-0"
            >
              <div className="aspect-[2/3] w-full overflow-hidden rounded-2xl shadow-xl sm:w-36 lg:w-40">
                <ComicCover
                  src={comic.cover}
                  alt={comic.title}
                  width={160}
                  height={240}
                  sizes="(min-width: 1024px) 160px, (min-width: 640px) 144px, 100vw"
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              </div>
            </ComicLink>

            <div className="relative flex flex-1 flex-col justify-between gap-4">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {period && <PeriodBadge period={period} />}
                  {comic.year > 0 && (
                    <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                      {comic.year}
                    </span>
                  )}
                </div>

                <h3 className="mb-3 text-2xl font-black uppercase leading-[0.95] tracking-tight text-white lg:text-3xl">
                  {comic.title}
                </h3>

                <p className="line-clamp-4 text-sm leading-relaxed text-zinc-400">
                  {comic.description}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <ComicLink
                  href={`/${publisherId}/${characterId}/${comic.id}`}
                  className="cursor-pointer rounded-full px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-black transition-opacity duration-200 hover:opacity-85"
                  style={{ backgroundColor: accentColor }}
                >
                  Lire
                </ComicLink>
                <span className="text-xs text-zinc-500">{comic.pageCount} pages</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
