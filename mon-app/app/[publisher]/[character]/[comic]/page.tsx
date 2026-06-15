import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ComicReader from "@/components/ComicReader";
import { getCharacter, getComic, getComicBackUrl, getComicPages, getPublisher, resolveComicBackUrl } from "@/lib/library";

type Params = Promise<{
  publisher: string;
  character: string;
  comic: string;
}>;

type SearchParams = Promise<{ from?: string }>;

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
      images: [{ url: comic.cover, alt: comic.title }],
    },
  };
}

export default async function ComicPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { publisher: publisherId, character: characterId, comic: comicId } = await params;
  const { from } = await searchParams;

  const publisher = getPublisher(publisherId);
  const character = getCharacter(publisherId, characterId);
  const comic = getComic(publisherId, characterId, comicId);

  if (!publisher || !character || !comic) notFound();

  const pages = getComicPages(comic);
  const backUrl = resolveComicBackUrl(from, getComicBackUrl(publisherId, characterId));
  const title =
    publisher.comicsOnly || character.isCatalog
      ? comic.title
      : `${character.name} · ${comic.title}`;

  return (
    <ComicReader
      pages={pages}
      title={title}
      backUrl={backUrl}
    />
  );
}
