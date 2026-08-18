import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import CharacterGrid from "@/components/CharacterGrid";
import ComicsList from "@/components/ComicsList";
import EventCards from "@/components/EventCards";
import SectionHeading from "@/components/SectionHeading";
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
              <h1 className="text-4xl font-black uppercase leading-[0.85] tracking-tighter text-white sm:text-5xl lg:text-6xl">
                {publisher.name}
              </h1>
              <p className="mt-3 text-sm text-zinc-400">{publisher.tagline}</p>
            </div>
          </div>
        </div>
      </section>

      {publisher.comicsOnly && catalog ? (
        <section className="px-6 py-14 lg:py-20">
          <div className="max-w-7xl mx-auto">
            <SectionHeading
              eyebrow="Catalogue"
              title="Comics"
              meta={`${catalog.comics.length} volume${catalog.comics.length > 1 ? "s" : ""}`}
              accentColor={publisher.gradientFrom}
            />

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
          {characters.length > 0 && (
            <section className="px-6 py-14 lg:py-20">
              <div className="max-w-7xl mx-auto">
                <SectionHeading
                  eyebrow="Héros"
                  title="Personnages"
                  meta={`${characters.length} personnage${characters.length > 1 ? "s" : ""}`}
                  accentColor={publisher.gradientFrom}
                />

                <CharacterGrid
                  characters={characters}
                  publisherId={publisherId}
                  accentColor={publisher.gradientFrom}
                />
              </div>
            </section>
          )}

          {teams.length > 0 && (
            <section className="border-t border-white/5 px-6 py-14 lg:py-20">
              <div className="max-w-7xl mx-auto">
                <SectionHeading
                  eyebrow="Collectifs"
                  title="Équipes"
                  meta={`${teams.length} équipe${teams.length > 1 ? "s" : ""}`}
                  accentColor={publisher.gradientFrom}
                />

                <CharacterGrid
                  characters={teams}
                  publisherId={publisherId}
                  accentColor={publisher.gradientFrom}
                  wide
                />
              </div>
            </section>
          )}

          {timeline.length > 0 && (
            <section className="border-t border-white/5 px-6 py-14 lg:py-20">
              <div className="max-w-7xl mx-auto">
                <SectionHeading
                  eyebrow="Ordre de lecture"
                  title="Chronologie"
                  meta={`${timeline.length} étape${timeline.length > 1 ? "s" : ""}`}
                  accentColor={publisher.gradientFrom}
                />
              </div>

              <div className="max-w-4xl lg:max-w-5xl mx-auto">
                <Timeline items={timeline} publisherId={publisherId} />
              </div>
            </section>
          )}

          {events.length > 0 && (
            <section className="border-t border-white/5 px-6 py-14 lg:py-20">
              <div className="max-w-7xl mx-auto">
                <SectionHeading
                  eyebrow="Crossovers"
                  title="Events"
                  meta={`${events.length} event${events.length > 1 ? "s" : ""}`}
                  accentColor={publisher.gradientFrom}
                />

                <EventCards events={events} publisherId={publisherId} />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
