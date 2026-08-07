#!/usr/bin/env python3
"""
Recompresse les pages comics déjà hébergées sur Supabase (WebP, max 1200px).

Télécharge chaque page depuis le bucket public, optimise via Pillow, re-uploade
avec cache immutable, supprime l'ancien fichier si l'extension change (jpg → webp),
puis met à jour library.json.

Usage :
    cd scraper
    python3 recompress_supabase.py --dry-run
    python3 recompress_supabase.py
    python3 recompress_supabase.py --publisher dc
    python3 recompress_supabase.py --comic dc-batman-chronicle1988-volume-1
    python3 recompress_supabase.py --limit 1
    python3 recompress_supabase.py --resume
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path
from urllib.parse import quote

import curl_cffi

from sushiscan import (
    Supabase,
    _content_type,
    _optimize_page,
    _upload_bytes,
    _verify_ssl,
)

ROOT = Path(__file__).parent.parent / "mon-app"
LIBRARY = ROOT / "data" / "library.json"
STATE_FILE = Path(__file__).parent / ".recompress_state.json"

DOWNLOAD_CONCURRENCY = 8
UPLOAD_CONCURRENCY = 4


def _load_state() -> set[str]:
    if not STATE_FILE.exists():
        return set()
    data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    return set(data.get("completed", []))


def _save_state(completed: set[str]) -> None:
    STATE_FILE.write_text(
        json.dumps({"completed": sorted(completed)}, indent=2) + "\n",
        encoding="utf-8",
    )


def _iter_comics(
    data: dict,
    *,
    publisher_id: str | None,
    comic_id: str | None,
) -> list[tuple[dict, dict, dict]]:
    """Retourne (character, comic, data) pour chaque comic éligible."""
    items: list[tuple[dict, dict, dict]] = []
    for char in data["characters"]:
        if publisher_id and char.get("publisherId") != publisher_id:
            continue
        for comic in char.get("comics", []):
            if comic_id and comic.get("id") != comic_id:
                continue
            if not comic.get("storagePath") or not comic.get("pageCount"):
                continue
            items.append((char, comic, data))
    return items


async def _download_page(
    session: curl_cffi.AsyncSession,
    supa: Supabase,
    storage_path: str,
    page_num: int,
    ext: str,
) -> tuple[int, bytes | None, str]:
    old_name = f"{page_num:04d}.{ext}"
    candidates = [old_name]
    if ext != "webp":
        candidates.append(f"{page_num:04d}.webp")

    for name in candidates:
        key = f"{storage_path}/{name}"
        url = supa.public_url(key)
        try:
            resp = await session.get(url)
            if resp.status_code == 404:
                continue
            resp.raise_for_status()
            return page_num, resp.content, name
        except Exception as exc:
            print(f"  DL ERREUR {name} – {exc}")
            return page_num, None, old_name

    print(f"  DL ERREUR page {page_num:04d} – introuvable")
    return page_num, None, old_name


async def _delete_object(
    session: curl_cffi.AsyncSession,
    supa: Supabase,
    key: str,
) -> None:
    encoded = "/".join(quote(part) for part in key.split("/"))
    resp = await session.delete(
        f"{supa.url}/storage/v1/object/{supa.bucket}/{encoded}"
    )
    if resp.status_code not in (200, 204, 404):
        resp.raise_for_status()


async def _recompress_comic(
    dl_session: curl_cffi.AsyncSession,
    up_session: curl_cffi.AsyncSession,
    supa: Supabase,
    comic: dict,
) -> bool:
    storage_path = comic["storagePath"]
    page_count = int(comic["pageCount"])
    old_ext = comic.get("pageExtension", "jpg")

    print(f"  {page_count} pages · ext={old_ext} · {storage_path}")

    dl_sem = asyncio.Semaphore(DOWNLOAD_CONCURRENCY)
    up_sem = asyncio.Semaphore(UPLOAD_CONCURRENCY)

    async def fetch(page_num: int) -> tuple[int, bytes | None, str]:
        async with dl_sem:
            return await _download_page(
                dl_session, supa, storage_path, page_num, old_ext
            )

    downloaded = await asyncio.gather(
        *[fetch(i) for i in range(1, page_count + 1)]
    )

    if any(data is None for _, data, _ in downloaded):
        ok = sum(1 for _, data, _ in downloaded if data is not None)
        print(f"  ⚠ {ok}/{page_count} pages téléchargées – comic ignoré")
        return False

    uploads: list[tuple[str, bytes, str, str]] = []
    for page_num, data, source_name in sorted(downloaded):
        assert data is not None
        optimized, new_name = _optimize_page(data, source_name)
        new_key = f"{storage_path}/{new_name}"
        uploads.append((new_key, optimized, source_name, new_name))

    async def upload(new_key: str, data: bytes, source_name: str, new_name: str) -> None:
        async with up_sem:
            await _upload_bytes(
                up_session,
                supa,
                new_key,
                data,
                _content_type(new_name),
            )
            if source_name != new_name:
                old_key = f"{storage_path}/{source_name}"
                await _delete_object(up_session, supa, old_key)

    await asyncio.gather(
        *[upload(key, blob, src, name) for key, blob, src, name in uploads]
    )

    cover_key = f"{storage_path}/0001.webp"
    comic["pageExtension"] = "webp"
    comic["cover"] = supa.public_url(cover_key)
    print(f"  ✓ {page_count}/{page_count} pages recompressées")
    return True


async def run(args: argparse.Namespace) -> int:
    if not LIBRARY.exists():
        print(f"library.json introuvable : {LIBRARY}", file=sys.stderr)
        return 1

    data = json.loads(LIBRARY.read_text(encoding="utf-8"))
    comics = _iter_comics(
        data, publisher_id=args.publisher, comic_id=args.comic
    )

    if args.limit:
        comics = comics[: args.limit]

    completed = _load_state() if args.resume else set()
    if args.resume:
        comics = [(c, m, d) for c, m, d in comics if m["id"] not in completed]

    if not comics:
        print("Aucun comic à traiter.")
        return 0

    total_pages = sum(int(m["pageCount"]) for _, m, _ in comics)
    print(f"{len(comics)} comic(s) · {total_pages} pages au total\n")

    if args.dry_run:
        for index, (char, comic, _) in enumerate(comics, 1):
            print(
                f"[{index}/{len(comics)}] {char.get('name', '?')} · {comic['title']}"
            )
            print(
                f"  {comic['pageCount']} pages · ext={comic.get('pageExtension', '?')} "
                f"· {comic['storagePath']}"
            )
            print()
        print("Dry-run terminé – aucune modification.")
        return 0

    supa = Supabase.from_env()
    dl_session = curl_cffi.AsyncSession(impersonate="chrome", verify=_verify_ssl())
    up_session = supa.make_session()
    library_changed = False
    errors = 0

    try:
        for index, (char, comic, _) in enumerate(comics, 1):
            label = f"[{index}/{len(comics)}] {char.get('name', '?')} · {comic['title']}"
            print(label)

            ok = await _recompress_comic(dl_session, up_session, supa, comic)
            if not ok:
                errors += 1
                continue

            if not args.dry_run:
                library_changed = True
                if args.resume:
                    completed.add(comic["id"])
                    _save_state(completed)

            print()

        if library_changed and not args.dry_run:
            LIBRARY.write_text(
                json.dumps(data, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            print("✓ library.json mis à jour (pageExtension=webp, covers)")
    finally:
        for session in (dl_session, up_session):
            res = session.close()
            if asyncio.iscoroutine(res):
                await res

    if errors:
        print(f"\n⚠ {errors} comic(s) en échec")
        return 1

    print("\n✓ Recompression terminée")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Recompresse les pages comics Supabase existantes (WebP, 1200px)."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Affiche le plan sans télécharger / uploader",
    )
    parser.add_argument(
        "--publisher",
        metavar="ID",
        help="Limiter à un éditeur (ex. dc, invincible)",
    )
    parser.add_argument(
        "--comic",
        metavar="ID",
        dest="comic",
        help="Limiter à un comic (id dans library.json)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        metavar="N",
        help="Traiter au maximum N comics (tests)",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Reprendre en ignorant les comics déjà traités (.recompress_state.json)",
    )
    args = parser.parse_args()
    raise SystemExit(asyncio.run(run(args)))


if __name__ == "__main__":
    main()
