import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import CharacterCarousel from "@/components/CharacterCarousel";
import { getPublisher, getPublisherCharacters } from "@/lib/library";

type Params = Promise<{ publisher: string }>;

export default async function PublisherPage({ params }: { params: Params }) {
  const { publisher: publisherId } = await params;
  const publisher = getPublisher(publisherId);

  if (!publisher) notFound();

  const characters = getPublisherCharacters(publisherId);

  return (
    <div className="bg-zinc-950 min-h-screen">
      <Navbar />

      {/* Publisher header */}
      <section
        className="relative pt-20 pb-16 flex items-end overflow-hidden"
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
              src={`/${publisherId}.png`}
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

      {/* Characters carousel */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl font-bold text-white mb-2">Personnages</h2>
          <p className="text-zinc-500 text-sm mb-10">
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
    </div>
  );
}
