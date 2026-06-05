#!/usr/bin/env python3
"""
Migration des comics déjà scrapés vers Supabase Storage.

Lit les anciens fichiers d'URLs (mon-app/data/pages/**.json), télécharge chaque
page depuis sushiscan (via le cookie cf_session.json) et l'envoie sur Supabase,
puis réécrit library.json au nouveau format (storagePath / pageCount / pageExtension).

Usage :
    cd scraper
    python3 migrate_to_supabase.py
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

from sushiscan import (
    ExpiredCookieError,
    Page,
    Supabase,
    _download_all,
    _get_cf_clearance,
    _looks_expired,
    _make_async_session,
    _upload_all,
)

ROOT = Path(__file__).parent.parent / "mon-app"
LIBRARY = ROOT / "data" / "library.json"
PAGES_DIR = ROOT / "data" / "pages"
CF_SESSION = ROOT / "data" / "cf_session.json"


def _load_cf_session() -> tuple[str, str]:
    if not CF_SESSION.exists():
        raise RuntimeError(
            f"{CF_SESSION} introuvable. Lance d'abord un scrape pour générer le cookie."
        )
    sess = json.loads(CF_SESSION.read_text(encoding="utf-8"))
    return sess["cookie"], sess["userAgent"]


async def _migrate_comic(
    dl_session,
    supa: Supabase,
    storage_path: str,
    urls: list[str],
) -> tuple[str, int, int]:
    """Télécharge + valide + upload toutes les pages. Retourne (cover_url, pages_ok, total)."""
    pages = [
        Page(url=u, filename=f"{i + 1:04d}.{u.rsplit('.', 1)[-1]}")
        for i, u in enumerate(urls)
    ]
    blobs = await _download_all(dl_session, pages)
    if _looks_expired(blobs):
        return "", 0, len(pages)
    ok = await _upload_all(supa, pages, blobs, storage_path)
    cover = supa.public_url(f"{storage_path}/{pages[0].filename}")
    return cover, ok, len(pages)


async def main() -> None:
    supa = Supabase.from_env()
    cookie, ua = _load_cf_session()

    data = json.loads(LIBRARY.read_text(encoding="utf-8"))
    dl_session = _make_async_session(cookie, ua)
    refreshed = False

    migrated: list[Path] = []  # JSON à supprimer (comics 100% migrés)
    changed = False

    try:
        for char in data["characters"]:
            for comic in char["comics"]:
                key = comic.get("pagesFile")
                if not key:
                    continue

                json_path = PAGES_DIR / f"{key}.json"
                if not json_path.exists():
                    print(f"  ⚠ {json_path} introuvable, comic ignoré : {comic['id']}")
                    continue

                urls = json.loads(json_path.read_text(encoding="utf-8"))
                if not urls:
                    continue

                print(f"\n⬇  {comic['id']} ({len(urls)} pages)")
                cover, ok, total = await _migrate_comic(dl_session, supa, key, urls)

                if not cover and not refreshed:
                    print("  ↻ Cookie expiré → tentative de rafraîchissement via Chrome headless...")
                    try:
                        cookie, ua = await _get_cf_clearance("https://sushiscan.net/")
                    except Exception as exc:
                        raise ExpiredCookieError(
                            f"Rafraîchissement auto impossible ({exc}).\n"
                            "Mets à jour mon-app/data/cf_session.json manuellement :\n"
                            "  1. Ouvre https://sushiscan.net/ dans Chrome (passe le check Cloudflare)\n"
                            "  2. DevTools > Application > Cookies > copie la valeur de cf_clearance\n"
                            "  3. Console > tape  navigator.userAgent  et copie le texte\n"
                            '  4. Mets {"cookie": "cf_clearance=...", "userAgent": "..."} dans le fichier'
                        )
                    res = dl_session.close()
                    if asyncio.iscoroutine(res):
                        await res
                    dl_session = _make_async_session(cookie, ua)
                    refreshed = True
                    cover, ok, total = await _migrate_comic(dl_session, supa, key, urls)

                if not cover:
                    raise ExpiredCookieError(
                        "Cookie Cloudflare toujours invalide après rafraîchissement. "
                        "Aucune donnée n'a été modifiée."
                    )

                if ok != total:
                    print(f"  ⚠ {total - ok} page(s) en échec : comic conservé pour réessai.")
                    continue

                print(f"  ✓ {ok}/{total} pages → {supa.bucket}/{key}")
                comic["storagePath"] = key
                comic["pageCount"] = total
                comic["pageExtension"] = urls[0].rsplit(".", 1)[-1]
                comic["cover"] = cover
                comic.pop("pagesFile", None)
                if char.get("image", "").startswith("/api/img"):
                    char["image"] = cover
                migrated.append(json_path)
                changed = True
    finally:
        res = dl_session.close()
        if asyncio.iscoroutine(res):
            await res

    if changed:
        LIBRARY.write_text(
            json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        print(f"\n✓ library.json réécrit au format Supabase")

    for p in migrated:
        p.unlink(missing_ok=True)
    if migrated:
        print(f"✓ {len(migrated)} fichier(s) d'URLs supprimé(s) du repo")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except ExpiredCookieError as exc:
        print(f"\n⛔ {exc}")
        raise SystemExit(1)
