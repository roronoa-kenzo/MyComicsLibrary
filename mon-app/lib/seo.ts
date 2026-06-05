import type { Metadata } from "next";

export const SITE_NAME = "The Comic Book Day";
export const SITE_DESCRIPTION =
  "Bibliothèque de comics DC et Marvel en ligne. Lis Batman, Spider-Man, Green Lantern et plus encore — guides de lecture, arcs narratifs et lecture immersive.";

export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export const baseMetadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  applicationName: SITE_NAME,
  title: {
    default: `${SITE_NAME} – Bibliothèque de comics DC & Marvel`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "comics",
    "bandes dessinées",
    "DC Comics",
    "Marvel",
    "Batman",
    "Spider-Man",
    "Green Lantern",
    "lecture en ligne",
    "bibliothèque comics",
    "manga",
    "super-héros",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  robots: { index: true, follow: true },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
    shortcut: "/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: SITE_NAME,
    title: `${SITE_NAME} – Bibliothèque de comics DC & Marvel`,
    description: SITE_DESCRIPTION,
    images: [{ url: "/icon.svg", width: 171, height: 217, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} – Bibliothèque de comics DC & Marvel`,
    description: SITE_DESCRIPTION,
    images: ["/icon.svg"],
  },
};
