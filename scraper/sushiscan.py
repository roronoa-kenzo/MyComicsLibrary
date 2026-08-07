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
import os
import re
import sys
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlparse, quote

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

    # Persiste la session pour que le proxy Next.js puisse la réutiliser
    session_file = Path(__file__).parent.parent / "mon-app" / "data" / "cf_session.json"
    session_file.parent.mkdir(parents=True, exist_ok=True)
    session_file.write_text(
        json.dumps({"cookie": cookie_str, "userAgent": ua or DEFAULT_UA}, indent=2)
    )

    return cookie_str, ua or DEFAULT_UA


# ---------------------------------------------------------------------------
# Network helpers (curl_cffi imite Chrome au niveau TLS)
# ---------------------------------------------------------------------------

def _verify_ssl() -> bool:
    """Vérification TLS, désactivable via SCRAPER_VERIFY_SSL=false.
    Utile derrière un proxy/antivirus qui resigne les certificats (self-signed)."""
    load_env()
    return os.environ.get("SCRAPER_VERIFY_SSL", "true").strip().lower() not in ("0", "false", "no")


def _make_session(cookie: str, user_agent: str) -> curl_cffi.Session:
    session = curl_cffi.Session(impersonate="chrome", verify=_verify_ssl())
    session.headers.update({
        "referer": "https://sushiscan.net/",
        "user-agent": user_agent,
        "cookie": cookie,
    })
    return session


def _make_async_session(cookie: str, user_agent: str) -> curl_cffi.AsyncSession:
    session = curl_cffi.AsyncSession(impersonate="chrome", verify=_verify_ssl())
    session.headers.update({
        "referer": "https://sushiscan.net/",
        "user-agent": user_agent,
        "cookie": cookie,
    })
    return session


# ---------------------------------------------------------------------------
# Supabase Storage
# ---------------------------------------------------------------------------

def load_env() -> None:
    """Charge scraper/.env dans os.environ (parser minimal, sans dépendance)."""
    env_file = Path(__file__).parent / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


@dataclass
class Supabase:
    url: str
    key: str
    bucket: str

    @classmethod
    def from_env(cls) -> "Supabase":
        load_env()
        url = os.environ.get("SUPABASE_URL", "").rstrip("/")
        key = os.environ.get("SUPABASE_SERVICE_KEY", "")
        bucket = os.environ.get("SUPABASE_BUCKET", "")
        if not url or not key or not bucket:
            raise RuntimeError(
                "Configuration Supabase manquante. Renseigne SUPABASE_URL, "
                "SUPABASE_SERVICE_KEY et SUPABASE_BUCKET dans scraper/.env"
            )
        return cls(url=url, key=key, bucket=bucket)

    def public_url(self, key: str) -> str:
        encoded = "/".join(quote(part) for part in key.split("/"))
        return f"{self.url}/storage/v1/object/public/{self.bucket}/{encoded}"

    def make_session(self) -> curl_cffi.AsyncSession:
        kwargs: dict = {"verify": _verify_ssl()}
        try:
            from curl_cffi import CurlHttpVersion
            kwargs["http_version"] = CurlHttpVersion.V1_1  # plus stable via proxy
        except Exception:
            pass
        session = curl_cffi.AsyncSession(**kwargs)
        session.headers.update({"authorization": f"Bearer {self.key}"})
        return session


def _content_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower()
    return {
        "webp": "image/webp",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "gif": "image/gif",
    }.get(ext, "application/octet-stream")


async def _upload_bytes(
    up_session: curl_cffi.AsyncSession,
    supa: Supabase,
    key: str,
    data: bytes,
    content_type: str,
) -> None:
    encoded = "/".join(quote(part) for part in key.split("/"))
    resp = await up_session.post(
        f"{supa.url}/storage/v1/object/{supa.bucket}/{encoded}",
        data=data,
        headers={
            "content-type": content_type,
            "x-upsert": "true",
            "cache-control": "public, max-age=31536000, immutable",
        },
    )
    resp.raise_for_status()


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

# Seuil sous lequel une page est considérée comme un placeholder « image expirée »
PLACEHOLDER_MAX_BYTES = 30_000


