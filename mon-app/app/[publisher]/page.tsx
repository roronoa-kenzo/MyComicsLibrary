import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import CharacterCarousel from "@/components/CharacterCarousel";
import ComicsList from "@/components/ComicsList";
import EventCards from "@/components/EventCards";
import Timeline from "@/components/Timeline";
import {
  getPublisher,
  getPublisherCatalog,
  getPublisherCharacters,
  getPublisherEvents,
  getPublisherLogo,
  getPublisherTeams,
  getPublisherTimeline,
} from "@/lib/library";

type Params = Promise<{ publisher: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { publisher: publisherId } = await params;
  const publisher = getPublisher(publisherId);
  if (!publisher) return {};

  const characters = getPublisherCharacters(publisherId);
  const catalog = getPublisherCatalog(publisherId);
  const comicCount = catalog?.comics.length ?? 0;
  const description = publisher.comicsOnly
    ? `${publisher.tagline} ${comicCount} comic${comicCount > 1 ? "s" : ""} disponible${comicCount > 1 ? "s" : ""} sur The Comic Book Day.`
    : `${publisher.tagline} Découvre ${characters.length} personnage${characters.length > 1 ? "s" : ""} et leurs comics sur The Comic Book Day.`;
  return {
    title: `${publisher.name} – Comics en ligne`,
    description,
    alternates: { canonical: `/${publisherId}` },
    openGraph: {
      title: `${publisher.name} | The Comic Book Day`,
      description: publisher.tagline,
      images: [{ url: getPublisherLogo(publisher), alt: publisher.name }],
    },
  };
}

export default async function PublisherPage({ params }: { params: Params }) {
  const { publisher: publisherId } = await params;
  const publisher = getPublisher(publisherId);

  if (!publisher) notFound();

  const characters = getPublisherCharacters(publisherId);
  const catalog = getPublisherCatalog(publisherId);
  const teams = getPublisherTeams(publisherId);
  const events = getPublisherEvents(publisherId);
  const timeline = getPublisherTimeline(publisherId);
  const logo = getPublisherLogo(publisher);

  return (
    <div className="bg-zinc-950 min-h-screen">
      <Navbar />

      {/* Publisher header */}
      <section
        className="relative pt-20 pb-10 flex items-end overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${publisher.gradientFrom}33, ${publisher.gradientTo} 70%, #09090b)`,
          minHeight: "320px",
        }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse at 30% 50%, ${publisher.gradientFrom}88, transparent 70%)`,
          }}
        />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-8 transition-colors"
          >
            ← Accueil
          </Link>

          <div className="flex items-center gap-6">
            <img
              src={logo}
              alt={publisher.name}
              className="h-14 w-auto object-contain drop-shadow-xl flex-shrink-0"
            />
            <div>
              <h1 className="text-4xl font-black text-white">{publisher.name}</h1>
              <p className="text-zinc-400 text-sm mt-1">{publisher.tagline}</p>
            </div>
          </div>
        </div>
      </section>

      {publisher.comicsOnly && catalog ? (
        <section className="py-10 px-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-xl font-bold text-white mb-2">Comics</h2>
            <p className="text-zinc-500 text-sm mb-8">
              {catalog.comics.length} comic
              {catalog.comics.length > 1 ? "s" : ""} disponible
              {catalog.comics.length > 1 ? "s" : ""}
            </p>

            {catalog.comics.length > 0 ? (
              <ComicsList
                comics={catalog.comics}
                publisherId={publisherId}
                characterId={catalog.id}
                accentColor={publisher.gradientFrom}
              />
            ) : (
              <p className="text-zinc-500 text-sm">
                Aucun comic pour le moment. Les prochains ajouts apparaîtront ici.
              </p>
            )}
          </div>
        </section>
      ) : (
        <>
      {/* Characters carousel */}
      <section className="py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl font-bold text-white mb-2">Personnages</h2>
          <p className="text-zinc-500 text-sm mb-6">
            {characters.length} personnage{characters.length > 1 ? "s" : ""} disponible
            {characters.length > 1 ? "s" : ""}
          </p>

          <CharacterCarousel
            characters={characters}
            publisherId={publisherId}
            accentColor={publisher.gradientFrom}
          />
        </div>
      </section>

      {teams.length > 0 && (
        <section className="py-10 px-6 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-xl font-bold text-white mb-2">Équipes</h2>
            <p className="text-zinc-500 text-sm mb-6">
              {teams.length} équipe{teams.length > 1 ? "s" : ""} disponible
              {teams.length > 1 ? "s" : ""}
            </p>

            <CharacterCarousel
              characters={teams}
              publisherId={publisherId}
              accentColor={publisher.gradientFrom}
              emptyMessage="Aucune équipe définie pour cet éditeur."
            />
          </div>
        </section>
      )}

      {timeline.length > 0 && (
        <section className="py-10 px-6 border-t border-white/5">
          <div className="max-w-7xl mx-auto mb-6">
            <h2 className="text-xl font-bold text-white mb-2">Chronologie</h2>
            <p className="text-zinc-500 text-sm">
              L&apos;ordre de lecture des comics {publisher.name}.
            </p>
          </div>

          <div className="max-w-4xl lg:max-w-5xl mx-auto">
            <Timeline items={timeline} publisherId={publisherId} />
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section className="py-10 px-6 border-t border-white/5">
          <div className="max-w-7xl mx-auto text-left">
            <h2 className="text-xl font-bold text-white mb-2">Events</h2>
            <p className="text-zinc-500 text-sm mb-6">
              {events.length} crossover{events.length > 1 ? "s" : ""} disponible
              {events.length > 1 ? "s" : ""}
            </p>

            <EventCards events={events} publisherId={publisherId} />
          </div>
        </section>
      )}
        </>
      )}
    </div>
  );
}
