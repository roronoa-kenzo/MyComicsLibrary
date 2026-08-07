import { siteUrl } from "@/lib/seo";

export function isSupabaseCover(src: string): boolean {
  try {
    return new URL(src).hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

/** Open Graph / Twitter : sert la cover via l'optimiseur Next.js (pas Supabase direct). */
export function getOpenGraphCoverUrl(src: string, width = 640): string {
  if (!isSupabaseCover(src)) return src;

  const params = new URLSearchParams({
    url: src,
    w: String(width),
    q: "75",
  });

  return `${siteUrl()}/_next/image?${params.toString()}`;
}
