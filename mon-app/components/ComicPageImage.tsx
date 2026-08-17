"use client";

import Image from "next/image";

interface Props {
  src: string;
  pageNum: number;
  priority?: boolean;
}

/** Page de comic via l’optimiseur Next.js → cache Vercel, moins d’egress Supabase. */
export default function ComicPageImage({ src, pageNum, priority = false }: Props) {
  return (
    <Image
      src={src}
      alt={`Page ${pageNum}`}
      width={900}
      height={1400}
      sizes="(max-width: 768px) 100vw, 672px"
      quality={75}
      className="w-full h-auto block"
      loading={priority ? "eager" : "lazy"}
      priority={priority}
    />
  );
}
