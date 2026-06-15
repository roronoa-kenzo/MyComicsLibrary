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
            className="group flex flex-col sm:flex-row gap-6 bg-zinc-900 rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all duration-200 hover:bg-zinc-900/80"
          >
            <ComicLink
              href={`/${publisherId}/${characterId}/${comic.id}`}
              className="flex-shrink-0"
            >
              <div className="w-full sm:w-36 aspect-[2/3] rounded-lg overflow-hidden shadow-xl">
                <img
                  src={comic.cover}
                  alt={comic.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </ComicLink>

            <div className="flex flex-col justify-between gap-4 flex-1">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {period && <PeriodBadge period={period} />}
                  <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
                    Vol. {comic.order}
                  </span>
                  {comic.year > 0 && (
                    <>
                      <span className="text-zinc-700">·</span>
                      <span className="text-zinc-500 text-xs">{comic.year}</span>
                    </>
                  )}
                </div>
                <h3 className="text-white font-bold text-xl leading-tight mb-3">
                  {comic.title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed line-clamp-4">
                  {comic.description}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <ComicLink
                  href={`/${publisherId}/${characterId}/${comic.id}`}
                  className="px-6 py-2.5 rounded-full text-sm font-bold text-black transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  style={{ backgroundColor: accentColor }}
                >
                  Lire →
                </ComicLink>
                <span className="text-zinc-600 text-xs">{comic.pageCount} pages</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