class ExpiredCookieError(RuntimeError):
    pass


async def _download_all(
    dl_session: curl_cffi.AsyncSession,
    pages: list[Page],
) -> list[bytes | None]:
    """Télécharge toutes les pages en mémoire. None pour les échecs."""
    sem = asyncio.Semaphore(8)
    total = len(pages)

    async def one(index: int, page: Page) -> bytes | None:
        async with sem:
            try:
                resp = await dl_session.get(page.url)
                resp.raise_for_status()
                print(f"  [{index}/{total}] {page.filename}")
                return resp.content
            except Exception as exc:
                print(f"  [{index}/{total}] ERREUR – {exc}")
                return None

    return await asyncio.gather(*[one(i + 1, p) for i, p in enumerate(pages)])


def _looks_expired(blobs: list[bytes | None]) -> bool:
    """Détecte le placeholder Cloudflare : pages quasi-identiques et petites."""
    sizes = [len(b) for b in blobs if b]
    if not sizes:
        return True
    from collections import Counter

    size, count = Counter(sizes).most_common(1)[0]
    n = len(sizes)
    # Des images réelles n'ont quasiment jamais une taille identique en octets.
    if count >= max(3, int(0.9 * n)):
        return True
    return count >= max(3, int(0.6 * n)) and size <= PLACEHOLDER_MAX_BYTES


UPLOAD_CONCURRENCY = 4
UPLOAD_RETRIES = 4
MAX_PAGE_WIDTH = 1200
WEBP_QUALITY = 80


def _optimize_page(data: bytes, filename: str) -> tuple[bytes, str]:
    """Redimensionne et convertit en WebP pour réduire l'egress Supabase."""
    try:
        import io

        from PIL import Image
    except ImportError:
        return data, filename

    try:
        img = Image.open(io.BytesIO(data))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        elif img.mode != "RGB":
            img = img.convert("RGB")

        width, height = img.size
        if width > MAX_PAGE_WIDTH:
            height = round(height * MAX_PAGE_WIDTH / width)
            img = img.resize((MAX_PAGE_WIDTH, height), Image.Resampling.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="WEBP", quality=WEBP_QUALITY, method=4)
        stem = filename.rsplit(".", 1)[0]
        return buf.getvalue(), f"{stem}.webp"
    except Exception as exc:
        print(f"  optimise SKIP {filename} – {exc}")
        return data, filename


def _prepare_upload_pages(
    pages: list[Page],
    blobs: list[bytes | None],
) -> tuple[list[Page], list[bytes | None]]:
    out_pages: list[Page] = []
    out_blobs: list[bytes | None] = []
    for page, blob in zip(pages, blobs):
        if blob is None:
            out_pages.append(page)
            out_blobs.append(None)
            continue
        data, filename = _optimize_page(blob, page.filename)
        out_pages.append(Page(url=page.url, filename=filename))
        out_blobs.append(data)
    return out_pages, out_blobs


async def _upload_all(
    supa: Supabase,
    pages: list[Page],
    blobs: list[bytes | None],
    storage_prefix: str,
) -> int:
    """Envoie les pages téléchargées sur Supabase (concurrence limitée + retries)."""
    sem = asyncio.Semaphore(UPLOAD_CONCURRENCY)
    up_session = supa.make_session()

    async def one(page: Page, data: bytes | None) -> bool:
        if data is None:
            return False
        async with sem:
            for attempt in range(UPLOAD_RETRIES):
                try:
                    await _upload_bytes(
                        up_session, supa, f"{storage_prefix}/{page.filename}",
                        data, _content_type(page.filename),
                    )
                    return True
                except Exception as exc:
                    if attempt == UPLOAD_RETRIES - 1:
                        print(f"  upload ERREUR {page.filename} – {exc}")
                        return False
                    await asyncio.sleep(1.0 * (attempt + 1))
            return False

    try:
        results = await asyncio.gather(*[one(p, b) for p, b in zip(pages, blobs)])
    finally:
        res = up_session.close()
        if asyncio.iscoroutine(res):
            await res
    return sum(results)


