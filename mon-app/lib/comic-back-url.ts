/** Chemin de retour depuis ?from=… (anti open-redirect). */
export function resolveComicBackUrl(
  from: string | undefined,
  fallback: string
): string {
  if (!from || !from.startsWith("/") || from.startsWith("//")) {
    return fallback;
  }
  return from;
}
