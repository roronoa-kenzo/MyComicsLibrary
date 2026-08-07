import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import ComicReader from "@/components/ComicReader";
import {
  getAllComicRoutes,
  getCharacter,
  getComic,
  getComicBackUrl,
  getPublisher,
} from "@/lib/library";
import { getOpenGraphCoverUrl } from "@/lib/cover-image";

type Params = Promise<{
  publisher: string;
  character: string;
  comic: string;
}>;

export async function generateStaticParams() {
  return getAllComicRoutes();
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { publisher: publisherId, character: characterId, comic: comicId } =
    await params;
  const character = getCharacter(publisherId, characterId);
  const comic = getComic(publisherId, characterId, comicId);
  if (!character || !comic) return {};

  return {
    title: `${comic.title} – ${character.name}`,
    description: comic.description,
    alternates: {
      canonical: `/${publisherId}/${characterId}/${comicId}`,
    },
    openGraph: {
      title: `${comic.title} | The Comic Book Day`,
      description: comic.description,
      type: "article",
      images: [{ url: getOpenGraphCoverUrl(comic.cover), alt: comic.title }],
    },
  };
}

function ComicReaderFallback({ title }: { title: string }) {
  return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <p className="text-zinc-500 text-sm">{title}</p>
    </div>
  );
}

export default async function ComicPage({ params }: { params: Params }) {
  const { publisher: publisherId, character: characterId, comic: comicId } =
    await params;

  const publisher = getPublisher(publisherId);
  const character = getCharacter(publisherId, characterId);
  const comic = getComic(publisherId, characterId, comicId);

  if (!publisher || !character || !comic) notFound();

  const fallbackBackUrl = getComicBackUrl(publisherId, characterId);
  const title =
    publisher.comicsOnly || character.isCatalog
      ? comic.title
      : `${character.name} · ${comic.title}`;

  return (
    <Suspense fallback={<ComicReaderFallback title={title} />}>
      <ComicReader
        pageCount={comic.pageCount}
        storagePath={comic.storagePath}
        pageExtension={comic.pageExtension}
        title={title}
        fallbackBackUrl={fallbackBackUrl}
      />
    </Suspense>
  );
}
