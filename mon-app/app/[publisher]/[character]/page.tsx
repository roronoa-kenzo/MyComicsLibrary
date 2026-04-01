import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getCharacter, getPublisher } from "@/lib/library";

type Params = Promise<{ publisher: string; character: string }>;

export default async function CharacterPage({ params }: { params: Params }) {
  const { publisher: publisherId, character: characterId } = await params;

  const publisher = getPublisher(publisherId);
  const character = getCharacter(publisherId, characterId);

  if (!publisher || !character) notFound();

  const sortedComics = [...character.comics].sort((a, b) => a.order - b.order);

  return (
    <div className="bg-zinc-950 min-h-screen">
      <Navbar />

      {/* Character header */}
      <section className="relative pt-20 pb-12 overflow-hidden">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            background: `radial-gradient(ellipse at 20% 50%, ${publisher.gradientFrom}66, transparent 60%)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-950 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 pt-10">
          <div className="flex items-center gap-2 text-sm mb-8">
            <Link href="/" className="text-zinc-500 hover:text-white transition-colors">
              Accueil
            </Link>
            <span className="text-zinc-700">›</span>
            <Link
              href={`/${publisherId}`}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              {publisher.name}
            </Link>
            <span className="text-zinc-700">›</span>
            <span className="text-zinc-300">{character.name}</span>
          </div>

          <div className="flex items-center gap-8">
            <div
              className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0 ring-4"
              style={{ ringColor: publisher.gradientFrom, boxShadow: `0 0 0 4px ${publisher.gradientFrom}` }}
            >
              <img
                src={character.image}
                alt={character.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p
                className="text-sm font-bold uppercase tracking-widest mb-1"
                style={{ color: publisher.gradientFrom }}
              >
                {publisher.name}
              </p>
              <h1 className="text-4xl font-black text-white">{character.name}</h1>
              <p className="text-zinc-400 mt-1">{character.realName}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comics list */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-lg font-bold text-white mb-8">
            {sortedComics.length} comic{sortedComics.length > 1 ? "s" : ""} disponible
            {sortedComics.length > 1 ? "s" : ""}
          </h2>

          <div className="flex flex-col gap-6">
            {sortedComics.map((comic) => (
              <div
                key={comic.id}
                className="group flex flex-col sm:flex-row gap-6 bg-zinc-900 rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all duration-200 hover:bg-zinc-900/80"
              >
                {/* Cover */}
                <Link
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
                </Link>

                {/* Info */}
                <div className="flex flex-col justify-between gap-4 flex-1">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
                        Vol. {comic.order}
                      </span>
                      <span className="text-zinc-700">·</span>
                      <span className="text-zinc-500 text-xs">{comic.year}</span>
                    </div>
                    <h3 className="text-white font-bold text-xl leading-tight mb-3">
                      {comic.title}
                    </h3>
                    <p className="text-zinc-400 text-sm leading-relaxed line-clamp-4">
                      {comic.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <Link
                      href={`/${publisherId}/${characterId}/${comic.id}`}
                      className="px-6 py-2.5 rounded-full text-sm font-bold text-black transition-all duration-200 hover:scale-105 hover:shadow-lg"
                      style={{ backgroundColor: publisher.gradientFrom }}
                    >
                      Lire →
                    </Link>
                    <span className="text-zinc-600 text-xs">
                      {comic.pageCount} pages
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
