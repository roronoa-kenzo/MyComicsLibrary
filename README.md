# KenzoLibrary

Bibliothèque de comics personnelle — DC & Marvel.  
Scrape des comics depuis [sushiscan.net](https://sushiscan.net), **stocke les pages dans Supabase Storage** et les lit en ligne.

---

## Configuration Supabase

Les pages sont stockées dans un **bucket Supabase public** (organisé `éditeur/personnage/run/volume/0001.webp`).

1. Créer un projet Supabase et un bucket **public** (ex. `comics`).
2. Remplir les fichiers `.env` (non committés) :

`scraper/.env` — pour uploader :

```bash
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=...        # Settings > API > service_role
SUPABASE_BUCKET=comics
```

`mon-app/.env.local` — pour afficher (bucket public, pas de clé) :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_BUCKET=comics
```

---

## Prérequis

- **Node.js 18+** et **pnpm** (app web)
- **Python 3.10+** pour le scraper. `nodriver` (bypass Cloudflare) ne fonctionne **pas** en Python 3.9.
- **Google Chrome** installé (utilisé pour le bypass Cloudflare).

Le plus simple si tu n'as pas de Python récent : créer un venv 3.12 isolé avec [`uv`](https://github.com/astral-sh/uv).

```bash
# 1. App web
cd mon-app && pnpm install && cd ..

# 2. Scraper : venv Python 3.12 + dépendances
pip install uv                      # ou: python3 -m pip install uv
cd scraper
uv venv .venv --python 3.12
uv pip install --python .venv curl_cffi beautifulsoup4 nodriver
```

> Le venv est dans `scraper/.venv` (gitignoré). Lance le scraper avec `./.venv/bin/python …`
> ou active-le une fois par session : `source .venv/bin/activate` (puis `python …`).

---

## Scraper

Situé dans `scraper/sushiscan.py`. **Toujours lancer depuis le dossier `scraper/`.**

### Scraper un comic vers Supabase (recommandé)

**Les commandes ne changent pas** : `--urls-only` télécharge désormais les pages et les **envoie sur Supabase Storage**, puis synchronise `library.json`.

```bash
cd scraper

# Un seul personnage
./.venv/bin/python sushiscan.py https://sushiscan.net/catalogue/green-lantern/ \
  --urls-only --character greenlantern --volumes 1

# Avec un nom de série en plus (chemin greenlantern/geoffjohns/)
./.venv/bin/python sushiscan.py https://sushiscan.net/catalogue/geoff-johns-presente-green-lantern/ \
  --urls-only --character greenlantern geoffjohns --volumes 1-7

# Volume direct (une seule page catalogue)
./.venv/bin/python sushiscan.py https://sushiscan.net/green-lantern-emerald-twilight-volume-1/ \
  --urls-only --character greenlantern
```

`--character` est **obligatoire** avec `--urls-only`. Il accepte 1 ou 2 noms :

| Commande | Chemin Supabase |
|---|---|
| `--character greenlantern` | `dc/greenlantern/<volume>/0001.webp…` |
| `--character greenlantern geoffjohns` | `dc/greenlantern/geoffjohns/<volume>/0001.webp…` |

La cover, `pageCount`, `pageExtension`, `storagePath` et `lastScraped` dans `library.json` sont remplis automatiquement.

> Le cookie Cloudflare expire (quelques jours). Le scraper le rafraîchit automatiquement
> (Chrome s'ouvre ~15 s) si besoin, ou fournis-le à la main avec `--cookie cf_clearance=...`.

### Migrer des comics déjà scrapés (ancien format)

Si d'anciens comics utilisent encore `data/pages/*.json`, les envoyer sur Supabase et réécrire `library.json` :

```bash
cd scraper
./.venv/bin/python migrate_to_supabase.py
```

### Télécharger les images (stockage local)

```bash
./.venv/bin/python sushiscan.py https://sushiscan.net/catalogue/mon-manga/ --volumes 1-3
```

Les images arrivent dans `mon-app/public/comics/<titre>/<volume>/`.

### Toutes les options

| Option | Défaut | Description |
|--------|--------|-------------|
| `--character NAME [NAME]` | — | **Requis** avec `--urls-only`. 1 ou 2 noms de dossier |
| `--publisher ID` | `dc` | ID de l'éditeur dans `library.json` |
| `--volumes` | `all` | Sélection : `all`, `1`, `1-3`, `1,3,5` |
| `--urls-only` | — | Télécharge les pages et les envoie sur Supabase Storage |
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

## Déploiement en production (Vercel)

L'app est dans le sous-dossier `mon-app`, et ne lit les images que via les **URLs publiques Supabase**. Aucun secret n'est nécessaire côté serveur.

### 1. Importer le repo sur Vercel

- **Root Directory** : `mon-app` (Project Settings → General).
- Framework détecté automatiquement : Next.js.

### 2. Variables d'environnement Vercel

Ajoute **uniquement** ces deux variables (Project Settings → Environment Variables) :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_BUCKET=comics
```

> ⚠️ Ne mets **jamais** `SUPABASE_SERVICE_KEY` sur Vercel. Elle ne sert qu'au scraper, en local.

### 3. Sécuriser le bucket Supabase

Le bucket `comics` est **public en lecture** (nécessaire pour afficher les images sans auth), mais l'**écriture doit être verrouillée** :

- Storage → bucket `comics` → **Public bucket** : activé (lecture seule pour tout le monde).
- **Policies** : ne crée **aucune** policy `INSERT` / `UPDATE` / `DELETE` pour les rôles `anon` ou `authenticated`.
  Seul le scraper (clé `service_role`, qui contourne les policies) doit pouvoir uploader.

Pour vérifier qu'un anonyme ne peut pas écrire (doit renvoyer une erreur 403/401) :

```bash
curl -X POST \
  "https://xxxx.supabase.co/storage/v1/object/comics/test.txt" \
  -H "Content-Type: text/plain" --data "hack"
# Attendu : "new row violates row-level security policy" ou 401/403
```

### 4. Checklist sécurité

- [x] `service_role` uniquement dans `scraper/.env` (gitignoré), jamais sur Vercel
- [x] App sans secret : seules des variables `NEXT_PUBLIC_*`
- [x] `.env`, `.env.local`, `cf_session.json` non versionnés
- [ ] Bucket Supabase : écriture refusée pour `anon` / `authenticated`
- [ ] Vercel : Root Directory = `mon-app` + les 2 variables `NEXT_PUBLIC_*`

---

## Tuto : ajouter un comic

Pré-requis : `scraper/.env` et `mon-app/.env.local` remplis (voir [Configuration Supabase](#configuration-supabase)) et le venv créé (voir [Prérequis](#prérequis)).

### 1. Trouver l'URL sur sushiscan

- **Série en plusieurs tomes** → l'URL du catalogue : `https://sushiscan.net/catalogue/<slug>/`
- **Tome unique** → l'URL directe du volume : `https://sushiscan.net/<slug-du-volume>/`

### 2. Lancer le scrape

Depuis `scraper/`, avec le venv :

```bash
cd scraper

./.venv/bin/python sushiscan.py <url> \
  --publisher <dc|marvel> \
  --character <perso> [<serie>] \
  --urls-only \
  --volumes <all | 1 | 1-3 | 1,3,5>
```

Exemple concret (Batman – Année Un, éditeur DC, perso batman, run « anneeun ») :

```bash
./.venv/bin/python sushiscan.py https://sushiscan.net/catalogue/batman-annee-un/ \
  --publisher dc --character batman anneeun --urls-only --volumes all
```

Le scraper :
1. Récupère la liste des pages, **les télécharge, et les envoie sur Supabase** sous
   `<publisher>/<perso>/[<run>/]<volume>/0001.webp…` (l'organisation ne change jamais).
2. **Valide** les images : si Cloudflare renvoie des placeholders (cookie expiré), il
   **rafraîchit le cookie tout seul** (Chrome s'ouvre ~15 s) puis réessaie.
3. **Met à jour `library.json`** : crée le personnage si besoin et une entrée comic par
   volume avec `title`, `cover`, `storagePath`, `pageCount`, `pageExtension` pré-remplis.

### 3. Compléter `library.json`

Ouvre `mon-app/data/library.json`. Pour **chaque comic** créé, renseigne les 3 champs laissés en `TODO` / à 0 :

```json
{
  "year": 1987,
  "order": 1,
  "description": "Résumé du comic…"
}
```

`order` = ordre de lecture sur la page du personnage (tri croissant ; les valeurs n'ont pas besoin d'être consécutives).

Si le **personnage** vient d'être créé, complète aussi son affichage :

```json
{
  "name": "Batman",
  "realName": "Bruce Wayne"
}
```

> L'`image` du personnage est pré-remplie avec la 1ʳᵉ page Supabase ; remplace-la par une vraie illustration si tu veux.

### 4. Vérifier

```bash
cd ../mon-app && pnpm dev   # http://localhost:3000
```

Navigue jusqu'au comic et vérifie que les pages s'affichent.

---

### Cas particuliers

**Ajouter un éditeur** — dans `library.json`, section `publishers` :

```json
{
  "id": "image",
  "name": "Image Comics",
  "tagline": "Fondé par des créateurs pour des créateurs",
  "gradientFrom": "#e85d04",
  "gradientTo": "#370617"
}
```

Puis dépose son logo dans `mon-app/public/<id>.png` et ajoute sa bannière dans `mon-app/app/page.tsx`.

**Le cookie ne se rafraîchit pas (pas de Chrome / souci nodriver)** — récupère-le à la main :
1. Ouvre `https://sushiscan.net/` dans Chrome (passe le check Cloudflare).
2. DevTools → Application → Cookies → copie la valeur de `cf_clearance`.
3. Console → `navigator.userAgent` → copie la chaîne.
4. Mets-les dans `mon-app/data/cf_session.json` :
   `{"cookie": "cf_clearance=...", "userAgent": "..."}`

---

## Structure du projet

```
KenzoLibrary/
├── scraper/
│   ├── sushiscan.py            # Scraper CLI → upload Supabase
│   ├── migrate_to_supabase.py  # Migration de l'ancien format
│   ├── .venv/                  # Python 3.12 + deps (gitignoré)
│   └── .env                    # Clés Supabase (service_role)
└── mon-app/
    ├── .env.local             # URL + bucket Supabase (public)
    ├── data/
    │   ├── library.json        # Source de vérité (éditeurs, persos, comics)
    │   └── cf_session.json     # Session Cloudflare (générée par le scraper)
    ├── app/
    │   ├── page.tsx            # Accueil
    │   └── [publisher]/        # Page éditeur → personnage → lecteur
    ├── components/
    │   ├── Navbar.tsx
    │   ├── CharacterCarousel.tsx
    │   └── ComicReader.tsx
    └── lib/
        └── library.ts          # Types et helpers (URLs Supabase)
```

> Les pages des comics vivent dans **Supabase Storage**, plus dans le repo.
