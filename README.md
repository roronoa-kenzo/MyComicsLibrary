# KenzoLibrary

Bibliothèque de comics personnelle — DC & Marvel.  
Scrape, stocke et lit des comics depuis [sushiscan.net](https://sushiscan.net).

---

## Prérequis

- **Python 3.10+**
- **Node.js 18+** et **pnpm**

```bash
# Dépendances Python
pip install nodriver curl_cffi beautifulsoup4 httpx

# Navigateur headless pour le bypass Cloudflare
python -m playwright install chromium

# Dépendances Node
cd mon-app && pnpm install
```

---

## Scraper

Situé dans `scraper/sushiscan.py`. **Toujours lancer depuis le dossier `scraper/`.**

### Récupérer les URLs d'un comic (recommandé)

```bash
cd scraper

# Un seul personnage
python3 sushiscan.py https://sushiscan.net/catalogue/green-lantern/ \
  --urls-only --character greenlantern --volumes 1

# Avec un nom de série en plus (crée pages/greenlantern/geoffjohns/)
python3 sushiscan.py https://sushiscan.net/catalogue/geoff-johns-presente-green-lantern/ \
  --urls-only --character greenlantern geoffjohns --volumes 1-7

# Volume direct (une seule page catalogue)
python3 sushiscan.py https://sushiscan.net/green-lantern-emerald-twilight-volume-1/ \
  --urls-only --character greenlantern
```

`--character` est **obligatoire** avec `--urls-only`. Il accepte 1 ou 2 noms :

| Commande | Fichiers créés |
|---|---|
| `--character greenlantern` | `data/pages/greenlantern/<volume>.json` |
| `--character greenlantern geoffjohns` | `data/pages/greenlantern/geoffjohns/<volume>.json` |

La cover et `lastScraped` dans `library.json` sont mis à jour automatiquement.

> Le cookie Cloudflare expire (quelques jours). Relancer le scraper le rafraîchit.

### Télécharger les images (stockage local)

```bash
python3 sushiscan.py https://sushiscan.net/catalogue/mon-manga/ --volumes 1-3
```

Les images arrivent dans `mon-app/public/comics/<titre>/<volume>/`.

### Toutes les options

| Option | Défaut | Description |
|--------|--------|-------------|
| `--character NAME [NAME]` | — | **Requis** avec `--urls-only`. 1 ou 2 noms de dossier |
| `--publisher ID` | `dc` | ID de l'éditeur dans `library.json` |
| `--volumes` | `all` | Sélection : `all`, `1`, `1-3`, `1,3,5` |
| `--urls-only` | — | Sauvegarde les URLs JSON sans télécharger |
| `--save-as` | `raw` | Format local : `raw`, `cbz`, `pdf` |
| `--cookie` | — | Cookie Cloudflare manuel (`cf_clearance=...`) |

---

## App Web

```bash
cd mon-app
pnpm dev        # http://localhost:3000
pnpm build      # Build de production
pnpm start      # Serveur de production
```

---

## Ajouter un comic dans la bibliothèque

### 1. Scraper les URLs

```bash
cd scraper
python3 sushiscan.py <url> --urls-only --character <perso> [<serie>] --publisher <dc|marvel> --volumes <selection>
```

Le scraper **crée automatiquement** dans `library.json` :
- Le personnage s'il n'existe pas encore
- Une entrée comic par volume avec `title`, `cover`, `pagesFile` pré-remplis

### 2. Compléter dans `library.json`

Seuls ces 3 champs restent à renseigner à la main :

```json
{
  "year": 2005,
  "order": 1,
  "description": "..."
}
```

Et si le personnage est nouveau, ses infos d'affichage :

```json
{
  "name": "Green Lantern",
  "realName": "Hal Jordan"
}
```

### Ajouter un personnage

```json
{
  "id": "batman",
  "publisherId": "dc",
  "name": "Batman",
  "realName": "Bruce Wayne",
  "image": "/api/img?url=...",
  "comics": []
}
```

### Ajouter un éditeur

```json
{
  "id": "image",
  "name": "Image Comics",
  "tagline": "Fondé par des créateurs pour des créateurs",
  "gradientFrom": "#e85d04",
  "gradientTo": "#370617"
}
```

---

## Structure du projet

```
KenzoLibrary/
├── scraper/
│   └── sushiscan.py          # Scraper CLI
└── mon-app/
    ├── data/
    │   ├── library.json       # Source de vérité (éditeurs, persos, comics)
    │   ├── pages/             # URLs JSON par comic (mode sans images)
    │   └── cf_session.json    # Session Cloudflare (générée par le scraper)
    ├── public/
    │   └── comics/            # Images téléchargées (mode local)
    ├── app/
    │   ├── page.tsx           # Accueil
    │   ├── [publisher]/       # Page éditeur (DC, Marvel...)
    │   │   └── [character]/   # Page personnage
    │   │       └── [comic]/   # Lecteur
    │   └── api/img/           # Proxy images (mode URLs)
    ├── components/
    │   ├── Navbar.tsx
    │   ├── CharacterCarousel.tsx
    │   └── ComicReader.tsx
    └── lib/
        └── library.ts         # Types et helpers
```
