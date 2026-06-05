import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ComicReader from "@/components/ComicReader";
import { getCharacter, getComic, getComicPages, getPublisher } from "@/lib/library";

type Params = Promise<{
  publisher: string;
  character: string;
  comic: string;
}>;

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

export default async function ComicPage({ params }: { params: Params }) {
  const { publisher: publisherId, character: characterId, comic: comicId } = await params;

  const publisher = getPublisher(publisherId);
  const character = getCharacter(publisherId, characterId);
  const comic = getComic(publisherId, characterId, comicId);

  if (!publisher || !character || !comic) notFound();

  const pages = getComicPages(comic);
  const backUrl = `/${publisherId}/${characterId}`;

  return (
    <ComicReader
      pages={pages}
      title={`${character.name} · ${comic.title}`}
      backUrl={backUrl}
    />
  );
}
