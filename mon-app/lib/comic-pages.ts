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

export function getComicPageUrl(
  storagePath: string,
  pageExtension: string,
  pageNumber: number
): string {
  return supabasePublicUrl(
    `${storagePath}/${String(pageNumber).padStart(4, "0")}.${pageExtension}`
  );
}
