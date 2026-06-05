import type { MetadataRoute } from "next";
import { getAllPublishers, getPublisherCharacters } from "@/lib/library";
import { siteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const entries: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
  ];

  for (const publisher of getAllPublishers()) {
    entries.push({
      url: `${base}/${publisher.id}`,
      changeFrequency: "weekly",
      priority: 0.8,
    });

    for (const character of getPublisherCharacters(publisher.id)) {
      entries.push({
        url: `${base}/${publisher.id}/${character.id}`,
        changeFrequency: "weekly",
        priority: 0.7,
      });

      for (const comic of character.comics) {
        entries.push({
          url: `${base}/${publisher.id}/${character.id}/${comic.id}`,
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
    }
  }

  return entries;
}
