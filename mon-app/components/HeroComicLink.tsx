"use client";

import ComicLink from "@/components/ComicLink";

interface Props {
  href: string;
  accentColor: string;
}

export default function HeroComicLink({ href, accentColor }: Props) {
  return (
    <ComicLink
      href={href}
      className="self-start px-8 py-4 rounded-full font-bold text-black text-sm uppercase tracking-wider transition-all duration-200 hover:scale-105 hover:shadow-2xl"
      style={{ backgroundColor: accentColor }}
    >
      Lire maintenant →
    </ComicLink>
  );
}
