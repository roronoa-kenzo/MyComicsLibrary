import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ComicCover from "@/components/ComicCover";
import ComicsList from "@/components/ComicsList";
import SectionHeading from "@/components/SectionHeading";
import { getCharacter, getPublisher } from "@/lib/library";
import { getOpenGraphCoverUrl } from "@/lib/cover-image";

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
      images: character.image
        ? [{ url: getOpenGraphCoverUrl(character.image), alt: character.name }]
        : undefined,
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

  const accent = publisher.gradientFrom;
  const comicCount = character.comics.length;
  const pageCount = character.comics.reduce((total, c) => total + c.pageCount, 0);

  return (
    <div className="bg-zinc-950 min-h-screen">
      <Navbar />

      <header className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <ComicCover
            src={character.image}
            alt=""
            width={1600}
            height={900}
            sizes="100vw"
            className="absolute inset-0 h-full w-full scale-105 object-cover object-center opacity-40 blur-[3px]"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/85 to-zinc-950/75" />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 10% 0%, ${accent}40, transparent 65%)`,
          }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-6 pb-12 pt-28 lg:px-12 lg:pb-16 lg:pt-36">
          <nav
            aria-label="Fil d'Ariane"
            className="mb-10 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em]"
          >
            <Link href="/" className="text-zinc-500 transition-colors hover:text-white">
              Accueil
            </Link>
            <span aria-hidden className="text-zinc-700">
              /
            </span>
            <Link
              href={`/${publisherId}`}
              className="text-zinc-500 transition-colors hover:text-white"
            >
              {publisher.name}
            </Link>
            <span aria-hidden className="text-zinc-700">
              /
            </span>
            <span className="text-zinc-300">{character.name}</span>
          </nav>

          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <span
                className="mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em]"
                style={{ color: accent }}
              >
                <span className="h-px w-8" style={{ backgroundColor: accent }} />
                {publisher.name}
              </span>

              <h1 className="text-5xl font-black uppercase leading-[0.82] tracking-tighter text-white sm:text-7xl lg:text-8xl">
                {character.name}
              </h1>

              {character.realName && (
                <p className="mt-5 text-sm uppercase tracking-[0.25em] text-zinc-400">
                  {character.realName}
                </p>
              )}

              <dl className="mt-8 flex flex-wrap items-center gap-x-10 gap-y-4">
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                    Comics
                  </dt>
                  <dd className="mt-1 text-3xl font-black tracking-tight text-white">
                    {comicCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                    Pages
                  </dt>
                  <dd className="mt-1 text-3xl font-black tracking-tight text-white">
                    {pageCount.toLocaleString("fr-FR")}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="hidden w-56 flex-shrink-0 overflow-hidden rounded-3xl border border-white/15 shadow-2xl shadow-black/50 lg:block">
              <ComicCover
                src={character.image}
                alt={character.name}
                width={448}
                height={560}
                sizes="224px"
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </header>

      <section className="px-6 py-14 lg:py-20">
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            eyebrow="Bibliographie"
            title="Comics"
            meta={`${comicCount} volume${comicCount > 1 ? "s" : ""}`}
            accentColor={accent}
          />

          <ComicsList
            comics={character.comics}
            publisherId={publisherId}
            characterId={characterId}
            accentColor={accent}
          />
        </div>
      </section>
    </div>
  );
}
