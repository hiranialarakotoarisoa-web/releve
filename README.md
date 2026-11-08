# Relevé

Site de revue de presse documentaire, 100 % statique, synchronisé avec les actualités mondiales.

## Comment ça marche

1. `scripts/update-news.mjs` lit des flux RSS (RFI, France 24, Le Monde, ONU Info, BBC Afrique…).
2. Il classe chaque article par région et par thème, puis écrit `data/news.json` (fil récent) et `data/archive.json` (mémoire des dossiers, 120 jours).
3. `index.html` lit ces fichiers et se recharge toutes les 10 minutes.
4. Le workflow GitHub Actions `.github/workflows/update-news.yml` relance le script toutes les 30 minutes et enregistre le résultat dans le dépôt.

Le site reste donc de simples fichiers : aucun serveur, aucune base de données.

## Mise en ligne (GitHub Pages)

1. Créez un dépôt GitHub et envoyez-y ce dossier.
2. Réglages › Pages › source : branche `main`, dossier racine.
3. Onglet Actions › « Synchroniser les actualités » › Run workflow, pour remplir les données la première fois.

Netlify et Cloudflare Pages fonctionnent aussi : branchez le même dépôt, sans commande de build.

## Tester en local

```
node scripts/update-news.mjs
npx serve .
```

Ouvrez l'adresse affichée. Un double-clic sur `index.html` ne marche pas : le navigateur bloque la lecture des fichiers JSON.

## Vérifier les flux

```
node scripts/check-feeds.mjs
```

Affiche pour chaque source : OK, ANCIEN (répond mais rien de publié depuis 7 jours) ou ÉCHEC. Pour un flux en échec, le script cherche une adresse de remplacement (balise RSS de la page d'accueil, puis `/feed`, `/rss`, `/rss.xml`) et vous dit laquelle copier dans `scripts/feeds.mjs`. Le workflow l'exécute à chaque synchronisation : un flux cassé met l'étape « Vérifier l'état des flux » en rouge dans l'onglet Actions.

Midi Madagasikara : l'adresse fournie est une hypothèse (site WordPress). Lancez la commande pour la confirmer ou la corriger.

## Personnaliser

- Sources : liste `FEEDS` dans `scripts/feeds.mjs`. Un flux qui change d'adresse est signalé « ÉCHEC » dans le journal, les autres continuent.
- Thèmes : règles `TOPIC_RULES` dans `scripts/update-news.mjs`.
- Couleurs et polices : variables en tête de `style.css`.

## Droits

Le site n'affiche que le titre, un extrait de 220 caractères au plus et le lien vers l'article. Vérifiez les conditions d'utilisation de chaque flux avant une exploitation commerciale.