async def upload_chapter_to_supabase(
    dl_session: curl_cffi.AsyncSession,
    supa: Supabase,
    chapter: Chapter,
    storage_prefix: str,
) -> str | None:
    """Télécharge + valide + envoie un chapitre sur Supabase. Retourne l'URL publique de la 1ʳᵉ page."""
    if not chapter.pages:
        return None

    blobs = await _download_all(dl_session, chapter.pages)
    if _looks_expired(blobs):
        raise ExpiredCookieError(
            "Pages identiques/trop petites → cookie Cloudflare expiré. "
            "Rafraîchis-le (relance un scrape ou --cookie cf_clearance=...) puis réessaie."
        )

    pages, blobs = _prepare_upload_pages(chapter.pages, blobs)
    chapter.pages = pages
    ok = await _upload_all(supa, chapter.pages, blobs, storage_prefix)
    print(f"  ✓ {ok}/{len(chapter.pages)} pages → {supa.bucket}/{storage_prefix}")
    return supa.public_url(f"{storage_prefix}/{chapter.pages[0].filename}")


def _char_id_from_path(char_path: str) -> str:
    """Extrait l'ID personnage/équipe/event depuis le chemin Supabase."""
    parts = char_path.split("/")
    if len(parts) >= 3 and parts[1] in ("teams", "events"):
        return parts[2]
    if len(parts) > 1:
        return parts[1]
    return parts[0] if parts else ""


def _sync_library(
    storage_path: str,
    cover_url: str,
    page_count: int,
    page_extension: str,
    manga_title: str,
    chapter_title: str,
    char_id: str,
    publisher_id: str,
    library_path: Path,
    *,
    is_team: bool = False,
    is_event: bool = False,
) -> None:
    """Crée ou met à jour le personnage/équipe/event et le comic dans library.json."""
    if library_path.exists():
        data = json.loads(library_path.read_text(encoding="utf-8"))
    else:
        data = {
            "lastScraped": {"publisherId": publisher_id, "characterId": char_id, "comicId": ""},
            "publishers": [],
            "characters": [],
        }

    # ── Personnage ──────────────────────────────────────────────────────────
    char_entry: dict | None = next(
        (c for c in data["characters"] if c["id"] == char_id), None
    )
    if char_entry is None:
        char_entry = {
            "id": char_id,
            "publisherId": publisher_id,
            "name": char_id.capitalize(),
            "realName": "TODO",
            "image": cover_url,
            "comics": [],
        }
        data["characters"].append(char_entry)
        if is_team:
            label = "équipe"
        elif is_event:
            label = "event"
        else:
            label = "personnage"
        print(f"  ✓ Nouvelle {label} : {char_id}  (pense à renseigner name/realName)")

    if is_team:
        char_entry["isTeam"] = True
    if is_event:
        char_entry["isEvent"] = True

    # ── Comic ────────────────────────────────────────────────────────────────
    comic_id = re.sub(r"[/ ]+", "-", storage_path).lower().strip("-")
    comic_entry: dict | None = next(
        (c for c in char_entry["comics"] if c.get("storagePath") == storage_path),
        None,
    )

    if comic_entry is None:
        comic_entry = {
            "id": comic_id,
            "title": f"{manga_title} – {chapter_title}",
            "cover": cover_url,
            "year": 0,
            "order": 0,
            "description": "TODO",
            "storagePath": storage_path,
            "pageCount": page_count,
            "pageExtension": page_extension,
        }
        char_entry["comics"].append(comic_entry)
        print(f"  ✓ Nouveau comic : {comic_id}  (pense à renseigner year/order/description)")
    else:
        comic_entry["cover"] = cover_url
        comic_entry["pageCount"] = page_count
        comic_entry["pageExtension"] = page_extension
        print(f"  ✓ Comic mis à jour : {comic_entry['id']}")

    data["lastScraped"] = {
        "publisherId": char_entry["publisherId"],
        "characterId": char_id,
        "comicId": comic_entry["id"],
    }

    library_path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"  ✓ library.json synchronisé")


