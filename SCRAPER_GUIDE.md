# Guide – Ajouter un comic à la bibliothèque

---

## 1. Scraper les URLs du comic

Depuis le dossier `scraper/` :

```bash
cd scraper

# Catalogue avec plusieurs volumes
python3 sushiscan.py https://sushiscan.net/catalogue/<slug>/ \
  --urls-only \
  --publisher <dc|marvel> \
  --character <perso> [<serie>] \
  --volumes <selection>

# Volume unique (URL directe)
python3 sushiscan.py https://sushiscan.net/<slug-du-volume>/ \
  --urls-only \
  --publisher <dc|marvel> \
  --character <perso>
```

**Exemples concrets :**

```bash
# Batman – tous les volumes d'une série
python3 sushiscan.py https://sushiscan.net/catalogue/batman-annee-un/ \
  --urls-only --publisher dc --character batman

# Spider-Man – une série en plusieurs volumes
python3 sushiscan.py https://sushiscan.net/catalogue/the-amazing-spider-man/ \
  --urls-only --publisher marvel --character spiderman amazingrun --volumes 1-5

# Volumes spécifiques seulement
python3 sushiscan.py https://sushiscan.net/catalogue/mon-manga/ \
  --urls-only --publisher dc --character monperso --volumes 1,3,5
```

**Résultat automatique :**
- Fichiers JSON créés dans `mon-app/data/pages/<publisher>/<perso>/[<serie>/]<volume>.json`
- Entrée créée dans `mon-app/data/library.json` (personnage + comics avec `TODO` à compléter)
- Cover mise à jour automatiquement

---

## 2. Compléter les métadonnées dans `library.json`

Ouvrir `mon-app/data/library.json` et renseigner les champs `TODO` pour chaque comic créé :

```json
{
  "title": "Batman – Année Un",       ← titre d'affichage (déjà pré-rempli, ajuster si besoin)
  "year": 1987,                        ← année de parution
  "order": 1,                          ← ordre de lecture (voir section 3)
  "description": "..."                 ← résumé du comic
}
```

Si le personnage est nouveau, compléter aussi :

```json
{
  "name": "Batman",                    ← nom d'affichage
  "realName": "Bruce Wayne"            ← identité secrète
}
```

---

## 3. Définir l'ordre de lecture

Le champ `order` détermine l'ordre d'affichage sur la page du personnage.  
Les comics sont triés du plus petit au plus grand.

```
order: 1  →  Emerald Twilight (1994)
order: 2  →  Geoff Johns Vol.1 (2004)
order: 3  →  Geoff Johns Vol.2 (2005)
...
```

**Pour insérer un comic entre deux existants**, il suffit de renuméroter :
- Avant : `1, 2, 3, 4`
- Après insertion entre 2 et 3 : `1, 2, 3, 4, 5` (le nouveau prend 3, les suivants décalent)

Les valeurs n'ont pas besoin d'être consécutives — `1, 5, 10, 20` fonctionne aussi.

---

## 4. Ajouter un nouveau personnage dans un éditeur existant

Le scraper crée automatiquement le personnage. Si besoin de le créer manuellement dans `library.json` :

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

L'`image` sera mise à jour automatiquement lors du premier scrape du personnage.

---

## 5. Ajouter un nouvel éditeur

Dans `library.json`, section `publishers` :

```json
{
  "id": "image",
  "name": "Image Comics",
  "tagline": "Fondé par des créateurs pour des créateurs",
  "gradientFrom": "#e85d04",
  "gradientTo": "#370617"
}
```

Puis créer la page de l'éditeur en ajoutant une bannière dans `mon-app/app/page.tsx` et en déposant son logo dans `mon-app/public/<id>.png`.

---

## 6. Rafraîchir le cookie Cloudflare (si les images ne chargent plus)

Le cookie expire après quelques jours. Pour le renouveler, relancer n'importe quel scrape :

```bash
python3 sushiscan.py <n'importe quelle url> --urls-only --publisher dc --character test
```

Le cookie est mis à jour automatiquement dans `mon-app/data/cf_session.json`.

---

## Récapitulatif rapide

| Envie | Commande |
|---|---|
| Nouveau comic (catalogue) | `--urls-only --publisher X --character Y --volumes 1-N` |
| Nouveau comic (volume direct) | `--urls-only --publisher X --character Y` |
| Volumes précis seulement | `--volumes 1,3,5` ou `--volumes 2-4` |
| Renouveler le cookie CF | Relancer n'importe quel scrape |
| Changer l'ordre de lecture | Modifier `order` dans `library.json` |
