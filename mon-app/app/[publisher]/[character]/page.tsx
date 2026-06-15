import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ComicsList from "@/components/ComicsList";
import { getCharacter, getPublisher } from "@/lib/library";

type Params = Promise<{ publisher: string; character: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { publisher: publisherId, character: characterId } = await params;
  const publisher = getPublisher(publisherId);
  const character = getCharacter(publisherId, characterId);
  if (!publisher || !character) return {};

  const count = character.comics.length;
  return {
    title: `${character.name} – ${publisher.name}`,
    description: `Lis les comics ${character.name} (${character.realName}) chez ${publisher.name}. ${count} comic${count > 1 ? "s" : ""} disponible${count > 1 ? "s" : ""}, classés par ordre de lecture.`,
    alternates: { canonical: `/${publisherId}/${characterId}` },
    openGraph: {
      title: `${character.name} | The Comic Book Day`,
      description: character.comics[0]?.description ?? `${character.name} – ${publisher.name}`,
      images: character.image ? [{ url: character.image, alt: character.name }] : undefined,
    },
  };
}

export default async function CharacterPage({ params }: { params: Params }) {
  const { publisher: publisherId, character: characterId } = await params;

  const publisher = getPublisher(publisherId);
  const character = getCharacter(publisherId, characterId);

  if (!publisher || !character) notFound();

  if (character.isCatalog) {
    redirect(`/${publisherId}`);
  }

  return (
    <div className="bg-zinc-950 min-h-screen">
      <Navbar />

      {/* Character header */}
      <section className="relative pt-20 pb-8 overflow-hidden">
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
              className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0"
              style={{ boxShadow: `0 0 0 4px ${publisher.gradientFrom}` }}
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
      <section className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-lg font-bold text-white mb-8">
            {character.comics.length} comic{character.comics.length > 1 ? "s" : ""} disponible
            {character.comics.length > 1 ? "s" : ""}
          </h2>

          <ComicsList
            comics={character.comics}
            publisherId={publisherId}
            characterId={characterId}
            accentColor={publisher.gradientFrom}
          />
        </div>
      </section>
    </div>
  );
}
