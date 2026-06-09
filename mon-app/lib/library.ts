import "server-only";
import libraryData from "@/data/library.json";

export interface Comic {
  id: string;
  title: string;
  cover: string;
  year: number;
  order: number;
  description: string;
  // Pages stockées dans Supabase Storage : <storagePath>/0001.<ext>, 0002...
  storagePath: string;
  pageCount: number;
  pageExtension: string;
  // ID de période éditoriale (precrisis, postcrisis, new52…) défini sur l'éditeur.
  period?: string;
}

export interface Character {
  id: string;
  publisherId: string;
  name: string;
  realName: string;
  image: string;
  comics: Comic[];
  // Crossover/event (ex. Crisis on Infinite Earths) : pas un personnage,
  // masqué du carrousel mais toujours lisible et utilisable dans la frise.
  isEvent?: boolean;
  // Équipe (ex. Justice League) : carrousel Équipes, même pages/comics.
  isTeam?: boolean;
}

export interface Period {
  id: string;
  name: string;
  color: string;
}

export interface Publisher {
  id: string;
  name: string;
  tagline: string;
  gradientFrom: string;
  gradientTo: string;
  // Périodes éditoriales (Pre-Crisis, Post-Crisis, New 52…) avec leur couleur.
  periods?: Period[];
  // Frise chronologique : comics ordonnés, chacun rattaché à une période.
  timeline?: { comic: string; period?: string }[];
}

export interface TimelineItem {
  comic: Comic;
  characterId: string;
  characterName: string;
  period?: Period;
  isEvent?: boolean;
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

const library = libraryData as unknown as Library;

export function getAllPublishers(): Publisher[] {
  return library.publishers;
}

export function getPublisher(id: string): Publisher | undefined {
  return library.publishers.find((p) => p.id === id);
}

export function getPublisherCharacters(publisherId: string): Character[] {
  return library.characters.filter(
    (c) => c.publisherId === publisherId && !c.isEvent && !c.isTeam
  );
}

export function getPublisherTeams(publisherId: string): Character[] {
  return library.characters.filter(
    (c) => c.publisherId === publisherId && c.isTeam
  );
}

export function getPublisherEvents(publisherId: string): Character[] {
  return library.characters.filter(
    (c) => c.publisherId === publisherId && c.isEvent
  );
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

export function getComicPeriod(
  publisherId: string,
  comic: Comic,
  fallbackPeriodId?: string
): Period | undefined {
  const periodId = comic.period ?? fallbackPeriodId;
  if (!periodId) return undefined;
  return getPublisher(publisherId)?.periods?.find((p) => p.id === periodId);
}

export function getPublisherTimeline(publisherId: string): TimelineItem[] {
  const publisher = getPublisher(publisherId);
  if (!publisher?.timeline?.length) return [];

  const characters = library.characters.filter(
    (c) => c.publisherId === publisherId
  );
  const periods = publisher.periods ?? [];

  return publisher.timeline.flatMap((entry) => {
    for (const character of characters) {
      const comic = character.comics.find((c) => c.id === entry.comic);
      if (comic) {
        return [
          {
            comic,
            characterId: character.id,
            characterName: character.name,
            period: getComicPeriod(publisherId, comic, entry.period),
            isEvent: character.isEvent,
          },
        ];
      }
    }
    return [];
  });
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

function encodePath(storagePath: string): string {
  return storagePath.split("/").map(encodeURIComponent).join("/");
}

export function supabasePublicUrl(key: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET;
  if (!base || !bucket) {
    throw new Error(
      "Variables Supabase manquantes : définis NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_BUCKET (.env.local en local, Environment Variables sur Vercel)."
    );
  }
  return `${base}/storage/v1/object/public/${bucket}/${encodePath(key)}`;
}

export function getComicPages(comic: Comic): string[] {
  return Array.from({ length: comic.pageCount }, (_, i) =>
    supabasePublicUrl(
      `${comic.storagePath}/${String(i + 1).padStart(4, "0")}.${comic.pageExtension}`
    )
  );
}