async def run(
    url: str,
    output_dir: Path,
    volumes: str,
    save_as: str,
    cookie: str | None,
    user_agent: str | None,
    urls_only: bool = False,
    pages_dir: Path | None = None,
    char_path: str = "",
    publisher_id: str = "dc",
    is_team: bool = False,
    is_event: bool = False,
) -> None:
    # ── Valider la config Supabase avant tout (échec rapide) ────────────────
    supa = Supabase.from_env() if urls_only else None

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

            if urls_only:
                assert supa is not None
                storage_path = f"{char_path}/{safe_ch}" if char_path else safe_ch
                char_id = _char_id_from_path(char_path)
                cover_url = await upload_chapter_to_supabase(
                    async_session, supa, chapter, storage_path
                )
                page_ext = chapter.pages[0].filename.rsplit(".", 1)[-1]
                if cover_url and char_id:
                    library_path = Path(__file__).parent.parent / "mon-app" / "data" / "library.json"
                    _sync_library(
                        storage_path=storage_path,
                        cover_url=cover_url,
                        page_count=len(chapter.pages),
                        page_extension=page_ext,
                        manga_title=manga.title,
                        chapter_title=chapter.title,
                        char_id=char_id,
                        publisher_id=publisher_id,
                        library_path=library_path,
                        is_team=is_team,
                        is_event=is_event,
                    )
                continue

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
    parser.add_argument(
        "--urls-only",
        action="store_true",
        help="Télécharge les pages et les envoie sur Supabase Storage, puis synchronise library.json",
    )
    parser.add_argument(
        "--pages-dir",
        default="../mon-app/data/pages",
        help=argparse.SUPPRESS,
    )
    parser.add_argument(
        "--character",
        nargs="+",
        metavar="NAME",
        help=(
            "Personnage : organise les comics sous <publisher>/<name>/…\n"
            "Ex: --character greenlantern  →  dc/greenlantern/<volume>\n"
            "    --character greenlantern geoffjohns  →  dc/greenlantern/geoffjohns/<volume>"
        ),
    )
    parser.add_argument(
        "--team",
        nargs="+",
        metavar="NAME",
        help=(
            "Équipe : organise les comics sous <publisher>/teams/<name>/…\n"
            "Ex: --team justiceleague  →  dc/teams/justiceleague/<volume>"
        ),
    )
    parser.add_argument(
        "--event",
        nargs="+",
        metavar="NAME",
        help=(
            "Event : organise les comics sous <publisher>/events/<name>/…\n"
            "Ex: --event crisisoninfiniteearths  →  dc/events/crisisoninfiniteearths/<volume>"
        ),
    )
    parser.add_argument(
        "--publisher",
        default="dc",
        help="ID de l'éditeur dans library.json (défaut : dc)",
    )
    args = parser.parse_args()

    targets = sum(bool(x) for x in (args.character, args.team, args.event))
    if targets > 1:
        parser.error("Utilise un seul parmi --character, --team ou --event.")
    if args.urls_only and targets == 0:
        parser.error(
            "--character, --team ou --event est requis avec --urls-only.\n"
            "Ex: --character greenlantern  |  --team justiceleague  |  --event crisisoninfiniteearths"
        )

    output_dir = Path(args.output).expanduser().resolve()
    pages_dir = Path(args.pages_dir).expanduser().resolve()
    is_team = bool(args.team)
    is_event = bool(args.event)
    name_parts = [_safe(p.lower()) for p in (args.event or args.team or args.character or [])]
    if is_team:
        path_parts = ["teams"] + name_parts
    elif is_event:
        path_parts = ["events"] + name_parts
    else:
        path_parts = name_parts
    char_path = "/".join([args.publisher] + path_parts) if path_parts else ""

    try:
        asyncio.run(run(
            url=args.url,
            output_dir=output_dir,
            volumes=args.volumes,
            save_as=args.save_as,
            cookie=args.cookie,
            user_agent=args.user_agent,
            urls_only=args.urls_only,
            pages_dir=pages_dir if args.urls_only else None,
            char_path=char_path,
            publisher_id=args.publisher,
            is_team=is_team,
            is_event=is_event,
        ))
    except KeyboardInterrupt:
        print("\nAnnulé.")
        sys.exit(0)
    except Exception as exc:
        print(f"\nErreur : {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
