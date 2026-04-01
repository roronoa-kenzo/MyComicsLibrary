#!/usr/bin/env python3
"""
Sushiscan scraper – télécharge les pages d'un comic depuis sushiscan.net.

Usage:
    python3 sushiscan.py <url> [options]

Exemples:
    # Volume direct (auto-détection du cf_clearance via Chrome headless)
    python3 sushiscan.py https://sushiscan.net/green-lantern-emerald-twilight-volume-1/

    # Page catalogue avec sélection de volumes
    python3 sushiscan.py https://sushiscan.net/catalogue/green-lantern/ --volumes 1-3

    # Fournir son propre cookie (récupéré dans les DevTools du navigateur)
    python3 sushiscan.py <url> --cookie "cf_clearance=xxxx..."

    # Exporter en CBZ ou PDF
    python3 sushiscan.py <url> --save-as cbz
    python3 sushiscan.py <url> --save-as pdf
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlparse

import curl_cffi
from bs4 import BeautifulSoup


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

@dataclass
class Page:
    url: str
    filename: str


@dataclass
class Chapter:
    id: str
    url: str
    title: str
    pages: list[Page] = field(default_factory=list)


@dataclass
class Manga:
    title: str
    url: str
    chapters: list[Chapter] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Cloudflare bypass – obtenir le cookie cf_clearance via Chrome headless
# ---------------------------------------------------------------------------

DEFAULT_UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36"
)


async def _get_cf_clearance(url: str) -> tuple[str, str]:
    """
    Lance un Chrome headless (nodriver) pour passer le challenge Cloudflare
    et récupère le cookie cf_clearance (HttpOnly) via CDP +
    le User-Agent réel du navigateur.
    """
    try:
        import nodriver as uc
    except ImportError:
        raise RuntimeError(
            "nodriver est requis pour le bypass automatique Cloudflare.\n"
            "Installe-le avec : pip install nodriver\n"
            "Ou fournis ton cookie manuellement avec --cookie cf_clearance=..."
        )

    print("  Bypass Cloudflare via Chrome headless (patientez ~15s)...")
    browser = await uc.start()
    try:
        page = await browser.get(url)
        await asyncio.sleep(15)

        # Lire tous les cookies via CDP (y compris les HttpOnly)
        all_cookies = await page.send(uc.cdp.network.get_all_cookies())
        ua: str = await page.evaluate("navigator.userAgent")
    finally:
        browser.stop()

    cf_cookie = next(
        (c for c in (all_cookies or []) if c.name == "cf_clearance"),
        None,
    )

    if cf_cookie is None:
        raise RuntimeError(
            "Impossible de récupérer cf_clearance. "
            "Le challenge Cloudflare n'a pas été résolu.\n"
            "Essaie de fournir le cookie manuellement : --cookie cf_clearance=..."
        )

    cookie_str = f"cf_clearance={cf_cookie.value}"
    print("  cf_clearance obtenu.")
    return cookie_str, ua or DEFAULT_UA


# ---------------------------------------------------------------------------
# Network helpers (curl_cffi imite Chrome au niveau TLS)
# ---------------------------------------------------------------------------

def _make_session(cookie: str, user_agent: str) -> curl_cffi.Session:
    session = curl_cffi.Session(impersonate="chrome")
    session.headers.update({
        "referer": "https://sushiscan.net/",
        "user-agent": user_agent,
        "cookie": cookie,
    })
    return session


def _make_async_session(cookie: str, user_agent: str) -> curl_cffi.AsyncSession:
    session = curl_cffi.AsyncSession(impersonate="chrome")
    session.headers.update({
        "referer": "https://sushiscan.net/",
        "user-agent": user_agent,
        "cookie": cookie,
    })
    return session


# ---------------------------------------------------------------------------
# Scraper
# ---------------------------------------------------------------------------

def _slug_from_url(url: str) -> str:
    path = urlparse(url).path.strip("/")
    return path.split("/")[-1] if path else "comic"


def get_manga(session: curl_cffi.Session, url: str) -> Manga:
    resp = session.get(url)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    title_tag = soup.find("h1", class_="entry-title")
    title = title_tag.text.strip() if title_tag else _slug_from_url(url)

    manga = Manga(title=title, url=url)

    chapter_list = soup.find("div", id="chapterlist")
    if chapter_list:
        for li in chapter_list.find_all("li"):
            data_num = li.get("data-num")
            link = li.find("a")
            if data_num and link:
                num_span = li.find("span", class_="chapternum")
                chapter_title = (
                    num_span.text.strip() if num_span else f"Volume {data_num}"
                )
                manga.chapters.append(
                    Chapter(id=data_num, url=link["href"], title=chapter_title)
                )
    else:
        # URL directe vers un chapitre — traité comme manga à 1 seul volume
        manga.chapters.append(
            Chapter(id="1", url=url, title=_slug_from_url(url))
        )

    return manga


def get_chapter_pages(session: curl_cffi.Session, chapter: Chapter) -> None:
    resp = session.get(chapter.url)
    resp.raise_for_status()

    match = re.search(r'"images"\s*:\s*(\[.*?\])', resp.text)
    if not match:
        raise RuntimeError(
            f"Impossible de trouver les images dans {chapter.url}.\n"
            "La structure de la page a changé ou le cookie est expiré."
        )

    image_urls: list[str] = json.loads(match.group(1).replace("\\/", "/"))
    chapter.pages = [
        Page(
            url=img_url,
            filename=f"{idx + 1:04d}.{img_url.rsplit('.', 1)[-1]}",
        )
        for idx, img_url in enumerate(image_urls)
    ]


# ---------------------------------------------------------------------------
# Downloader
# ---------------------------------------------------------------------------

async def _download_page(
    session: curl_cffi.AsyncSession,
    page: Page,
    dest: Path,
    sem: asyncio.Semaphore,
    index: int,
    total: int,
) -> None:
    filepath = dest / page.filename
    if filepath.exists():
        return
    async with sem:
        try:
            resp = await session.get(page.url)
            resp.raise_for_status()
            filepath.write_bytes(resp.content)
            print(f"  [{index}/{total}] {page.filename}")
        except Exception as exc:
            print(f"  [{index}/{total}] ERREUR – {exc}")


async def download_pages(
    async_session: curl_cffi.AsyncSession,
    pages: list[Page],
    dest: Path,
) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(8)
    total = len(pages)
    tasks = [
        _download_page(async_session, p, dest, sem, idx + 1, total)
        for idx, p in enumerate(pages)
    ]
    await asyncio.gather(*tasks)


# ---------------------------------------------------------------------------
# Export helpers
# ---------------------------------------------------------------------------

def export_cbz(image_paths: list[Path], out_file: Path) -> None:
    with zipfile.ZipFile(out_file, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in sorted(image_paths):
            zf.write(p, p.name)


def export_pdf(image_paths: list[Path], out_file: Path) -> None:
    try:
        from PIL import Image
    except ImportError:
        raise RuntimeError("Pillow requis pour le PDF : pip install Pillow")

    imgs = [Image.open(p).convert("RGB") for p in sorted(image_paths)]
    if not imgs:
        return
    imgs[0].save(out_file, save_all=True, append_images=imgs[1:])


# ---------------------------------------------------------------------------
# Selection parser
# ---------------------------------------------------------------------------

def _trailing_num(s: str) -> int | None:
    """Extrait le dernier entier d'une chaîne. Ex: 'Volume 3' → 3, '2.0' → 2."""
    m = re.search(r"(\d+)\s*(?:\.\d+)?\s*$", s)
    return int(m.group(1)) if m else None


