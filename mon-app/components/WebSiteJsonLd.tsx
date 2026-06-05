import { SITE_NAME, siteUrl } from "@/lib/seo";

/** Schéma WebSite pour le nom affiché au-dessus du lien dans Google (pas le title link). */
export default function WebSiteJsonLd() {
  const url = siteUrl();
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${url}/`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
