import type { Metadata } from "next";
import Link from "next/link";
import ComicCover from "@/components/ComicCover";
import HeroBackground from "@/components/HeroBackground";
import Navbar from "@/components/Navbar";
import HeroComicLink from "@/components/HeroComicLink";
import WebSiteJsonLd from "@/components/WebSiteJsonLd";
import { getAllPublishers, getLastScraped, getPublisherLogo } from "@/lib/library";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: `${SITE_NAME} – Bibliothèque de comics DC & Marvel`,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default function Home() {
  const { publisher, character, comic } = getLastScraped();
  const publishers = getAllPublishers();
  const hasHero = !!(comic && character && publisher);

  return (
    <div className="bg-zinc-950 min-h-screen">
      <WebSiteJsonLd />
      <Navbar />

      {/* ── Hero : dernier comic scrappé ── */}
      {hasHero && (
        <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
          <div className="absolute inset-0 overflow-hidden">
            <HeroBackground src={comic.cover} alt="" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/95 to-zinc-950/60" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-zinc-950 to-transparent" />

          <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center gap-12 py-20">
            {/* Text side */}
            <div className="flex-1 flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-white"
                  style={{ backgroundColor: publisher.gradientFrom }}
                >
                  {publisher.name}
                </span>
                <span className="text-zinc-500 text-sm">Dernier ajouté</span>
              </div>

              <div>
                <p className="text-zinc-400 text-base font-medium mb-2">
                  {character.name} · {character.realName}
                </p>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
                  {comic.title}
                </h1>
                <p className="text-zinc-400 text-sm mt-2">{comic.year}</p>
              </div>

              <p className="text-zinc-400 text-base leading-relaxed max-w-xl line-clamp-4">
                {comic.description}
              </p>

              <HeroComicLink
                href={`/${publisher.id}/${character.id}/${comic.id}`}
                accentColor={publisher.gradientFrom}
              />
            </div>

            {/* Cover side */}
            <div className="flex-shrink-0">
              <div
                className="w-64 sm:w-72 lg:w-80 rounded-lg overflow-hidden shadow-2xl"
                style={{
                  transform: "rotate(-2deg)",
                  boxShadow: `0 30px 60px rgba(0,0,0,0.8), 0 0 40px ${publisher.gradientFrom}33`,
                }}
              >
                <ComicCover
                  src={comic.cover}
                  alt={comic.title}
                  width={320}
                  height={480}
                  sizes="(min-width: 1024px) 320px, (min-width: 640px) 288px, 256px"
                  priority
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
            <span className="text-zinc-600 text-xs tracking-widest uppercase">Scroll</span>
            <span className="text-zinc-600 text-lg leading-none">↓</span>
          </div>
        </section>
      )}

      {/* ── Guide de Lecture ── */}
      <section className={`py-24 px-6 bg-zinc-900/50 ${!hasHero ? "pt-28" : ""}`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-white tracking-tight">
              Guide de Lecture
            </h2>
            <p className="text-zinc-400 mt-2 text-base">
              Trois étapes pour plonger dans l&apos;univers comics
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Choisir un univers",
                description:
                  "Sélectionne DC ou Marvel depuis les banderoles ci-dessous ou la navigation en haut de page.",
                icon: "🌐",
              },
              {
                step: "02",
                title: "Sélectionner un héros",
                description:
                  "Navigue dans le carrousel de personnages et clique sur celui qui t'intéresse.",
                icon: "🦸",
              },
              {
                step: "03",
                title: "Lire le comic",
                description:
                  "Choisis un arc narratif dans la liste ordonnée et profite d'une lecture immersive.",
                icon: "📖",
              },
            ].map(({ step, title, description, icon }) => (
              <div
                key={step}
                className="bg-zinc-900 rounded-2xl p-7 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{icon}</span>
                  <div>
                    <span className="text-zinc-600 text-xs font-bold tracking-widest uppercase block mb-1">
                      Étape {step}
                    </span>
                    <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Banderoles éditeurs ── */}
      <section className="flex flex-col">
        {publishers.map((pub) => (
          <Link
            key={pub.id}
            href={`/${pub.id}`}
            className={`relative group overflow-hidden flex items-center justify-center ${
              pub.comicsOnly ? "h-64 sm:h-80 lg:h-96" : "h-64 sm:h-80"
            }`}
            style={{
              background: `linear-gradient(135deg, ${pub.gradientFrom}, ${pub.gradientTo})`,
            }}
          >
            {/* Noise texture overlay */}
            <div className="absolute inset-0 opacity-5 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC42NSIgbnVtT2N0YXZlcz0iMyIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWx0ZXI9InVybCgjYSkiIG9wYWNpdHk9IjEiLz48L3N2Zz4=')]" />

            {/* Hover brightness overlay */}
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />

            {/* Content */}
            {pub.comicsOnly ? (
              <div className="relative z-10 px-6 transition-transform duration-300 group-hover:scale-105">
                <img
                  src={getPublisherLogo(pub)}
                  alt={pub.name}
                  className="h-28 sm:h-36 lg:h-44 xl:h-48 w-auto max-w-[min(82vw,480px)] object-contain drop-shadow-2xl"
                />
              </div>
            ) : (
              <div className="relative z-10 flex flex-col items-center gap-3 text-white text-center px-6 transition-transform duration-300 group-hover:scale-105">
                <img
                  src={getPublisherLogo(pub)}
                  alt={pub.name}
                  className="h-16 sm:h-20 w-auto object-contain mb-2 drop-shadow-2xl"
                />

                <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                  {pub.name}
                </h2>
                <p className="text-white/60 text-sm">{pub.tagline}</p>
                <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-white/80 group-hover:text-white transition-colors">
                  <span>Découvrir les personnages</span>
                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </div>
            )}
          </Link>
        ))}
      </section>
    </div>
  );
}
