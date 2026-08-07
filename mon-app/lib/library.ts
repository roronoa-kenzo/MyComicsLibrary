import "server-only";
import libraryData from "@/data/library.json";
import { resolveComicBackUrl } from "@/lib/comic-back-url";
import { getComicPageUrl, supabasePublicUrl } from "@/lib/comic-pages";

export { resolveComicBackUrl };

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
  // Catalogue direct (ex. Invincible) : comics sans carrousel personnages.
  isCatalog?: boolean;
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
  // Logo dans public/ (défaut : /<id>.png).
  logo?: string;
  // Liste de comics uniquement, sans personnages / frise / events.
  comicsOnly?: boolean;
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

export function getPublisherLogo(publisher: Publisher): string {
  return publisher.logo ?? `/${publisher.id}.png`;
}

export function getPublisherCatalog(publisherId: string): Character | undefined {
  return library.characters.find(
    (c) => c.publisherId === publisherId && c.isCatalog
  );
}

export function getPublisherCharacters(publisherId: string): Character[] {
  return library.characters.filter(
    (c) =>
      c.publisherId === publisherId &&
      !c.isEvent &&
      !c.isTeam &&
      !c.isCatalog
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

export function getComicBackUrl(publisherId: string, characterId: string): string {
  const publisher = getPublisher(publisherId);
  const character = getCharacter(publisherId, characterId);
  if (publisher?.comicsOnly || character?.isCatalog) {
    return `/${publisherId}`;
  }
  return `/${publisherId}/${characterId}`;
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
  const publisher = getPublisher(publisherId);
  const character = getCharacter(publisherId, characterId);
  let comic = getComic(publisherId, characterId, comicId);

  // Repli si le comicId du scraper ne correspond pas (ex. suffixe -volume-1)
  if (!comic && character?.comics.length) {
    comic = [...character.comics].sort((a, b) => b.order - a.order)[0];
  }

  return { publisher, character, comic };
}

export { supabasePublicUrl };

export function getAllComicRoutes(): {
  publisher: string;
  character: string;
  comic: string;
}[] {
  return library.characters.flatMap((character) =>
    character.comics.map((comic) => ({
      publisher: character.publisherId,
      character: character.id,
      comic: comic.id,
    }))
  );
}

export function getComicPages(comic: Comic): string[] {
  return Array.from({ length: comic.pageCount }, (_, i) =>
    getComicPageUrl(comic.storagePath, comic.pageExtension, i + 1)
  );
}