def _parse_selection(selection: str, available: list[str]) -> list[str]:
    if selection.strip().lower() == "all":
        return available

    # Correspondance directe par chaîne
    if selection.strip() in available:
        return [selection.strip()]

    # Construire une table numéro → id original
    num_to_id: dict[int, str] = {}
    for a in available:
        n = _trailing_num(a)
        if n is not None and n not in num_to_id:
            num_to_id[n] = a

    selected_nums: set[int] = set()
    for part in selection.split(","):
        part = part.strip()
        if "-" in part:
            lo, hi = part.split("-", 1)
            selected_nums.update(range(int(lo), int(hi) + 1))
        else:
            try:
                selected_nums.add(int(part))
            except ValueError:
                pass

    # Conserver l'ordre de disponibilité
    return [a for a in available if _trailing_num(a) in selected_nums]


def _safe(name: str) -> str:
    return re.sub(r'[<>:"/\\|?*]', "_", name)


# ---------------------------------------------------------------------------
# Main flow
# ---------------------------------------------------------------------------

async def run(
    url: str,
    output_dir: Path,
    volumes: str,
    save_as: str,
    cookie: str | None,
    user_agent: str | None,
) -> None:
    # ── Obtenir le cookie cf_clearance ──────────────────────────────────────
    if not cookie:
        cookie, user_agent = await _get_cf_clearance(url)
    ua = user_agent or DEFAULT_UA

    session = _make_session(cookie, ua)
    async_session = _make_async_session(cookie, ua)

    try:
        print(f"\nRécupération de la page : {url}")
        manga = get_manga(session, url)
        print(f"Titre   : {manga.title}")
        print(f"Volumes : {len(manga.chapters)} trouvé(s)")

        if not manga.chapters:
            print("Aucun volume trouvé.")
            return

        available_ids = [ch.id for ch in manga.chapters]
        selected_ids = _parse_selection(volumes, available_ids)
        chapters = [ch for ch in manga.chapters if ch.id in selected_ids]
        print(f"Sélection : {len(chapters)}/{len(manga.chapters)} volume(s)\n")

        base_path = output_dir / _safe(manga.title)

        for chapter in chapters:
            print(f"⬇  {chapter.title}")
            get_chapter_pages(session, chapter)

            if not chapter.pages:
                print("  Aucune page trouvée, on passe.\n")
                continue

            print(f"  {len(chapter.pages)} pages")
            safe_ch = _safe(chapter.title)

            if save_as == "raw":
                dest = base_path / safe_ch
                await download_pages(async_session, chapter.pages, dest)
                print(f"  ✓ {dest}\n")

            elif save_as == "cbz":
                import tempfile
                with tempfile.TemporaryDirectory() as tmp:
                    tmp_path = Path(tmp)
                    await download_pages(async_session, chapter.pages, tmp_path)
                    base_path.mkdir(parents=True, exist_ok=True)
                    out = base_path / f"{safe_ch}.cbz"
                    export_cbz(list(tmp_path.iterdir()), out)
                    print(f"  ✓ CBZ : {out}\n")

            elif save_as == "pdf":
                import tempfile
                with tempfile.TemporaryDirectory() as tmp:
                    tmp_path = Path(tmp)
                    await download_pages(async_session, chapter.pages, tmp_path)
                    base_path.mkdir(parents=True, exist_ok=True)
                    out = base_path / f"{safe_ch}.pdf"
                    export_pdf(list(tmp_path.iterdir()), out)
                    print(f"  ✓ PDF : {out}\n")

    finally:
        res = async_session.close()
        if asyncio.iscoroutine(res):
            await res


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Télécharge un comic depuis sushiscan.net",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("url", help="URL du comic ou du catalogue")
    parser.add_argument(
        "-o", "--output",
        default="../mon-app/public/comics",
        help="Dossier de sortie (défaut : ../mon-app/public/comics)",
    )
    parser.add_argument(
        "--volumes",
        default="all",
        help="Volumes à télécharger : 'all', '1', '1-3', '1,3,5' (défaut : all)",
    )
    parser.add_argument(
        "--save-as",
        default="raw",
        choices=["raw", "cbz", "pdf"],
        help="Format de sortie (défaut : raw)",
    )
    parser.add_argument(
        "-c", "--cookie",
        help=(
            "Cookie Cloudflare (ex: cf_clearance=xxxx...). "
            "Si absent, récupéré automatiquement via Chrome headless."
        ),
    )
    parser.add_argument(
        "--user-agent",
        help="User-Agent (doit correspondre au navigateur du cookie si fourni)",
    )
    args = parser.parse_args()

    output_dir = Path(args.output).expanduser().resolve()

    try:
        asyncio.run(run(
            url=args.url,
            output_dir=output_dir,
            volumes=args.volumes,
            save_as=args.save_as,
            cookie=args.cookie,
            user_agent=args.user_agent,
        ))
    except KeyboardInterrupt:
        print("\nAnnulé.")
        sys.exit(0)
    except Exception as exc:
        print(f"\nErreur : {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
