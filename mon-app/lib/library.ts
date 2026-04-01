import libraryData from "@/data/library.json";

export interface Comic {
  id: string;
  title: string;
  cover: string;
  year: number;
  order: number;
  description: string;
  pagesDir: string;
  pageCount: number;
  pageExtension?: string;
}

export interface Character {
  id: string;
  publisherId: string;
  name: string;
  realName: string;
  image: string;
  comics: Comic[];
}

export interface Publisher {
  id: string;
  name: string;
  tagline: string;
  gradientFrom: string;
  gradientTo: string;
}

interface LastScraped {
  publisherId: string;
  characterId: string;
  comicId: string;
}

interface Library {
  lastScraped: LastScraped;
  publishers: Publisher[];
  characters: Character[];
}

const library = libraryData as Library;

export function getAllPublishers(): Publisher[] {
  return library.publishers;
}

export function getPublisher(id: string): Publisher | undefined {
  return library.publishers.find((p) => p.id === id);
}

export function getPublisherCharacters(publisherId: string): Character[] {
  return library.characters.filter((c) => c.publisherId === publisherId);
}

export function getCharacter(
  publisherId: string,
  characterId: string
): Character | undefined {
  return library.characters.find(
    (c) => c.publisherId === publisherId && c.id === characterId
  );
}

export function getComic(
  publisherId: string,
  characterId: string,
  comicId: string
): Comic | undefined {
  return getCharacter(publisherId, characterId)?.comics.find(
    (c) => c.id === comicId
  );
}

export function getLastScraped(): {
  publisher: Publisher | undefined;
  character: Character | undefined;
  comic: Comic | undefined;
} {
  const { publisherId, characterId, comicId } = library.lastScraped;
  return {
    publisher: getPublisher(publisherId),
    character: getCharacter(publisherId, characterId),
    comic: getComic(publisherId, characterId, comicId),
  };
}

export function getComicPages(comic: Comic): string[] {
  const ext = comic.pageExtension ?? "webp";
  return Array.from({ length: comic.pageCount }, (_, i) =>
    `/comics/${comic.pagesDir}/${String(i + 1).padStart(4, "0")}.${ext}`
  );
}
